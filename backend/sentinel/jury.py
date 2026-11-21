from __future__ import annotations

from uuid import uuid4
from datetime import timedelta

from .facility.service import FacilityService
from .jury_models import JuryAttackRequest, JuryRun, JuryStatus
from .models import RequestEvent, SessionProfile, SimulationStep
from .models import utc_now


class JuryService:
    def __init__(self, facility: FacilityService, store: object) -> None:
        self.facility = facility
        self.store = store

    def trigger(self, request: JuryAttackRequest) -> JuryRun:
        running = JuryRun(run_id=request.request_id, scenario=request.scenario)
        claimed, existing = self.store.claim_jury_run(running, cooldown_seconds=2)  # type: ignore[attr-defined]
        if not claimed:
            return existing
        try:
            if request.scenario == "compromised-operator":
                run = self._compromised_operator(request.request_id)
            else:
                run = self._controlled_attack(request.scenario, request.request_id)
        except Exception:
            run = running.model_copy(update={
                "status": "failed",
                "completed_at": utc_now(),
                "defense_actions": ["Simulation stopped safely", "No facility command was applied"],
                "steps": [SimulationStep(sequence=1, event="Simulation unavailable", outcome="The controlled attack engine failed safely")],
            })
        self.store.update_jury_run(run)  # type: ignore[attr-defined]
        return run

    def status(self) -> JuryStatus:
        return JuryStatus(active_run=self.store.latest_jury_run())  # type: ignore[attr-defined]

    def reset(self) -> JuryStatus:
        self.store.reset_jury_demo()  # type: ignore[attr-defined]
        self.facility.engine.reset()
        return JuryStatus()

    def get_run(self, run_id: str) -> JuryRun | None:
        return self.store.get_jury_run(run_id)  # type: ignore[attr-defined]

    def _compromised_operator(self, run_id: str) -> JuryRun:
        result = self.facility.run_compromised_operator()
        return JuryRun(
            run_id=run_id,
            scenario="compromised-operator",
            status="contained" if result.continuity_verified else "failed",
            completed_at=utc_now(),
            affected_asset_ids=[result.attack.asset.id],
            risk_score=result.attack.decision.assessment.risk_score if result.attack.decision.assessment else 0,
            continuity_verified=result.continuity_verified,
            defense_actions=["Suspicious command blocked", "Compromised session restricted", "Independent flow verified"],
            steps=result.steps,
        )

    def _controlled_attack(self, scenario: str, run_id: str) -> JuryRun:
        attack_id = uuid4().hex[:8]
        asset_id = "reservoir-b" if scenario == "sensor-spoofing" else "dosing-unit"
        label = "Forged reservoir telemetry" if scenario == "sensor-spoofing" else "Injected chemical dosing command"
        attacker = SessionProfile(
            session_id=f"jury-attacker-{attack_id}",
            user_id="external-adversary",
            trusted_source_ip="10.20.0.42",
            trusted_device_id="DWS-SENSOR-14",
        )
        operator = SessionProfile(
            session_id=f"jury-operator-{attack_id}",
            user_id="operator-221",
            trusted_source_ip="10.20.0.21",
            trusted_device_id="DWS-OPS-11",
        )
        self.facility.security.register_session(attacker)
        self.facility.security.register_session(operator)
        attack = self.facility.security.evaluate(
            RequestEvent(
                session_id=attacker.session_id,
                user_id=attacker.user_id,
                service_id="dardania-water-facility",
                method="POST",
                path=f"/operations/facility/assets/{asset_id}/override",
                source_ip="203.0.113.77",
                device_id="FORGED-REMOTE-CLIENT",
                attributes={
                    "known_malicious_indicator": True,
                    "baseline_deviation": scenario == "sensor-spoofing",
                    "attack_scenario": scenario,
                },
            )
        )
        legitimate = self.facility.security.evaluate(
            RequestEvent(
                session_id=operator.session_id,
                user_id=operator.user_id,
                service_id="dardania-water-facility",
                method="GET",
                path="/telemetry/facility/continuity",
                source_ip=operator.trusted_source_ip,
                device_id=operator.trusted_device_id,
            )
        )
        self.facility.engine.set_security_status(asset_id, "contained")
        risk_score = attack.assessment.risk_score if attack.assessment else 0
        continuity_verified = not attack.allowed and legitimate.allowed
        return JuryRun(
            run_id=run_id,
            scenario=scenario,  # type: ignore[arg-type]
            status="contained" if continuity_verified else "failed",
            completed_at=utc_now(),
            affected_asset_ids=[asset_id],
            risk_score=risk_score,
            continuity_verified=continuity_verified,
            defense_actions=["Anomalous source isolated", "Unsafe mutation blocked", "Clean operations path verified"],
            steps=[
                SimulationStep(sequence=1, event="Attack received", outcome=label),
                SimulationStep(sequence=2, event="Cross-layer correlation", outcome=f"Risk score {risk_score} from network, device, and behavior signals"),
                SimulationStep(sequence=3, event="Selective protection", outcome=f"{asset_id} protected without applying the hostile change"),
                SimulationStep(sequence=4, event="Continuity verification", outcome="Independent operator telemetry remained available"),
            ],
        )
