from fastapi.testclient import TestClient
import pytest
from concurrent.futures import ThreadPoolExecutor

from sentinel.main import create_app


def test_jury_attack_is_visible_to_the_operator_status_feed() -> None:
    client = TestClient(create_app(":memory:"))

    response = client.post(
        "/api/v1/jury/attacks",
        json={"scenario": "compromised-operator"},
    )

    assert response.status_code == 200
    run = response.json()
    assert run["scenario"] == "compromised-operator"
    assert run["status"] == "contained"
    assert run["affected_asset_ids"] == ["pump-station"]
    assert run["continuity_verified"] is True

    status = client.get("/api/v1/jury/status").json()
    assert status["active_run"]["run_id"] == run["run_id"]
    assert status["active_run"]["status"] == "contained"


@pytest.mark.parametrize(
    ("scenario", "asset_id"),
    [
        ("sensor-spoofing", "reservoir-b"),
        ("command-injection", "dosing-unit"),
        ("compromised-operator", "pump-station"),
    ],
)
def test_jury_can_only_run_the_three_safe_scenarios(scenario: str, asset_id: str) -> None:
    client = TestClient(create_app(":memory:"))

    response = client.post("/api/v1/jury/attacks", json={"scenario": scenario})

    assert response.status_code == 200
    run = response.json()
    assert run["scenario"] == scenario
    assert run["affected_asset_ids"] == [asset_id]
    assert run["risk_score"] >= 80
    assert run["continuity_verified"] is True


def test_jury_cannot_submit_an_arbitrary_attack_payload() -> None:
    client = TestClient(create_app(":memory:"))

    response = client.post(
        "/api/v1/jury/attacks",
        json={"scenario": "custom", "command": "stop every pump"},
    )

    assert response.status_code == 422


def test_jury_attack_button_is_rate_limited_against_double_submission() -> None:
    client = TestClient(create_app(":memory:"))
    payload = {"scenario": "sensor-spoofing"}

    assert client.post("/api/v1/jury/attacks", json=payload).status_code == 200
    repeated = client.post("/api/v1/jury/attacks", json=payload)

    assert repeated.status_code == 429
    assert repeated.json()["detail"] == "Wait before starting another attack simulation"


def test_operator_can_reset_the_shared_jury_demo() -> None:
    client = TestClient(create_app(":memory:"))
    created = client.post("/api/v1/jury/attacks", json={"scenario": "command-injection"}).json()

    response = client.post(
        "/api/v1/jury/reset",
        headers={"X-Operator-Role": "operator"},
    )

    assert response.status_code == 200
    assert response.json() == {"active_run": None}
    assert client.get("/api/v1/jury/status").json() == {"active_run": None}
    assert client.get(f"/api/v1/jury/runs/{created['run_id']}").status_code == 200


def test_retrying_the_same_request_id_returns_the_original_run() -> None:
    client = TestClient(create_app(":memory:"))
    payload = {"scenario": "sensor-spoofing", "request_id": "jury-request-retry-001"}

    first = client.post("/api/v1/jury/attacks", json=payload)
    repeated = client.post("/api/v1/jury/attacks", json=payload)

    assert first.status_code == 200
    assert repeated.status_code == 200
    assert repeated.json()["run_id"] == first.json()["run_id"]


def test_failed_simulation_is_persisted_for_phone_recovery() -> None:
    app = create_app(":memory:")
    client = TestClient(app)

    def fail() -> None:
        raise RuntimeError("synthetic engine failure")

    app.state.jury.facility.run_compromised_operator = fail
    response = client.post(
        "/api/v1/jury/attacks",
        json={"scenario": "compromised-operator", "request_id": "jury-request-failed-001"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "failed"
    recovered = client.get("/api/v1/jury/runs/jury-request-failed-001")
    assert recovered.status_code == 200
    assert recovered.json()["status"] == "failed"


def test_two_app_instances_share_the_jury_projection(tmp_path) -> None:
    database = tmp_path / "shared.db"
    attacker = TestClient(create_app(database))
    operator = TestClient(create_app(database))

    run = attacker.post(
        "/api/v1/jury/attacks",
        json={"scenario": "sensor-spoofing", "request_id": "jury-request-shared-001"},
    ).json()

    assert operator.get("/api/v1/jury/status").json()["active_run"]["run_id"] == run["run_id"]
    snapshot = operator.get("/api/v1/facility/snapshot").json()
    reservoir = next(asset for asset in snapshot["assets"] if asset["id"] == "reservoir-b")
    assert reservoir["security_status"] == "contained"


def test_concurrent_instances_atomically_accept_only_one_new_attack(tmp_path) -> None:
    database = tmp_path / "concurrent.db"
    clients = [TestClient(create_app(database)), TestClient(create_app(database))]

    def launch(index: int) -> int:
        return clients[index].post(
            "/api/v1/jury/attacks",
            json={"scenario": "command-injection", "request_id": f"jury-request-race-00{index}"},
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = sorted(pool.map(launch, range(2)))

    assert statuses == [200, 429]


def test_public_run_response_contains_only_the_presentation_contract() -> None:
    client = TestClient(create_app(":memory:"))

    run = client.post("/api/v1/jury/attacks", json={"scenario": "sensor-spoofing"}).json()

    assert set(run) == {
        "run_id", "scenario", "status", "created_at", "completed_at", "affected_asset_ids",
        "risk_score", "continuity_verified", "defense_actions", "steps",
    }

