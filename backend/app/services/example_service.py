import uuid
from typing import Any

# Module-level in-memory store.
# Replace with a database repository (e.g. SQLAlchemy) when you add persistence.
_items: list[dict[str, Any]] = []


class ExampleService:
    def get_all_items(self) -> list[dict[str, Any]]:
        return list(_items)

    def create_item(self, name: str, description: str = "") -> dict[str, Any]:
        item: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "name": name,
            "description": description,
        }
        _items.append(item)
        return item
