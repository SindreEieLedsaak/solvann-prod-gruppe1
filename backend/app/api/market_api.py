from flask import Blueprint, jsonify

from ..services import mock_data_service as svc

market_bp = Blueprint("market", __name__)


@market_bp.get("/market")
def get_market():
    return jsonify(svc.get_market()), 200
