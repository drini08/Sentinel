from __future__ import annotations

import json
import os
from hashlib import sha256
from urllib.error import URLError
from urllib.request import Request, urlopen

from .satellite_models import SatelliteAnalysisRequest, SatelliteAnalysisResult, SatelliteIntegrationStatus


class SatelliteService:
    dataset = "COPERNICUS/S2_SR_HARMONIZED"

    def __init__(self) -> None:
        self.project = os.getenv("EARTH_ENGINE_PROJECT")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    def status(self) -> SatelliteIntegrationStatus:
        return SatelliteIntegrationStatus(
            earth_engine_configured=bool(self.project),
            gemini_configured=bool(self.gemini_key),
            mode="live" if self.project else "demo",
        )

    def analyze(self, request: SatelliteAnalysisRequest) -> SatelliteAnalysisResult:
        try:
            metrics = self._earth_engine_metrics(request) if self.project else self._demo_metrics(request)
            source = "earth-engine" if self.project else "demo"
        except Exception:
            metrics = self._demo_metrics(request)
            source = "demo"

        change = metrics["change_percent"]
        mismatch = abs(change) >= 8 and request.scada_level_percent >= 70
        deterministic_observation = (
            f"Satellite water extent changed {change:+.1f}% while SCADA reports "
            f"{request.scada_level_percent:.0f}% capacity."
        )
        deterministic_recommendation = (
            "Inspect reservoir telemetry and sensor integrity before changing operations."
            if mismatch else
            "Continue monitoring; satellite and operational evidence do not indicate a material mismatch."
        )
        observation, recommendation, explanation_source = self._explain(
            request, metrics, deterministic_observation, deterministic_recommendation
        )
        digest = sha256(json.dumps(request.model_dump(mode="json"), sort_keys=True).encode()).hexdigest()[:12]
        return SatelliteAnalysisResult(
            analysis_id=f"sat_{digest}",
            name=request.name,
            source=source,
            baseline_water_km2=metrics["baseline_water_km2"],
            current_water_km2=metrics["current_water_km2"],
            change_percent=change,
            scada_level_percent=request.scada_level_percent,
            mismatch_detected=mismatch,
            confidence=0.88 if source == "earth-engine" else 0.74,
            observation=observation,
            recommendation=recommendation,
            explanation_source=explanation_source,
            baseline_image_url=metrics.get("baseline_image_url"),
            current_image_url=metrics.get("current_image_url"),
        )

    def _demo_metrics(self, request: SatelliteAnalysisRequest) -> dict[str, float | str | None]:
        seed = int(sha256(json.dumps(request.polygon).encode()).hexdigest()[:6], 16)
        baseline = 2.45 + (seed % 55) / 100
        decline = 0.11 + (seed % 8) / 100
        current = baseline * (1 - decline)
        return {
            "baseline_water_km2": round(baseline, 2),
            "current_water_km2": round(current, 2),
            "change_percent": round((current - baseline) / baseline * 100, 1),
            "baseline_image_url": None,
            "current_image_url": None,
        }

    def _earth_engine_metrics(self, request: SatelliteAnalysisRequest) -> dict[str, float | str | None]:
        import ee  # type: ignore[import-untyped]

        ee.Initialize(project=self.project)
        geometry = ee.Geometry.Polygon([request.polygon])

        def composite(start: str, end: str):
            return (
                ee.ImageCollection(self.dataset)
                .filterBounds(geometry)
                .filterDate(start, end)
                .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 35))
                .median()
                .clip(geometry)
            )

        def water_area(image) -> float:
            water = image.normalizedDifference(["B3", "B8"]).gt(0.12)
            area = ee.Image.pixelArea().updateMask(water).reduceRegion(
                reducer=ee.Reducer.sum(), geometry=geometry, scale=20, maxPixels=10_000_000
            ).get("area")
            return float(ee.Number(area).getInfo() or 0) / 1_000_000

        baseline_image = composite(request.baseline_start.isoformat(), request.baseline_end.isoformat())
        current_image = composite(request.current_start.isoformat(), request.current_end.isoformat())
        baseline = water_area(baseline_image)
        current = water_area(current_image)
        if baseline <= 0:
            raise ValueError("No water pixels were available in the baseline range")
        visualization = {"bands": ["B4", "B3", "B2"], "min": 0, "max": 3000, "dimensions": 900, "region": geometry}
        return {
            "baseline_water_km2": round(baseline, 2),
            "current_water_km2": round(current, 2),
            "change_percent": round((current - baseline) / baseline * 100, 1),
            "baseline_image_url": baseline_image.getThumbURL(visualization),
            "current_image_url": current_image.getThumbURL(visualization),
        }

    def _explain(
        self,
        request: SatelliteAnalysisRequest,
        metrics: dict[str, float | str | None],
        fallback_observation: str,
        fallback_recommendation: str,
    ) -> tuple[str, str, str]:
        if not self.gemini_key:
            return fallback_observation, fallback_recommendation, "deterministic"
        prompt = (
            "You are explaining remote-sensing evidence for a water utility operator. "
            "Return JSON with observation and recommendation. Do not claim the satellite proves a cyberattack "
            "and do not recommend automatic physical control. "
            f"Site: {request.name}; baseline water area: {metrics['baseline_water_km2']} km2; "
            f"current water area: {metrics['current_water_km2']} km2; change: {metrics['change_percent']}%; "
            f"SCADA level: {request.scada_level_percent}%."
        )
        body = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
        }).encode()
        api_request = Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_key}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(api_request, timeout=12) as response:
                payload = json.loads(response.read())
            content = payload["candidates"][0]["content"]["parts"][0]["text"]
            explanation = json.loads(content)
            return explanation["observation"], explanation["recommendation"], "gemini"
        except (KeyError, TypeError, ValueError, URLError, TimeoutError):
            return fallback_observation, fallback_recommendation, "deterministic"
