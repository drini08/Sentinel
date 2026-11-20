from fastapi.testclient import TestClient

from sentinel.main import create_app


def find_asset(snapshot: dict, asset_id: str) -> dict:
    return next(asset for asset in snapshot["assets"] if asset["id"] == asset_id)


def test_demo_blocks_attack_marks_security_state_and_preserves_legitimate_control() -> None:
    client = TestClient(create_app(":memory:"))

    scenario = client.post(
        "/api/v1/facility/scenarios/compromised-operator",
        headers={"X-Operator-Role": "operator"},
    ).json()
    after_attack = client.get("/api/v1/facility/snapshot").json()
    legitimate = client.post(
        "/api/v1/facility/assets/reservoir-b/commands",
        json={
            "command": {"action": "set_target", "value": 67},
            "session": {
                "session_id": "session-operator-11bd",
                "user_id": "operator-221",
                "source_ip": "10.20.0.21",
                "device_id": "DWS-OPS-11",
            },
        },
    ).json()

    pump = find_asset(after_attack, "pump-station")
    assert scenario["attack"]["applied"] is False
    assert pump["status"] == "operational"
    assert pump["security_status"] == "contained"
    assert legitimate["applied"] is True
    assert legitimate["asset"]["metrics"]["target_level_percent"] == 67
    assert len(client.get("/api/v1/incidents").json()) == 1
