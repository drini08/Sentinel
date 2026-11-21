from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from ..models import RequestEvent, SessionProfile, SimulationStep
from ..security import SecurityService
from .engine import FacilityEngine
from .models import (
    AssetCommand,
    FacilityCommandRequest,
    FacilityCommandResult,
    FacilityScenarioResult,
    OperatorSession,
)


class FacilityService:
    def __init__(self, engine: FacilityEngine, security: SecurityService) -> None:
        self.engine = engine
        self.security = security

    def execute(self, asset_id: str, request: FacilityCommandRequest) -> FacilityCommandResult:
        decision = self.security.evaluate(self._to_request_event(asset_id, request))
        if decision.allowed:
            asset = self.engine.apply(asset_id, request.command)
        else:
            asset = self.engine.set_security_status(asset_id, "contained" if decision.containment else "blocked")
        return FacilityCommandResult(applied=decision.allowed, asset=asset, decision=decision)

    def run_compromised_operator(self) -> FacilityScenarioResult:
        self.engine.reset()
        now = datetime.now(UTC)
        scenario_id = uuid4().hex[:8]
        attacker_ip = f"2001:db8::{scenario_id[:4]}:{scenario_id[4:]}"
        attacker = OperatorSession(
            session_id=f"session-employee-{scenario_id}",
            user_id="employee-104",
            source_ip="10.20.0.14",
            device_id="DWS-OPS-07",
        )
        legitimate = OperatorSession(
            session_id=f"session-operator-{scenario_id}",
            user_id="operator-221",
            source_ip="10.20.0.21",
            device_id="DWS-OPS-11",
        )
        self.security.register_session(
            SessionProfile(
                session_id=attacker.session_id,
                user_id=attacker.user_id,
                trusted_source_ip=attacker.source_ip,
                trusted_device_id=attacker.device_id,
            )
        )
        self.security.register_session(
            SessionProfile(
                session_id=legitimate.session_id,
                user_id=legitimate.user_id,
                trusted_source_ip=legitimate.source_ip,
                trusted_device_id=legitimate.device_id,
            )
        )
        for index in range(4):
            self.security.evaluate(
                RequestEvent(
                    timestamp=now - timedelta(seconds=20 - index * 4),
                    session_id=attacker.session_id,
                    user_id=attacker.user_id,
                    service_id="dardania-water-facility",
                    method="GET",
                    path="/telemetry/facility/pump-station",
                    source_ip=attacker.source_ip,
                    device_id=attacker.device_id,
                )
            )

        compromised_request = FacilityCommandRequest(
            command=AssetCommand(action="stop"),
            session=OperatorSession(
                session_id=attacker.session_id,
                user_id=attacker.user_id,
                source_ip=attacker_ip,
                device_id="UNRECOGNIZED-CLIENT",
            ),
        )
        attack = self.execute("pump-station", compromised_request)
        legitimate_result = self.execute(
            "valve-manifold",
            FacilityCommandRequest(command=AssetCommand(action="open"), session=legitimate),
        )
        continuity_verified = not attack.applied and legitimate_result.applied
        return FacilityScenarioResult(
            attack=attack,
            legitimate=legitimate_result,
            continuity_verified=continuity_verified,
            steps=[
                SimulationStep(sequence=1, event="Behavioral baseline", outcome="Four legitimate telemetry reads established"),
                SimulationStep(sequence=2, event="Compromised operator", outcome="Pump stop requested from a new network and device"),
                SimulationStep(
                    sequence=3,
                    event="Explainable risk assessment",
                    outcome=f"Critical score {attack.decision.assessment.risk_score if attack.decision.assessment else 0}",
                ),
                SimulationStep(sequence=4, event="Selective protection", outcome="Compromised session restricted; pump command not applied"),
                SimulationStep(sequence=5, event="Continuity verification", outcome="Legitimate manifold command succeeded"),
            ],
        )

    @staticmethod
    def _to_request_event(asset_id: str, request: FacilityCommandRequest) -> RequestEvent:
        session = request.session
        command = request.command
        return RequestEvent(
            session_id=session.session_id,
            user_id=session.user_id,
            service_id="dardania-water-facility",
            method="POST",
            path=f"/operations/facility/assets/{asset_id}/{command.action}",
            source_ip=session.source_ip,
            device_id=session.device_id,
            attributes={"asset_id": asset_id, "command": command.action, "value": command.value},
        )
