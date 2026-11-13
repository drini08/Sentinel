from __future__ import annotations

from datetime import UTC, datetime
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
    OPEN = "open"
    CONTAINED = "contained"
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
