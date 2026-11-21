from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import Field, model_validator

from .models import StrictModel


class SatelliteAnalysisRequest(StrictModel):
    polygon: list[list[float]] = Field(min_length=3, max_length=200)
    baseline_start: date
    baseline_end: date
    current_start: date
    current_end: date
    scada_level_percent: float = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_geometry_and_dates(self) -> "SatelliteAnalysisRequest":
        for point in self.polygon:
            if len(point) != 2:
                raise ValueError("Polygon coordinates must be [longitude, latitude]")
            longitude, latitude = point
            if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
                raise ValueError("Polygon coordinates are outside valid geographic bounds")
        if self.baseline_start >= self.baseline_end or self.current_start >= self.current_end:
            raise ValueError("Each imagery date range must have a start before its end")
        return self


class SatelliteAnalysisResult(StrictModel):
    analysis_id: str
    baseline_water_km2: float
    current_water_km2: float
    change_percent: float
    scada_level_percent: float
    observation: str
    recommendation: str
    imagery_dataset: str


class SatelliteIntegrationStatus(StrictModel):
    earth_engine_configured: bool
    gemini_configured: bool
    mode: Literal["live", "unavailable"]
    dataset: str | None
