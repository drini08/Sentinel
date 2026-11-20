from datetime import timedelta

from fastapi.testclient import TestClient

from sentinel.main import create_app
from sentinel.models import RequestEvent


def test_scoped_firewall_rule_is_enforced_for_matching_ip_only() -> None:
    from sentinel.defense import DefenseService
    from sentinel.models import RuleCreate
    from sentinel.security import SecurityService
    from sentinel.store import EvidenceStore

    store = EvidenceStore(":memory:")
    defense = DefenseService(store)
    security = SecurityService(store, defense=defense)
    defense.create_rule(RuleCreate(
        target_type="ip",
        target_value="203.0.113.44",
        justification="Known malicious simulation source.",
    ))

    blocked = security.evaluate(RequestEvent(
        session_id="session-attacker", user_id="attacker", service_id="dardania-water-api",
        method="GET", path="/telemetry/pressure", source_ip="203.0.113.44", device_id="unknown",
    ))
    allowed = security.evaluate(RequestEvent(
        session_id="session-legitimate", user_id="operator", service_id="dardania-water-api",
        method="GET", path="/telemetry/pressure", source_ip="10.20.0.21", device_id="DWS-OPS-11",
    ))

    assert blocked.allowed is False
    assert allowed.allowed is True


def test_overrestrictive_rule_is_rolled_back_and_audited() -> None:
    from sentinel.defense import DefenseService
    from sentinel.models import RuleCreate
    from sentinel.store import EvidenceStore

    store = EvidenceStore(":memory:")
    defense = DefenseService(store)

    rule = defense.create_rule(RuleCreate(
        target_type="endpoint",
        target_value="/telemetry/pressure",
        justification="Continuity rollback acceptance test.",
        simulate_continuity_failure=True,
    ))

    assert rule.status == "rolled_back"
    assert store.list_health_checks()[0].transaction_succeeded is False
    assert any(item.action == "firewall_rule_rolled_back" for item in store.list_audit())


def test_expired_rule_is_not_enforced() -> None:
    from sentinel.defense import DefenseService
    from sentinel.models import RuleCreate, utc_now
    from sentinel.store import EvidenceStore

    store = EvidenceStore(":memory:")
    defense = DefenseService(store)
    rule = defense.create_rule(RuleCreate(
        target_type="ip", target_value="203.0.113.9", justification="Temporary test restriction.",
    ))
    expired = rule.model_copy(update={"expires_at": utc_now() - timedelta(seconds=1)})
    store.save_firewall_rule(expired)

    assert defense.matching_rule(RequestEvent(
        session_id="session-new", user_id="user", service_id="dardania-water-api", method="GET",
        path="/telemetry/pressure", source_ip="203.0.113.9", device_id="device",
    )) is None
    assert store.get_firewall_rule(rule.rule_id).status == "expired"  # type: ignore[union-attr]


def test_unsafe_global_rule_is_rejected() -> None:
    from sentinel.defense import DefenseService, UnsafeRule
    from sentinel.models import RuleCreate
    from sentinel.store import EvidenceStore

    defense = DefenseService(EvidenceStore(":memory:"))
    try:
        defense.create_rule(RuleCreate(
            target_type="ip", target_value="0.0.0.0/0", justification="Invalid global restriction.",
        ))
    except UnsafeRule as error:
        assert "prohibited" in str(error)
    else:
        raise AssertionError("global firewall rule should be rejected")


def test_operator_can_revoke_and_restore_session_with_rbac() -> None:
    from sentinel.models import SessionProfile

    app = TestClient(create_app(":memory:"))
    app.app.state.store.save_session(SessionProfile(
        session_id="session-control", user_id="operator", trusted_source_ip="10.0.0.4", trusted_device_id="ops-4",
    ))

    denied = app.post("/api/v1/sessions/session-control/revoke", json={"reason": "Confirmed compromised credentials."})
    revoked = app.post(
        "/api/v1/sessions/session-control/revoke",
        json={"reason": "Confirmed compromised credentials."},
        headers={"X-Operator-Role": "operator"},
    )
    restored = app.post(
        "/api/v1/sessions/session-control/restore",
        json={"reason": "Credential reset and operator verified."},
        headers={"X-Operator-Role": "admin"},
    )

    assert denied.status_code == 403
    assert revoked.json()["status"] == "revoked"
    assert restored.json()["status"] == "active"


def test_ingestion_requires_the_simulation_token() -> None:
    app = TestClient(create_app(":memory:"))
    payload = RequestEvent(
        session_id="session-ingest", user_id="operator", service_id="dardania-water-api",
        method="GET", path="/telemetry/pressure", source_ip="10.20.0.21", device_id="DWS-OPS-11",
    ).model_dump(mode="json")

    denied = app.post("/api/v1/events/ingest", json=payload)
    allowed = app.post(
        "/api/v1/events/ingest",
        json=payload,
        headers={"X-Sentinel-Ingestion-Token": "sentinel-sim-ingest"},
    )

    assert denied.status_code == 401
    assert allowed.status_code == 200


def test_policy_thresholds_must_remain_ordered() -> None:
    app = TestClient(create_app(":memory:"))
    policy = app.get("/api/v1/policies").json()[0]

    response = app.patch(
        f"/api/v1/policies/{policy['policy_id']}",
        json={"moderate_threshold": 90, "high_threshold": 70},
        headers={"X-Operator-Role": "operator"},
    )

    assert response.status_code == 422
    assert "ordered" in response.json()["detail"]


def test_facility_control_plane_cannot_be_blocked() -> None:
    app = TestClient(create_app(":memory:"))

    response = app.post(
        "/api/v1/firewall/rules",
        json={
            "target_type": "endpoint",
            "target_value": "/api/v1/facility/snapshot",
            "action": "block",
            "justification": "This unsafe rule must be rejected.",
            "duration_seconds": 900,
        },
        headers={"X-Operator-Role": "operator"},
    )

    assert response.status_code == 422
    assert "cannot be blocked" in response.json()["detail"]
