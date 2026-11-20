from pathlib import Path

import yaml

from sentinel.main import create_app
from sentinel.models import RequestEvent
from sentinel.security import SecurityService
from sentinel.simulation import run_compromised_session_scenario
from sentinel.store import EvidenceStore


def build_security_service() -> SecurityService:
    return SecurityService(EvidenceStore(":memory:"))


def test_compromised_session_is_contained_and_legitimate_service_continues() -> None:
    service = build_security_service()

    result = run_compromised_session_scenario(service)

    assert result.attacker_response_status == 403
    assert result.legitimate_response_status == 200
    assert result.continuity_verified is True
    assert result.incident.status == "contained"
    assert result.containment.action == "restrict_session"
    assert result.incident.risk.risk_score == 94
    assert {signal.code for signal in result.incident.risk.signals} == {
        "PRIVILEGED_MUTATION",
        "UNRECOGNIZED_NETWORK",
        "UNRECOGNIZED_DEVICE",
        "REQUEST_VELOCITY",
    }
    assert len(service.store.list_incidents()) == 1


def test_contained_session_remains_blocked() -> None:
    service = build_security_service()
    simulation = run_compromised_session_scenario(service)

    follow_up = service.evaluate(
        RequestEvent(
            session_id=simulation.attacker_session_id,
            user_id="employee-104",
            service_id="dardania-water-api",
            method="POST",
            path="/admin/pump-schedules/override",
            source_ip="185.72.14.9",
            device_id="UNRECOGNIZED-CLIENT",
        )
    )

    assert follow_up.allowed is False
    assert follow_up.response_status == 403
    assert "restricted" in follow_up.reason


def test_fastapi_exposes_the_shared_contract() -> None:
    contract = create_app(":memory:").openapi()

    assert contract["info"]["title"] == "SENTINEL Security Core"
    assert "/api/v1/gateway/evaluate" in contract["paths"]
    assert "/api/v1/simulations/compromised-session" in contract["paths"]


def test_checked_in_contract_covers_every_runtime_path() -> None:
    contract_path = Path(__file__).parents[2] / "contracts" / "sentinel-api.yaml"
    checked_in = yaml.safe_load(contract_path.read_text(encoding="utf-8"))
    runtime = create_app(":memory:").openapi()

    assert set(checked_in["paths"]) == set(runtime["paths"])
