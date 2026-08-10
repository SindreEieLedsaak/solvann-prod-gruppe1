def test_get_items_returns_empty_list(client):
    response = client.get("/api/items")
    assert response.status_code == 200
    data = response.get_json()
    assert data["items"] == []
    assert data["total"] == 0


def test_create_item_returns_201(client):
    response = client.post("/api/items", json={"name": "Test Item"})
    assert response.status_code == 201


def test_create_item_returns_expected_fields(client):
    data = client.post(
        "/api/items",
        json={"name": "Widget", "description": "A useful widget"},
    ).get_json()
    assert data["name"] == "Widget"
    assert data["description"] == "A useful widget"
    assert "id" in data


def test_create_item_missing_name_returns_400(client):
    response = client.post("/api/items", json={"description": "No name"})
    assert response.status_code == 400


def test_created_item_appears_in_list(client):
    client.post("/api/items", json={"name": "First"})
    client.post("/api/items", json={"name": "Second"})
    data = client.get("/api/items").get_json()
    assert data["total"] == 2
    names = [item["name"] for item in data["items"]]
    assert "First" in names
    assert "Second" in names
