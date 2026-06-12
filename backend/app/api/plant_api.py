from flask import Blueprint, jsonify

from ..services import mock_data_service as svc

plant_bp = Blueprint("plant", __name__)


@plant_bp.get("/plant/overview")
def overview():
    """Single endpoint that returns all dashboard data in one call."""
    return jsonify(svc.get_overview()), 200
