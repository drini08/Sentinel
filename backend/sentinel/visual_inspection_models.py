from __future__ import annotations

import base64
import binascii
from typing import Literal

from pydantic import Field, field_validator

from .models import StrictModel


class VisualInspectionRequest(StrictModel):
    filename: str = Field(min_length=1, max_length=160)
    mime_type: Literal["image/jpeg", "image/png", "image/webp"]
    image_base64: str = Field(min_length=16, max_length=8_000_000)
    context: str = Field(default="", max_length=500)

    @field_validator("image_base64")
    @classmethod
    def validate_image(cls, value: str) -> str:
        try:
            decoded = base64.b64decode(value, validate=True)
        except (binascii.Error, ValueError) as error:
            raise ValueError("Image must be valid base64 data") from error
        if len(decoded) > 5_000_000:
            raise ValueError("Image must be smaller than 5 MB")
        return value


class VisualInspectionResult(StrictModel):
    inspection_id: str
    asset_type: str
    condition: Literal["good", "attention", "critical", "unknown"]
    summary: str
    findings: list[str] = Field(max_length=4)
    risks: list[str] = Field(max_length=3)
    recommendations: list[str] = Field(max_length=3)
    confidence: float = Field(ge=0, le=1)
    model: str


class VisualInspectionStatus(StrictModel):
    configured: bool
    model: str

