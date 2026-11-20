from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .defense import DefenseService, UnsafeRule
from .models import (
    AuditLog,
    FirewallRule,
    HealthCheck,
    Incident,
    IncidentEvidence,
    IncidentUpdate,
    Policy,
    PolicyUpdate,
    ProtectedService,
    RequestEvent,
    RiskAssessment,
    RuleCreate,
    SessionControl,
    SessionProfile,
    SessionStatus,
    SimulationResult,
    GatewayDecision,
    utc_now,
)
from .facility.engine import FacilityAssetNotFound, FacilityEngine, InvalidFacilityCommand, UnsupportedFacilityCommand
from .facility.models import FacilityCommandRequest, FacilityCommandResult, FacilityScenarioResult, FacilitySnapshot
from .facility.service import FacilityService
from .security import SecurityService
from .simulation import run_compromised_session_scenario
from .store import EvidenceStore


def create_app(database_path: str | Path | None = None) -> FastAPI:
    resolved_path = database_path or os.getenv("SENTINEL_DATABASE_PATH", "sentinel.db")
    store = EvidenceStore(resolved_path)
    defense = DefenseService(store)
    security = SecurityService(store, defense=defense)

    application = FastAPI(
        title="SENTINEL Security Core",
        version="0.1.0",
        description="Explainable detection and selective containment for the Dardania Water Services simulation.",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:4173",
            "http://localhost:4173",
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:5174",
            "http://localhost:5174",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.state.store = store
    application.state.security = security
    application.state.defense = defense
    facility = FacilityService(FacilityEngine(), security)
    application.state.facility = facility

    @application.get("/health", tags=["system"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "sentinel-security-core"}

    def require_operator(role: str | None) -> str:
        resolved = role or ""
        if resolved not in {"operator", "admin"}:
            raise HTTPException(status_code=403, detail="Operator or admin role required")
        return resolved

    @application.post(
        "/api/v1/gateway/evaluate",
        response_model=GatewayDecision,
        tags=["gateway"],
    )
    async def evaluate_request(event: RequestEvent) -> GatewayDecision:
        return security.evaluate(event)

    @application.post("/api/v1/events/ingest", response_model=GatewayDecision, tags=["monitoring"])
    async def ingest_event(
        event: RequestEvent,
        ingestion_token: str | None = Header(default=None, alias="X-Sentinel-Ingestion-Token"),
    ) -> GatewayDecision:
        expected = os.getenv("SENTINEL_INGESTION_TOKEN", "sentinel-sim-ingest")
        if ingestion_token != expected:
            raise HTTPException(status_code=401, detail="Valid ingestion token required")
        return security.evaluate(event)

    @application.get(
        "/api/v1/incidents",
        response_model=list[Incident],
        tags=["incidents"],
    )
    async def list_incidents() -> list[Incident]:
        return store.list_incidents()

    @application.patch("/api/v1/incidents/{incident_id}", response_model=Incident, tags=["incidents"])
    async def update_incident(
        incident_id: str,
        update: IncidentUpdate,
        operator_role: str | None = Header(default=None, alias="X-Operator-Role"),
        operator_id: str = Header(default="console-operator", alias="X-Operator-Id"),
    ) -> Incident:
        require_operator(operator_role)
        incident = store.update_incident_status(incident_id, update.status)
        if incident is None:
            raise HTTPException(status_code=404, detail="Incident not found")
        defense.audit(
            "incident", "incident_status_updated", operator_id, "incident", incident_id,
            update.status.value, update.resolution or f"Incident moved to {update.status.value}.",
        )
        return incident

    @application.get(
        "/api/v1/incidents/{incident_id}/evidence",
        response_model=IncidentEvidence,
        tags=["incidents"],
    )
    async def incident_evidence(incident_id: str) -> IncidentEvidence:
        incident = store.get_incident(incident_id)
        if incident is None:
            raise HTTPException(status_code=404, detail="Incident not found")
        actions = [item for item in store.list_actions() if item.incident_id == incident_id]
        rules = [item for item in store.list_firewall_rules() if item.incident_id == incident_id]
        rule_ids = {item.rule_id for item in rules}
        checks = [item for item in store.list_health_checks(500) if item.rule_id in rule_ids]
        return IncidentEvidence(
            request_blocked=True,
            session_restricted=any(item.status == "enforced" for item in actions),
            continuity_verified=any(item.transaction_succeeded for item in checks),
        )

    @application.get("/api/v1/detections", response_model=list[RiskAssessment], tags=["detections"])
    async def list_detections(limit: int = Query(default=100, ge=1, le=500)) -> list[RiskAssessment]:
        return store.list_assessments(limit)

    @application.get("/api/v1/activity", response_model=list[RequestEvent], tags=["activity"])
    async def list_activity(limit: int = Query(default=100, ge=1, le=500)) -> list[RequestEvent]:
        return store.list_events(limit)

    @application.get("/api/v1/audit", response_model=list[AuditLog], tags=["audit"])
    async def list_audit(limit: int = Query(default=200, ge=1, le=1000)) -> list[AuditLog]:
        return store.list_audit(limit)

    @application.get("/api/v1/firewall/rules", response_model=list[FirewallRule], tags=["defense"])
    async def list_firewall_rules() -> list[FirewallRule]:
        defense.active_rules()
        return store.list_firewall_rules()

    @application.post("/api/v1/firewall/rules", response_model=FirewallRule, tags=["defense"])
    async def create_firewall_rule(
        request: RuleCreate,
        operator_role: str | None = Header(default=None, alias="X-Operator-Role"),
        operator_id: str = Header(default="console-operator", alias="X-Operator-Id"),
    ) -> FirewallRule:
        require_operator(operator_role)
        try:
            return defense.create_rule(request, actor=operator_id)
        except UnsafeRule as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    @application.delete("/api/v1/firewall/rules/{rule_id}", response_model=FirewallRule, tags=["defense"])
    async def remove_firewall_rule(
        rule_id: str,
        reason: str = Query(default="Manual operator override", min_length=8),
        operator_role: str | None = Header(default=None, alias="X-Operator-Role"),
        operator_id: str = Header(default="console-operator", alias="X-Operator-Id"),
    ) -> FirewallRule:
        require_operator(operator_role)
        rule = defense.remove_rule(rule_id, operator_id, reason)
        if rule is None:
            raise HTTPException(status_code=404, detail="Firewall rule not found")
        return rule

    @application.get("/api/v1/sessions", response_model=list[SessionProfile], tags=["identity"])
    async def list_sessions() -> list[SessionProfile]:
        return store.list_sessions()

    @application.post("/api/v1/sessions/{session_id}/revoke", response_model=SessionProfile, tags=["identity"])
    async def revoke_session(
        session_id: str,
        control: SessionControl,
        operator_role: str | None = Header(default=None, alias="X-Operator-Role"),
        operator_id: str = Header(default="console-operator", alias="X-Operator-Id"),
    ) -> SessionProfile:
        require_operator(operator_role)
        profile = store.get_session(session_id)
        if profile is None:
            raise HTTPException(status_code=404, detail="Session not found")
        store.set_session_status(session_id, SessionStatus.REVOKED)
        defense.audit("identity", "session_revoked", operator_id, "session", session_id, "revoked", control.reason)
        return store.get_session(session_id)  # type: ignore[return-value]

    @application.post("/api/v1/sessions/{session_id}/restore", response_model=SessionProfile, tags=["identity"])
    async def restore_session(
        session_id: str,
        control: SessionControl,
        operator_role: str | None = Header(default=None, alias="X-Operator-Role"),
        operator_id: str = Header(default="console-operator", alias="X-Operator-Id"),
    ) -> SessionProfile:
        require_operator(operator_role)
        profile = store.get_session(session_id)
        if profile is None:
            raise HTTPException(status_code=404, detail="Session not found")
        store.set_session_status(session_id, SessionStatus.ACTIVE)
        defense.audit("identity", "session_restored", operator_id, "session", session_id, "active", control.reason)
        return store.get_session(session_id)  # type: ignore[return-value]

    @application.get("/api/v1/services", response_model=list[ProtectedService], tags=["infrastructure"])
    async def list_services() -> list[ProtectedService]:
        return store.list_protected_services()

    @application.get("/api/v1/health-checks", response_model=list[HealthCheck], tags=["continuity"])
    async def list_health_checks(limit: int = Query(default=100, ge=1, le=500)) -> list[HealthCheck]:
        return store.list_health_checks(limit)

    @application.post("/api/v1/health-checks/run", response_model=HealthCheck, tags=["continuity"])
    async def run_health_check(
        operator_role: str | None = Header(default=None, alias="X-Operator-Role"),
    ) -> HealthCheck:
        require_operator(operator_role)
        return defense.verify_continuity()

    @application.get("/api/v1/policies", response_model=list[Policy], tags=["policy"])
    async def list_policies() -> list[Policy]:
        return store.list_policies()

    @application.patch("/api/v1/policies/{policy_id}", response_model=Policy, tags=["policy"])
    async def update_policy(
        policy_id: str,
        update: PolicyUpdate,
        operator_role: str | None = Header(default=None, alias="X-Operator-Role"),
        operator_id: str = Header(default="console-operator", alias="X-Operator-Id"),
    ) -> Policy:
        require_operator(operator_role)
        current = store.get_policy(policy_id)
        if current is None:
            raise HTTPException(status_code=404, detail="Policy not found")
        changes = update.model_dump(exclude_none=True)
        thresholds = [changes.get("moderate_threshold", current.moderate_threshold), changes.get("high_threshold", current.high_threshold), changes.get("critical_threshold", current.critical_threshold)]
        if not thresholds[0] < thresholds[1] < thresholds[2]:
            raise HTTPException(status_code=422, detail="Thresholds must be strictly increasing: moderate < high < critical")
        policy = current.model_copy(update={**changes, "updated_at": utc_now()})
        store.save_policy(policy)
        defense.audit("policy", "policy_updated", operator_id, "policy", policy_id, "saved", "Response policy configuration updated.", changes=changes)
        return policy

    @application.get("/api/v1/dashboard", tags=["dashboard"])
    async def dashboard() -> dict[str, object]:
        defense.active_rules()
        incidents = store.list_incidents()
        services = store.list_protected_services()
        rules = store.list_firewall_rules()
        checks = store.list_health_checks(20)
        healthy = sum(1 for service in services if service.status.value == "healthy")
        return {
            "generated_at": utc_now().isoformat(),
            "protected_services": len(services),
            "healthy_services": healthy,
            "active_incidents": sum(1 for item in incidents if item.status.value != "resolved"),
            "critical_incidents": sum(1 for item in incidents if item.risk.level.value == "critical" and item.status.value != "resolved"),
            "active_rules": sum(1 for item in rules if item.status.value == "active"),
            "restricted_sessions": sum(1 for item in store.list_sessions() if item.status is not SessionStatus.ACTIVE),
            "continuity_ok": all(item.transaction_succeeded for item in checks[:4]) if checks else True,
            "recent_incidents": [item.model_dump(mode="json") for item in incidents[:5]],
            "recent_audit": [item.model_dump(mode="json") for item in store.list_audit(8)],
        }

    @application.post(
        "/api/v1/simulations/compromised-session",
        response_model=SimulationResult,
        tags=["simulation"],
    )
    async def run_simulation(
        operator_role: str | None = Header(default=None, alias="X-Operator-Role"),
        operator_id: str = Header(default="console-operator", alias="X-Operator-Id"),
    ) -> SimulationResult:
        require_operator(operator_role)
        defense.audit("simulation", "simulation_started", operator_id, "scenario", "compromised-session", "authorized", "Authorized compromised-session simulation started.")
        return run_compromised_session_scenario(security)

    @application.post("/api/v1/simulations/rollback", response_model=FirewallRule, tags=["simulation"])
    async def run_rollback_simulation(
        operator_role: str | None = Header(default=None, alias="X-Operator-Role"),
        operator_id: str = Header(default="console-operator", alias="X-Operator-Id"),
    ) -> FirewallRule:
        require_operator(operator_role)
        return defense.create_rule(
            RuleCreate(
                target_type="endpoint",
                target_value="/telemetry/pressure",
                justification="Deliberately overrestrictive continuity rollback demonstration.",
                duration_seconds=300,
                simulate_continuity_failure=True,
            ),
            actor=operator_id,
        )

    @application.get(
        "/api/v1/facility/snapshot",
        response_model=FacilitySnapshot,
        tags=["facility"],
    )
    async def facility_snapshot() -> FacilitySnapshot:
        return facility.engine.snapshot()

    @application.post(
        "/api/v1/facility/assets/{asset_id}/commands",
        response_model=FacilityCommandResult,
        tags=["facility"],
    )
    async def facility_command(asset_id: str, request: FacilityCommandRequest) -> FacilityCommandResult:
        try:
            return facility.execute(asset_id, request)
        except FacilityAssetNotFound as error:
            raise HTTPException(status_code=404, detail=f"Unknown facility asset: {asset_id}") from error
        except (UnsupportedFacilityCommand, InvalidFacilityCommand) as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    @application.post(
        "/api/v1/facility/reset",
        response_model=FacilitySnapshot,
        tags=["facility"],
    )
    async def reset_facility(
        operator_role: str | None = Header(default=None, alias="X-Operator-Role"),
        operator_id: str = Header(default="console-operator", alias="X-Operator-Id"),
    ) -> FacilitySnapshot:
        require_operator(operator_role)
        defense.audit("facility", "facility_reset", operator_id, "facility", "dardania-water", "reset", "Facility simulation returned to baseline.")
        return facility.engine.reset()

    @application.post(
        "/api/v1/facility/scenarios/compromised-operator",
        response_model=FacilityScenarioResult,
        tags=["facility"],
    )
    async def compromised_operator_scenario(
        operator_role: str | None = Header(default=None, alias="X-Operator-Role"),
        operator_id: str = Header(default="console-operator", alias="X-Operator-Id"),
    ) -> FacilityScenarioResult:
        require_operator(operator_role)
        defense.audit("simulation", "simulation_started", operator_id, "scenario", "compromised-operator", "authorized", "Authorized facility attack simulation started.")
        return facility.run_compromised_operator()

    return application


app = create_app()
