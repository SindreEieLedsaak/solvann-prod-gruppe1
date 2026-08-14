def test_report_returns_200(client):
    response = client.get("/api/plant/report")
    assert response.status_code == 200


def test_report_has_expected_sections(client):
    data = client.get("/api/plant/report").get_json()
    assert set(data.keys()) >= {
        "timestamp",
        "production",
        "economy",
        "decision_analysis",
        "environment",
    }
    assert data["production"]["total_turbines"] == 6
    assert data["decision_analysis"]["net_deviation_nok"] >= 0
