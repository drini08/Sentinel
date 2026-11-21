from __future__ import annotations

import json
import os
from hashlib import sha256
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from .visual_inspection_models import (
    VisualInspectionRequest,
    VisualInspectionResult,
    VisualInspectionStatus,
)


class VisualInspectionUnavailable(RuntimeError):
    """Raised when the configured Gemini inspection cannot be completed."""


class VisualInspectionService:
    def __init__(self) -> None:
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

    def status(self) -> VisualInspectionStatus:
        return VisualInspectionStatus(configured=bool(self.api_key), model=self.model)

    def analyze(self, request: VisualInspectionRequest) -> VisualInspectionResult:
        if not self.api_key:
            raise VisualInspectionUnavailable("Gemini visual inspection is not configured")

        schema = {
            "type": "object",
            "properties": {
                "asset_type": {"type": "string"},
                "condition": {"type": "string", "enum": ["good", "attention", "critical", "unknown"]},
                "summary": {"type": "string"},
                "findings": {"type": "array", "items": {"type": "string"}, "maxItems": 2},
                "risks": {"type": "array", "items": {"type": "string"}, "maxItems": 2},
                "recommendations": {"type": "array", "items": {"type": "string"}, "maxItems": 2},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            },
            "required": ["asset_type", "condition", "summary", "findings", "risks", "recommendations", "confidence"],
        }
        prompt = (
            "Act as a visual inspection assistant for water and critical infrastructure. Analyze only what is visibly "
            "supported by this image. Identify the likely asset, visible condition, notable findings and plausible safety "
            "or maintenance risks. Do not claim hidden defects, cyber compromise, engineering certification, or certainty. "
            "Use 'unknown' when the image is insufficient. Keep the summary under 10 words. Return no more than "
            "2 findings, 2 risks, and 2 recommendations. Every bullet must be 5 words or fewer. Recommendations "
            "must be low-risk verification or qualified-inspection actions. Never instruct the operator to isolate, "
            "shut down, start, open, or close equipment; recommend escalation under approved procedures instead. "
            f"Operator context: {request.context.strip() or 'No additional context provided.'}"
        )
        body = json.dumps({
            "contents": [{
                "role": "user",
                "parts": [
                    {"inline_data": {"mime_type": request.mime_type, "data": request.image_base64}},
                    {"text": prompt},
                ],
            }],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
                "responseJsonSchema": schema,
            },
        }).encode()
        api_request = Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{quote(self.model, safe='')}:generateContent",
            data=body,
            headers={"Content-Type": "application/json", "x-goog-api-key": self.api_key},
            method="POST",
        )
        try:
            with urlopen(api_request, timeout=55) as response:
                payload = json.loads(response.read())
            text = payload["candidates"][0]["content"]["parts"][0]["text"].strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            result = json.loads(text)
            result["asset_type"] = self._capitalize(result.get("asset_type", "Unknown infrastructure asset"))
            result["summary"] = self._shorten(result.get("summary", "Visible condition requires review"), 10)
            result["findings"] = [self._shorten(item, 5) for item in result.get("findings", [])[:2]]
            result["risks"] = [self._shorten(item, 5) for item in result.get("risks", [])[:2]]
            result["recommendations"] = [self._shorten(item, 5) for item in result.get("recommendations", [])[:2]]
            digest = sha256((request.filename + request.image_base64[:512]).encode()).hexdigest()[:12]
            return VisualInspectionResult(
                inspection_id=f"vis_{digest}",
                model=self.model,
                **result,
            )
        except HTTPError as error:
            raise VisualInspectionUnavailable(f"Gemini inspection failed (HTTP {error.code})") from error
        except (URLError, TimeoutError) as error:
            raise VisualInspectionUnavailable("Gemini inspection service is unavailable") from error
        except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as error:
            raise VisualInspectionUnavailable("Gemini returned an invalid inspection result") from error

    @staticmethod
    def _shorten(value: object, limit: int) -> str:
        words = str(value).strip().split()
        return " ".join(words[:limit]).rstrip(".,;:")

    @staticmethod
    def _capitalize(value: object) -> str:
        text = str(value).strip()
        return text[:1].upper() + text[1:] if text else "Unknown infrastructure asset"

