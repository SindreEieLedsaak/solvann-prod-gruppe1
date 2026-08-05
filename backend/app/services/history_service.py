"""
History service — persists periodic plant snapshots to Postgres so the
frontend can show aggregated/historical income and production, rather than
only the instantaneous values from mock_data_service.
"""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg2
import psycopg2.pool
from psycopg2.extras import RealDictCursor

from ..core.config import settings

# Matches the scheduler interval in app/__init__.py — used to turn the stored
# instantaneous NOK/h and MW rates into accumulated totals over a period.
SAMPLE_INTERVAL_H = 60 / 3600.0

_pool: psycopg2.pool.SimpleConnectionPool | None = None


def _get_pool() -> psycopg2.pool.SimpleConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.SimpleConnectionPool(1, 5, settings.DATABASE_URL)
    return _pool


@contextmanager
def _connection():
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def init_db() -> None:
    """Create/upgrade the history tables. Safe to call repeatedly."""
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS plant_snapshots (
                    id BIGSERIAL PRIMARY KEY,
                    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    total_production_mw DOUBLE PRECISION NOT NULL,
                    revenue_nok_h DOUBLE PRECISION NOT NULL,
                    environmental_cost_nok_h DOUBLE PRECISION NOT NULL,
                    price_nok_mwh DOUBLE PRECISION NOT NULL,
                    reservoir_level_pct DOUBLE PRECISION NOT NULL
                );
                """
            )
            # Added after the initial release — ALTER instead of relying on
            # CREATE TABLE IF NOT EXISTS so existing databases pick them up too.
            cur.execute("ALTER TABLE plant_snapshots ADD COLUMN IF NOT EXISTS inflow_m3s DOUBLE PRECISION;")
            cur.execute("ALTER TABLE plant_snapshots ADD COLUMN IF NOT EXISTS outflow_m3s DOUBLE PRECISION;")
            cur.execute(
                "ALTER TABLE plant_snapshots ADD COLUMN IF NOT EXISTS solar_production_kw DOUBLE PRECISION;"
            )
            cur.execute("ALTER TABLE plant_snapshots ADD COLUMN IF NOT EXISTS active_turbines INTEGER;")
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_plant_snapshots_recorded_at "
                "ON plant_snapshots (recorded_at);"
            )

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS turbine_snapshots (
                    id BIGSERIAL PRIMARY KEY,
                    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    turbine_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    load_pct DOUBLE PRECISION NOT NULL,
                    production_mw DOUBLE PRECISION NOT NULL
                );
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_turbine_snapshots_turbine_time "
                "ON turbine_snapshots (turbine_id, recorded_at);"
            )


def clear_history() -> None:
    """Delete all rows from the history tables — used before re-seeding demo
    data so repeated runs don't pile up duplicate/overlapping samples."""
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE plant_snapshots, turbine_snapshots;")


def seed_snapshots(plant_rows: list[dict[str, Any]], turbine_rows: list[dict[str, Any]]) -> tuple[int, int]:
    """Bulk-insert backdated rows (explicit `recorded_at`) — used by the demo
    seed script to backfill history, unlike `record_snapshot` which always
    stamps `now()` for the live collector."""
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO plant_snapshots
                    (recorded_at, total_production_mw, revenue_nok_h, environmental_cost_nok_h,
                     price_nok_mwh, reservoir_level_pct, inflow_m3s, outflow_m3s,
                     solar_production_kw, active_turbines)
                VALUES (%(recorded_at)s, %(total_production_mw)s, %(revenue_nok_h)s,
                        %(environmental_cost_nok_h)s, %(price_nok_mwh)s, %(reservoir_level_pct)s,
                        %(inflow_m3s)s, %(outflow_m3s)s, %(solar_production_kw)s, %(active_turbines)s)
                """,
                plant_rows,
            )
            cur.executemany(
                """
                INSERT INTO turbine_snapshots (recorded_at, turbine_id, status, load_pct, production_mw)
                VALUES (%(recorded_at)s, %(turbine_id)s, %(status)s, %(load_pct)s, %(production_mw)s)
                """,
                turbine_rows,
            )
    return len(plant_rows), len(turbine_rows)


def record_snapshot(overview: dict[str, Any]) -> None:
    """Insert one sample row (plus one per turbine) derived from a
    /plant/overview-shaped payload."""
    ps = overview["plant_status"]
    reservoir = overview["reservoir"]
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO plant_snapshots
                    (total_production_mw, revenue_nok_h, environmental_cost_nok_h,
                     price_nok_mwh, reservoir_level_pct, inflow_m3s, outflow_m3s,
                     solar_production_kw, active_turbines)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    ps["total_production_mw"],
                    ps["revenue_nok_h"],
                    ps["environmental_cost_nok_h"],
                    overview["market"]["price_nok_mwh"],
                    ps["reservoir_level_pct"],
                    reservoir["inflow_m3s"],
                    reservoir["outflow_m3s"],
                    overview["solar"]["production_kw"],
                    ps["active_turbines"],
                ),
            )
            cur.executemany(
                """
                INSERT INTO turbine_snapshots (turbine_id, status, load_pct, production_mw)
                VALUES (%s, %s, %s, %s)
                """,
                [
                    (t["id"], t["status"], t["load_pct"], t["production_mw"])
                    for t in overview["turbines"]
                ],
            )


def get_history(hours: int) -> dict[str, Any]:
    """Raw samples plus accumulated totals for the last `hours` hours.

    Accumulated revenue/cost/energy approximate the time-integral of the
    instantaneous NOK/h and MW rates by multiplying each sample by the
    sampling interval (trapezoidal-ish approximation, good enough at a 60s
    sampling resolution).
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    with _connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT recorded_at, total_production_mw, revenue_nok_h,
                       environmental_cost_nok_h, price_nok_mwh, reservoir_level_pct,
                       inflow_m3s, outflow_m3s, solar_production_kw, active_turbines
                FROM plant_snapshots
                WHERE recorded_at >= %s
                ORDER BY recorded_at ASC
                """,
                (since,),
            )
            rows = cur.fetchall()

    points = [
        {
            "timestamp": row["recorded_at"].isoformat(),
            "total_production_mw": row["total_production_mw"],
            "revenue_nok_h": row["revenue_nok_h"],
            "environmental_cost_nok_h": row["environmental_cost_nok_h"],
            "price_nok_mwh": row["price_nok_mwh"],
            "reservoir_level_pct": row["reservoir_level_pct"],
            "inflow_m3s": row["inflow_m3s"],
            "outflow_m3s": row["outflow_m3s"],
            "solar_production_kw": row["solar_production_kw"],
            "active_turbines": row["active_turbines"],
        }
        for row in rows
    ]

    total_energy_mwh = sum(p["total_production_mw"] * SAMPLE_INTERVAL_H for p in points)
    total_revenue_nok = sum(p["revenue_nok_h"] * SAMPLE_INTERVAL_H for p in points)
    total_environmental_cost_nok = sum(
        p["environmental_cost_nok_h"] * SAMPLE_INTERVAL_H for p in points
    )

    return {
        "hours": hours,
        "sample_count": len(points),
        "points": points,
        "summary": {
            "total_energy_mwh": round(total_energy_mwh, 2),
            "total_revenue_nok": round(total_revenue_nok, 0),
            "total_environmental_cost_nok": round(total_environmental_cost_nok, 0),
        },
    }


def get_hourly_history(hours: int) -> dict[str, Any]:
    """Per-calendar-hour aggregates for the last `hours` hours — one row per
    hour with average production, accumulated energy/revenue/cost, and the
    raw `sample_count` for that hour (60 samples = a full hour of coverage;
    fewer means the collector was down for part of it, e.g. the app was
    stopped). Meant to be easy to read off and log manually, or exported."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    with _connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    date_trunc('hour', recorded_at) AS hour,
                    avg(total_production_mw) AS avg_production_mw,
                    sum(total_production_mw) * %(interval_h)s AS energy_mwh,
                    sum(revenue_nok_h) * %(interval_h)s AS revenue_nok,
                    sum(environmental_cost_nok_h) * %(interval_h)s AS environmental_cost_nok,
                    avg(price_nok_mwh) AS avg_price_nok_mwh,
                    avg(reservoir_level_pct) AS avg_reservoir_level_pct,
                    count(*) AS sample_count
                FROM plant_snapshots
                WHERE recorded_at >= %(since)s
                GROUP BY hour
                ORDER BY hour ASC
                """,
                {"interval_h": SAMPLE_INTERVAL_H, "since": since},
            )
            rows = cur.fetchall()

    points = [
        {
            "hour": row["hour"].isoformat(),
            "avg_production_mw": round(row["avg_production_mw"], 2),
            "energy_mwh": round(row["energy_mwh"], 2),
            "revenue_nok": round(row["revenue_nok"], 0),
            "environmental_cost_nok": round(row["environmental_cost_nok"], 0),
            "avg_price_nok_mwh": round(row["avg_price_nok_mwh"], 2),
            "avg_reservoir_level_pct": round(row["avg_reservoir_level_pct"], 2),
            "sample_count": row["sample_count"],
        }
        for row in rows
    ]

    return {"hours": hours, "hour_count": len(points), "points": points}


def get_turbine_history(turbine_id: str, hours: int) -> dict[str, Any]:
    """Per-turbine samples for the last `hours` hours — status/load/production
    over time, e.g. to chart how often a turbine ran and at what load."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    with _connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT recorded_at, status, load_pct, production_mw
                FROM turbine_snapshots
                WHERE turbine_id = %s AND recorded_at >= %s
                ORDER BY recorded_at ASC
                """,
                (turbine_id, since),
            )
            rows = cur.fetchall()

    points = [
        {
            "timestamp": row["recorded_at"].isoformat(),
            "status": row["status"],
            "load_pct": row["load_pct"],
            "production_mw": row["production_mw"],
        }
        for row in rows
    ]

    total_energy_mwh = sum(p["production_mw"] * SAMPLE_INTERVAL_H for p in points)
    running_samples = sum(1 for p in points if p["status"] == "RUNNING")
    uptime_pct = round(100.0 * running_samples / len(points), 1) if points else 0.0

    return {
        "turbine_id": turbine_id,
        "hours": hours,
        "sample_count": len(points),
        "points": points,
        "summary": {
            "total_energy_mwh": round(total_energy_mwh, 2),
            "uptime_pct": uptime_pct,
        },
    }
