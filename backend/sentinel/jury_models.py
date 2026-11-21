from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import uuid4

from pydantic import Field

from .models import SimulationStep, StrictModel, utc_now


JuryScenario = Literal["sensor-spoofing", "command-injection", "compromised-operator"]


class JuryAttackRequest(StrictModel):
    scenario: JuryScenario
    request_id: str = Field(default_factory=lambda: f"jury-{uuid4().hex}", min_length=8, max_length=96, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]+$")


class JuryRun(StrictModel):
    run_id: str = Field(default_factory=lambda: f"jury-{uuid4().hex[:12]}")
    scenario: JuryScenario
    status: Literal["running", "contained", "failed"] = "running"
    created_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None
    affected_asset_ids: list[str] = Field(default_factory=list)
    risk_score: int = Field(default=0, ge=0, le=100)
    continuity_verified: bool = False
    defense_actions: list[str] = Field(default_factory=list)
    steps: list[SimulationStep] = Field(default_factory=list)


class JuryStatus(StrictModel):
    active_run: JuryRun | None = None


class JuryAttackRateLimited(RuntimeError):
    pass
