from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health_check():
    """
    Health check endpoint.
    Used by load balancers, orchestrators, and monitoring tools.
    """
    return jsonify({"status": "healthy"}), 200
