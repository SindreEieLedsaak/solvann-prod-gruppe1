from flask import Blueprint, jsonify

from ..services import mock_data_service as svc

reservoir_bp = Blueprint("reservoir", __name__)


@reservoir_bp.get("/reservoir")
def get_reservoir():
    return jsonify(svc.get_reservoir()), 200
