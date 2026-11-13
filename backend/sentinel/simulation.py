from __future__ import annotations

from datetime import UTC, datetime, timedelta

from .models import RequestEvent, SessionProfile, SimulationResult, SimulationStep
from .security import SecurityService


def run_compromised_session_scenario(service: SecurityService) -> SimulationResult:
    service.store.clear()
    now = datetime.now(UTC)
    attacker_session = "session-employee-8f2a"
    legitimate_session = "session-operator-11bd"

    service.register_session(
        SessionProfile(
            session_id=attacker_session,
            user_id="employee-104",
            trusted_source_ip="10.20.0.14",
            trusted_device_id="DWS-OPS-07",
        )
    )
    service.register_session(
        SessionProfile(
            session_id=legitimate_session,
            user_id="operator-221",
            trusted_source_ip="10.20.0.21",
            trusted_device_id="DWS-OPS-11",
        )
    )

    for index in range(4):
        service.evaluate(
            RequestEvent(
                timestamp=now - timedelta(seconds=20 - index * 4),
                session_id=attacker_session,
                user_id="employee-104",
                service_id="dardania-water-api",
                method="GET",
                path="/telemetry/pressure",
                source_ip="10.20.0.14",
                device_id="DWS-OPS-07",
            )
        )

    attack = service.evaluate(
        RequestEvent(
            timestamp=now,
            session_id=attacker_session,
            user_id="employee-104",
            service_id="dardania-water-api",
            method="POST",
            path="/admin/pump-schedules/override",
            source_ip="185.72.14.9",
            device_id="UNRECOGNIZED-CLIENT",
            attributes={"requested_mode": "manual"},
        )
    )
    legitimate = service.evaluate(
        RequestEvent(
            timestamp=now + timedelta(seconds=1),
            session_id=legitimate_session,
            user_id="operator-221",
            service_id="dardania-water-api",
            method="GET",
            path="/telemetry/reservoir-levels",
            source_ip="10.20.0.21",
            device_id="DWS-OPS-11",
        )
    )

    if attack.incident is None or attack.containment is None:
        raise RuntimeError("The deterministic scenario did not produce containment")

    return SimulationResult(
        scenario="compromised-employee-session",
        attacker_session_id=attacker_session,
        legitimate_session_id=legitimate_session,
        attacker_response_status=attack.response_status,
        legitimate_response_status=legitimate.response_status,
        continuity_verified=(not attack.allowed and legitimate.allowed),
        incident=attack.incident,
        containment=attack.containment,
        steps=[
            SimulationStep(sequence=1, event="Behavioral baseline", outcome="Established from four legitimate requests"),
            SimulationStep(sequence=2, event="Compromised session", outcome="Administrative mutation received from a new context"),
            SimulationStep(sequence=3, event="Risk assessment", outcome=f"Critical score {attack.assessment.risk_score if attack.assessment else 0}"),
            SimulationStep(sequence=4, event="Selective containment", outcome="Only the suspicious session was restricted"),
            SimulationStep(sequence=5, event="Continuity verification", outcome="Independent legitimate request returned 200"),
        ],
    )
