"""
Backfill the Postgres history tables with a plausible day of synthetic data.

The live app only starts recording from the moment it boots, so a fresh
database's Historikk chart has just one datapoint. This script generates a
full day of samples at a regular interval (default: every 5 minutes, 24h)
so you can immediately see a realistic 24h history — e.g. to simulate an
operator logging in and reading off the last day's numbers.

Usage (from backend/, with the venv active and DATABASE_URL pointing at the
dev database — e.g. after `docker compose up db -d`):

    python scripts/seed_history.py
    python scripts/seed_history.py --hours 48 --interval-minutes 10
    python scripts/seed_history.py --clear   # wipe existing rows first
"""

from __future__ import annotations

import argparse
import math
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services import history_service  # noqa: E402
from app.services.mock_data_service import (  # noqa: E402
    RESERVOIR_HEAD_DERATE_FLOOR,
    RESERVOIR_LOW_LEVEL_WARNING_PCT,
    TURBINE_DEFS,
    TURBINE_MAX_LOAD_PCT,
    TURBINE_MIN_LOAD_PCT,
)

PANEL_COUNT = 10_000
PANEL_PEAK_KW = 0.40
ENV_RATE_NOK_PER_M3S = 90.0
MIN_ECOLOGICAL_FLOW_M3S = 15.0


def _solar_factor(hour: float) -> float:
    if 6.0 <= hour <= 20.0:
        return max(0.0, math.sin(math.pi * (hour - 6.0) / 14.0))
    return 0.0


def _price_base(hour: int) -> float:
    if 7 <= hour <= 9:
        return 560.0
    if 17 <= hour <= 19:
        return 500.0
    if hour >= 22 or hour <= 5:
        return 150.0
    return 350.0


def _head_derate(level_pct: float) -> float:
    if level_pct >= RESERVOIR_LOW_LEVEL_WARNING_PCT:
        return 1.0
    frac = max(0.0, level_pct) / RESERVOIR_LOW_LEVEL_WARNING_PCT
    return RESERVOIR_HEAD_DERATE_FLOOR + (1.0 - RESERVOIR_HEAD_DERATE_FLOOR) * frac


def generate(
    hours: int, interval_minutes: int, rng: random.Random
) -> tuple[list[dict], list[dict]]:
    now = datetime.now(timezone.utc)
    n_points = int(hours * 60 / interval_minutes)
    plant_rows: list[dict] = []
    turbine_rows: list[dict] = []

    for i in range(n_points, -1, -1):
        ts = now - timedelta(minutes=i * interval_minutes)
        local_hour = ts.astimezone().hour + ts.astimezone().minute / 60.0

        # Reservoir drifts across the day around a baseline, dipping overnight.
        level_pct = 55.0 + 12.0 * math.sin(2 * math.pi * (local_hour - 9) / 24.0)
        level_pct += rng.uniform(-2.0, 2.0)
        level_pct = max(20.0, min(85.0, level_pct))
        derate = _head_derate(level_pct)

        turbines = []
        for defn in TURBINE_DEFS:
            roll = rng.random()
            if defn["id"] == "T-06" and roll < 0.6:
                status = "MAINTENANCE"
            elif roll < 0.08:
                status = "STANDBY"
            else:
                status = "RUNNING"

            if status == "RUNNING":
                load_pct = round(rng.uniform(TURBINE_MIN_LOAD_PCT, TURBINE_MAX_LOAD_PCT), 1)
                production_mw = round(
                    defn["capacity_mw"] * (load_pct / 100.0) * derate * rng.uniform(0.97, 1.03), 2
                )
            else:
                load_pct = TURBINE_MIN_LOAD_PCT
                production_mw = 0.0

            turbines.append(
                {"id": defn["id"], "capacity_mw": defn["capacity_mw"], "status": status,
                 "load_pct": load_pct, "production_mw": production_mw}
            )
            turbine_rows.append(
                {
                    "recorded_at": ts,
                    "turbine_id": defn["id"],
                    "status": status,
                    "load_pct": load_pct,
                    "production_mw": production_mw,
                }
            )

        active_turbines = sum(1 for t in turbines if t["status"] == "RUNNING")
        water_mw = sum(t["production_mw"] for t in turbines)

        solar_kw = round(
            PANEL_COUNT * PANEL_PEAK_KW * _solar_factor(local_hour) * rng.uniform(0.9, 1.0), 1
        )
        total_mw = water_mw + solar_kw / 1000.0

        price = max(0.0, round(_price_base(int(local_hour)) + rng.uniform(-30.0, 30.0), 2))

        inflow = max(0.0, round(32.0 + rng.uniform(-6.0, 10.0), 2))
        outflow = round(
            sum(
                t["capacity_mw"] * 0.78 * (t["load_pct"] / 100.0)
                for t in turbines
                if t["status"] == "RUNNING"
            ),
            2,
        )

        excess_outflow = max(0.0, outflow - MIN_ECOLOGICAL_FLOW_M3S)
        environmental_cost = round(excess_outflow * ENV_RATE_NOK_PER_M3S, 0)
        revenue = round(total_mw * price, 0)

        plant_rows.append(
            {
                "recorded_at": ts,
                "total_production_mw": round(total_mw, 2),
                "revenue_nok_h": revenue,
                "environmental_cost_nok_h": environmental_cost,
                "price_nok_mwh": price,
                "reservoir_level_pct": round(level_pct, 2),
                "inflow_m3s": inflow,
                "outflow_m3s": outflow,
                "solar_production_kw": solar_kw,
                "active_turbines": active_turbines,
            }
        )

    return plant_rows, turbine_rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hours", type=int, default=24, help="How many hours of history to generate")
    parser.add_argument("--interval-minutes", type=int, default=5, help="Sample spacing in minutes")
    parser.add_argument("--seed", type=int, default=42, help="Random seed, for reproducible runs")
    parser.add_argument("--clear", action="store_true", help="Wipe existing history rows first")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    plant_rows, turbine_rows = generate(args.hours, args.interval_minutes, rng)

    history_service.init_db()
    if args.clear:
        history_service.clear_history()
        print("Cleared existing history rows.")

    n_plant, n_turbine = history_service.seed_snapshots(plant_rows, turbine_rows)
    print(
        f"Inserted {n_plant} plant_snapshots and {n_turbine} turbine_snapshots rows "
        f"covering the last {args.hours}h (every {args.interval_minutes}min)."
    )


if __name__ == "__main__":
    main()
