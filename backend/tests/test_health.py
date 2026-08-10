def test_health_returns_200(client):
    response = client.get("/api/health")
    assert response.status_code == 200


def test_health_returns_healthy_status(client):
    data = client.get("/api/health").get_json()
    assert data["status"] == "healthy"
