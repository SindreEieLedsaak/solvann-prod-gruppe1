import csv
import io

from flask import Blueprint, Response, jsonify, request

from ..services import history_service as svc

history_bp = Blueprint("history", __name__)


def _clamped_hours() -> int:
    try:
        hours = int(request.args.get("hours", 24))
    except ValueError:
        hours = 24
    return max(1, min(hours, 24 * 30))  # clamp to [1, 720] hours


@history_bp.get("/plant/history")
def get_history():
    """Aggregated/historical plant data, sampled every 60s by the history collector."""
    return jsonify(svc.get_history(_clamped_hours())), 200


@history_bp.get("/plant/history/hourly")
def get_hourly_history():
    """Per-hour aggregates — one row per calendar hour, meant to be easy to
    read off and log manually (e.g. into a spreadsheet)."""
    return jsonify(svc.get_hourly_history(_clamped_hours())), 200


@history_bp.get("/plant/history/export")
def export_history():
    """CSV download of the history data for spreadsheet tools like Excel.
    `resolution=hourly` (default) exports one row per hour; `resolution=raw`
    exports every raw ~60s sample instead."""
    hours = _clamped_hours()
    resolution = request.args.get("resolution", "hourly")

    if resolution == "raw":
        fieldnames = [
            "timestamp", "total_production_mw", "revenue_nok_h",
            "environmental_cost_nok_h", "price_nok_mwh", "reservoir_level_pct",
            "inflow_m3s", "outflow_m3s", "solar_production_kw", "active_turbines",
        ]
        rows = svc.get_history(hours)["points"]
    else:
        resolution = "hourly"
        fieldnames = [
            "hour", "avg_production_mw", "energy_mwh", "revenue_nok",
            "environmental_cost_nok", "avg_price_nok_mwh", "avg_reservoir_level_pct",
            "sample_count",
        ]
        rows = svc.get_hourly_history(hours)["points"]

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="solvann_history_{resolution}_{hours}h.csv"'
        },
    )
