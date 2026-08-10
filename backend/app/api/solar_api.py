from flask import Blueprint, jsonify

from ..services import mock_data_service as svc

solar_bp = Blueprint("solar", __name__)


@solar_bp.get("/solar")
def get_solar():
    return jsonify(svc.get_solar()), 200
