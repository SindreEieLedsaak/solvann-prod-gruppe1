from flask import Blueprint, jsonify

from ..services import mock_data_service as svc

turbines_bp = Blueprint("turbines", __name__)


@turbines_bp.get("/turbines")
def get_turbines():
    return jsonify({"turbines": svc.get_turbines()}), 200
