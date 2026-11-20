from fastapi.testclient import TestClient

from sentinel.main import create_app


LEGITIMATE_SESSION = {
    "session_id": "session-operator-11bd",
    "user_id": "operator-221",
    "source_ip": "10.20.0.21",
    "device_id": "DWS-OPS-11",
}


def find_asset(snapshot: dict, asset_id: str) -> dict:
    return next(asset for asset in snapshot["assets"] if asset["id"] == asset_id)


def command(client: TestClient, asset_id: str, action: str, value: object = None) -> dict:
    response = client.post(
        f"/api/v1/facility/assets/{asset_id}/commands",
        json={"command": {"action": action, "value": value}, "session": LEGITIMATE_SESSION},
    )
    assert response.status_code == 200
    return response.json()


def test_snapshot_exposes_the_complete_facility() -> None:
    client = TestClient(create_app(":memory:"))

    response = client.get("/api/v1/facility/snapshot")

    assert response.status_code == 200
    assert len(response.json()["assets"]) == 13
    assert len(response.json()["connections"]) == 13


def test_legitimate_operator_command_changes_authoritative_state() -> None:
    client = TestClient(create_app(":memory:"))

    result = command(client, "pump-station", "stop")
    snapshot = client.get("/api/v1/facility/snapshot").json()

    assert result["applied"] is True
    assert result["asset"]["status"] == "stopped"
    assert find_asset(snapshot, "pump-station")["metrics"]["active_pumps"] == 0


def test_invalid_asset_command_returns_a_typed_client_error() -> None:
    client = TestClient(create_app(":memory:"))

    response = client.post(
        "/api/v1/facility/assets/control-center/commands",
        json={"command": {"action": "open"}, "session": LEGITIMATE_SESSION},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "control-center does not support open"


def test_compromised_command_is_blocked_without_mutating_facility() -> None:
    client = TestClient(create_app(":memory:"))
    before = client.get("/api/v1/facility/snapshot").json()

    response = client.post(
        "/api/v1/facility/scenarios/compromised-operator",
        headers={"X-Operator-Role": "operator"},
    )
    after = client.get("/api/v1/facility/snapshot").json()

    assert response.status_code == 200
    result = response.json()
    assert result["attack"]["applied"] is False
    assert result["attack"]["decision"]["response_status"] == 403
    assert result["continuity_verified"] is True
    assert result["attack"]["decision"]["assessment"]["risk_score"] == 94
    assert find_asset(before, "pump-station")["status"] == find_asset(after, "pump-station")["status"]
    assert len(client.get("/api/v1/incidents").json()) == 1


def test_reset_restores_facility_baseline() -> None:
    client = TestClient(create_app(":memory:"))
    command(client, "reservoir-a", "isolate", True)

    response = client.post("/api/v1/facility/reset", headers={"X-Operator-Role": "operator"})
    reservoir = find_asset(response.json(), "reservoir-a")

    assert response.status_code == 200
    assert reservoir["status"] == "operational"
    assert reservoir["metrics"]["outflow_m3s"] == 2.1
