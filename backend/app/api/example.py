"""
Example feature — demonstrates how to structure a new API resource.

To add a new resource:
  1. Create a new file in app/api/ (e.g. app/api/products.py)
  2. Define a Blueprint and register it in app/__init__.py
  3. Add corresponding service logic in app/services/
  4. Add types/models to app/models/ when you introduce a database
"""
import logging

from flask import Blueprint, jsonify, request

from ..services.example_service import ExampleService

logger = logging.getLogger(__name__)

example_bp = Blueprint("example", __name__)
_service = ExampleService()


@example_bp.get("/items")
def get_items():
    items = _service.get_all_items()
    return jsonify({"items": items, "total": len(items)}), 200


@example_bp.post("/items")
def create_item():
    data = request.get_json(silent=True)
    if not data or "name" not in data:
        return jsonify({"error": "Field 'name' is required"}), 400

    item = _service.create_item(
        name=data["name"],
        description=data.get("description", ""),
    )
    logger.info("Created item id=%s name=%s", item["id"], item["name"])
    return jsonify(item), 201
