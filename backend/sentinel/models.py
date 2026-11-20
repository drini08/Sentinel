from __future__ import annotations

from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


def utc_now() -> datetime:
    return datetime.now(UTC)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SessionStatus(StrEnum):
    ACTIVE = "active"
    RESTRICTED = "restricted"
    REVOKED = "revoked"


class RequestEvent(StrictModel):
    event_id: str = Field(default_factory=lambda: f"evt_{uuid4().hex[:16]}")
    timestamp: datetime = Field(default_factory=utc_now)
    session_id: str = Field(min_length=3, max_length=80)
    user_id: str = Field(min_length=2, max_length=80)
    service_id: str = Field(min_length=2, max_length=80)
    method: str = Field(pattern="^(GET|POST|PUT|PATCH|DELETE)$")
    path: str = Field(pattern="^/")
    source_ip: str
    device_id: str
    authenticated: bool = True
    attributes: dict[str, Any] = Field(default_factory=dict)


class SessionProfile(StrictModel):
    session_id: str
    user_id: str
    trusted_source_ip: str
    trusted_device_id: str
    status: SessionStatus = SessionStatus.ACTIVE


class RiskSignal(StrictModel):
    code: str
    label: str
    score: int = Field(ge=0, le=100)
    evidence: str


class RiskAssessment(StrictModel):
    assessment_id: str = Field(default_factory=lambda: f"rsk_{uuid4().hex[:16]}")
    event_id: str
    created_at: datetime = Field(default_factory=utc_now)
    risk_score: int = Field(ge=0, le=100)
    level: RiskLevel
    signals: list[RiskSignal]
    recommendation: str


class IncidentStatus(StrEnum):
    ACTIVE = "active"
    OPEN = "active"
    CONTAINED = "contained"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"


class Incident(StrictModel):
    incident_id: str = Field(default_factory=lambda: f"inc_{uuid4().hex[:12]}")
    created_at: datetime = Field(default_factory=utc_now)
    title: str
    service_id: str
    session_id: str
    status: IncidentStatus
    risk: RiskAssessment
    summary: str


class ContainmentAction(StrictModel):
    action_id: str = Field(default_factory=lambda: f"act_{uuid4().hex[:16]}")
    created_at: datetime = Field(default_factory=utc_now)
    incident_id: str
    session_id: str
    action: str = "restrict_session"
    policy: str = "critical-risk-selective-containment"
    status: str = "enforced"
    reversible: bool = True


class FirewallAction(StrEnum):
    BLOCK = "block"
    RATE_LIMIT = "rate_limit"


class FirewallRuleStatus(StrEnum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REMOVED = "removed"
    ROLLED_BACK = "rolled_back"


class FirewallRule(StrictModel):
    rule_id: str = Field(default_factory=lambda: f"fwr_{uuid4().hex[:16]}")
    target_type: str = Field(pattern="^(ip|endpoint|ip_endpoint)$")
    target_value: str = Field(min_length=1, max_length=240)
    action: FirewallAction = FirewallAction.BLOCK
    justification: str = Field(min_length=8, max_length=500)
    created_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime = Field(default_factory=lambda: utc_now() + timedelta(minutes=15))
    status: FirewallRuleStatus = FirewallRuleStatus.ACTIVE
    incident_id: str | None = None
    created_by: str = "sentinel-decision-engine"
    rate_limit: int | None = Field(default=None, ge=1, le=10000)


class HealthStatus(StrEnum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


class ProtectedService(StrictModel):
    service_id: str
    name: str
    service_type: str
    base_url: str
    health_path: str = "/health"
    essential_paths: list[str] = Field(default_factory=list)
    status: HealthStatus = HealthStatus.HEALTHY
    latency_ms: int = Field(default=20, ge=0)
    enabled: bool = True


class HealthCheck(StrictModel):
    check_id: str = Field(default_factory=lambda: f"chk_{uuid4().hex[:16]}")
    service_id: str
    checked_at: datetime = Field(default_factory=utc_now)
    status: HealthStatus
    response_time_ms: int = Field(ge=0)
    transaction_succeeded: bool
    rule_id: str | None = None
    detail: str


class AuditLog(StrictModel):
    audit_id: str = Field(default_factory=lambda: f"aud_{uuid4().hex[:16]}")
    timestamp: datetime = Field(default_factory=utc_now)
    category: str
    action: str
    actor: str
    entity_type: str
    entity_id: str
    outcome: str
    detail: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class Policy(StrictModel):
    policy_id: str
    name: str
    description: str
    enabled: bool = True
    moderate_threshold: int = Field(default=30, ge=0, le=100)
    high_threshold: int = Field(default=60, ge=0, le=100)
    critical_threshold: int = Field(default=80, ge=0, le=100)
    automatic_containment: bool = True
    require_corroboration: bool = True
    updated_at: datetime = Field(default_factory=utc_now)


class RuleCreate(StrictModel):
    target_type: str = Field(pattern="^(ip|endpoint|ip_endpoint)$")
    target_value: str = Field(min_length=1, max_length=240)
    action: FirewallAction = FirewallAction.BLOCK
    justification: str = Field(min_length=8, max_length=500)
    duration_seconds: int = Field(default=900, ge=30, le=86400)
    incident_id: str | None = None
    rate_limit: int | None = Field(default=None, ge=1, le=10000)
    simulate_continuity_failure: bool = False


class SessionControl(StrictModel):
    reason: str = Field(min_length=8, max_length=500)


class IncidentUpdate(StrictModel):
    status: IncidentStatus
    resolution: str | None = Field(default=None, max_length=1000)


class PolicyUpdate(StrictModel):
    enabled: bool | None = None
    moderate_threshold: int | None = Field(default=None, ge=0, le=100)
    high_threshold: int | None = Field(default=None, ge=0, le=100)
    critical_threshold: int | None = Field(default=None, ge=0, le=100)
    automatic_containment: bool | None = None
    require_corroboration: bool | None = None


class GatewayDecision(StrictModel):
    event_id: str
    allowed: bool
    response_status: int
    reason: str
    assessment: RiskAssessment | None = None
    incident: Incident | None = None
    containment: ContainmentAction | None = None


class SimulationStep(StrictModel):
    sequence: int
    event: str
    outcome: str


class SimulationResult(StrictModel):
    scenario: str
    completed_at: datetime = Field(default_factory=utc_now)
    attacker_session_id: str
    legitimate_session_id: str
    attacker_response_status: int
    legitimate_response_status: int
    continuity_verified: bool
    incident: Incident
    containment: ContainmentAction
    steps: list[SimulationStep]
