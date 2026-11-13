from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from ..models import StrictModel, utc_now


AssetType = Literal[
    "intake",
    "dosing",
    "clarifier",
    "filter",
    "reservoir",
    "pump_station",
    "valve",
    "control",
    "power",
    "outlet",
]
CommandAction = Literal["open", "close", "start", "stop", "set_mode", "set_target", "isolate"]
MetricValue = float | int | str | bool


class FacilityAsset(StrictModel):
    id: str
    name: str
    asset_type: AssetType
    status: str = "operational"
    security_status: str = "secure"
    position: tuple[float, float, float]
    metrics: dict[str, MetricValue] = Field(default_factory=dict)
    supported_commands: list[CommandAction] = Field(default_factory=list)


class FacilityConnection(StrictModel):
    id: str
    source: str
    target: str
    flow_m3s: float = Field(ge=0)
    active: bool = True


class FacilitySnapshot(StrictModel):
    revision: int = Field(ge=1)
    generated_at: datetime = Field(default_factory=utc_now)
    assets: list[FacilityAsset]
    connections: list[FacilityConnection]


class AssetCommand(StrictModel):
    action: CommandAction
    value: str | float | bool | None = None
