import pytest

from app import create_app
import app.services.example_service as example_svc


@pytest.fixture
def app():
    test_app = create_app(config_override={"TESTING": True, "DEBUG": False})
    yield test_app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def reset_item_store():
    """Isolate tests by clearing the in-memory item store before each test."""
    example_svc._items.clear()
    yield
    example_svc._items.clear()
