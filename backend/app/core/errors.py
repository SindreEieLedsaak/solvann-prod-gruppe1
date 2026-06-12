import logging

from flask import Flask, jsonify

logger = logging.getLogger(__name__)


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad Request", "message": str(error)}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not Found", "message": str(error)}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "Method Not Allowed"}), 405

    @app.errorhandler(422)
    def unprocessable_entity(error):
        return jsonify({"error": "Unprocessable Entity", "message": str(error)}), 422

    @app.errorhandler(500)
    def internal_server_error(error):
        logger.error("Internal server error: %s", error, exc_info=True)
        return jsonify({"error": "Internal Server Error"}), 500
