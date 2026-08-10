from flask import Blueprint, jsonify, request

from ..services import history_service, mock_data_service as svc

turbines_bp = Blueprint("turbines", __name__)


@turbines_bp.get("/turbines")
def get_turbines():
    return jsonify({"turbines": svc.get_turbines()}), 200


@turbines_bp.get("/turbines/<turbine_id>")
def get_turbine(turbine_id: str):
    turbine = svc.get_turbine(turbine_id)
    if turbine is None:
        return jsonify({"error": "Not Found", "message": f"Turbine '{turbine_id}' not found"}), 404
    return jsonify(turbine), 200


@turbines_bp.get("/turbines/<turbine_id>/history")
def get_turbine_history(turbine_id: str):
    if svc.get_turbine(turbine_id) is None:
        return jsonify({"error": "Not Found", "message": f"Turbine '{turbine_id}' not found"}), 404
    try:
        hours = int(request.args.get("hours", 24))
    except ValueError:
        hours = 24
    hours = max(1, min(hours, 24 * 30))  # clamp to [1, 720] hours
    return jsonify(history_service.get_turbine_history(turbine_id, hours)), 200


@turbines_bp.patch("/turbines/<turbine_id>")
def control_turbine(turbine_id: str):
    body = request.get_json(silent=True) or {}
    try:
        turbine = svc.set_turbine_control(
            turbine_id, status=body.get("status"), load_pct=body.get("load_pct")
        )
    except svc.TurbineControlError as exc:
        return jsonify({"error": "Bad Request", "message": str(exc)}), 400
    if turbine is None:
        return jsonify({"error": "Not Found", "message": f"Turbine '{turbine_id}' not found"}), 404
    return jsonify(turbine), 200
