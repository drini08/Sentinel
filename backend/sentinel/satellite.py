from __future__ import annotations

import json
import os
import base64
from urllib.parse import urlencode
from hashlib import sha256
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .satellite_models import SatelliteAnalysisRequest, SatelliteAnalysisResult, SatelliteIntegrationStatus


class SatelliteLiveError(RuntimeError):
    """Raised when configured live Earth Engine analysis cannot be completed."""


class SatelliteService:
    dataset = "COPERNICUS/S2_SR_HARMONIZED"

    def __init__(self) -> None:
        self.project = os.getenv("EARTH_ENGINE_PROJECT")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

    def status(self) -> SatelliteIntegrationStatus:
        return SatelliteIntegrationStatus(
            earth_engine_configured=bool(self.project),
            gemini_configured=bool(self.gemini_key),
            mode="live" if self.project else "demo",
        )

    def analyze(self, request: SatelliteAnalysisRequest, vercel_oidc_token: str | None = None) -> SatelliteAnalysisResult:
        if self.project:
            try:
                metrics = self._earth_engine_metrics(request, vercel_oidc_token)
            except Exception as error:
                print(f"Earth Engine federation error: {type(error).__name__}: {error}", flush=True)
                raise SatelliteLiveError("Earth Engine analysis is unavailable; check project registration and credentials") from error
            source = "earth-engine"
        else:
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

    def _earth_engine_metrics(self, request: SatelliteAnalysisRequest, vercel_oidc_token: str | None = None) -> dict[str, float | str | None]:
        import ee  # type: ignore[import-untyped]

        credentials_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON_BASE64")
        if credentials_json:
            from google.oauth2.service_account import Credentials

            decoded = base64.b64decode(credentials_json, validate=True)
            service_account_info = json.loads(decoded.decode("utf-8"))
            credentials = Credentials.from_service_account_info(
                service_account_info,
                scopes=["https://www.googleapis.com/auth/earthengine", "https://www.googleapis.com/auth/cloud-platform"],
            )
            ee.Initialize(credentials=credentials, project=self.project)
        elif vercel_oidc_token or os.getenv("VERCEL_OIDC_TOKEN"):
            credentials = self._vercel_federated_credentials(vercel_oidc_token or os.environ["VERCEL_OIDC_TOKEN"])
            ee.Initialize(credentials=credentials, project=self.project)
        else:
            # Local development keeps supporting GOOGLE_APPLICATION_CREDENTIALS,
            # Earth Engine's persisted OAuth credentials, and ADC.
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

    def _vercel_federated_credentials(self, subject_token: str):
        from google.oauth2.credentials import Credentials

        project_number = os.getenv("GCP_PROJECT_NUMBER")
        pool_id = os.getenv("GCP_WORKLOAD_IDENTITY_POOL_ID")
        provider_id = os.getenv("GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID")
        service_account = os.getenv("GCP_SERVICE_ACCOUNT_EMAIL")
        if not all((project_number, pool_id, provider_id, service_account)):
            raise SatelliteLiveError("Vercel OIDC federation is not fully configured")
        audience = (
            f"//iam.googleapis.com/projects/{project_number}/locations/global/"
            f"workloadIdentityPools/{pool_id}/providers/{provider_id}"
        )
        token_body = urlencode({
            "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
            "audience": audience,
            "scope": "https://www.googleapis.com/auth/cloud-platform",
            "requested_token_type": "urn:ietf:params:oauth:token-type:access_token",
            "subject_token_type": "urn:ietf:params:oauth:token-type:jwt",
            "subject_token": subject_token,
        }).encode()
        with urlopen(Request(
            "https://sts.googleapis.com/v1/token", data=token_body,
            headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST",
        ), timeout=15) as response:
            federated = json.loads(response.read())
        access_body = json.dumps({"scope": ["https://www.googleapis.com/auth/cloud-platform"], "lifetime": "3600s"}).encode()
        with urlopen(Request(
            f"https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/{service_account}:generateAccessToken",
            data=access_body,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {federated['access_token']}"},
            method="POST",
        ), timeout=15) as response:
            access = json.loads(response.read())
        return Credentials(token=access["accessToken"])

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
            "Return JSON with an observation string of at most 24 words and a recommendation array containing "
            "at most 3 actions of at most 12 words each. Be concise. Do not repeat the raw metric values. "
            "Do not claim the satellite proves a cyberattack "
            "and do not recommend automatic physical control. "
            f"Site: {request.name}; baseline water area: {metrics['baseline_water_km2']} km2; "
            f"current water area: {metrics['current_water_km2']} km2; change: {metrics['change_percent']}%; "
            f"SCADA level: {request.scada_level_percent}%."
        )
        body = json.dumps({
            "model": self.gemini_model,
            "input": prompt + " Return only the JSON object, without Markdown fences.",
            "store": False,
            "generation_config": {"temperature": 0.1, "thinking_level": "low"},
        }).encode()
        api_request = Request(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            data=body,
            headers={"Content-Type": "application/json", "x-goog-api-key": self.gemini_key},
            method="POST",
        )
        try:
            with urlopen(api_request, timeout=45) as response:
                payload = json.loads(response.read())
            model_step = next(step for step in reversed(payload["steps"]) if step.get("type") == "model_output")
            content = next(item["text"] for item in model_step["content"] if item.get("type") == "text")
            cleaned = content.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            explanation = json.loads(cleaned)
            observation = self._operator_text(explanation["observation"])
            recommendation = self._operator_text(explanation["recommendation"])
            if not observation or not recommendation:
                raise ValueError("Gemini returned an empty explanation")
            return observation, recommendation, "gemini"
        except (HTTPError, KeyError, StopIteration, TypeError, ValueError, URLError, TimeoutError):
            return fallback_observation, fallback_recommendation, "deterministic"

    @staticmethod
    def _operator_text(value: object) -> str:
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, list):
            return "; ".join(filter(None, (SatelliteService._operator_text(item) for item in value)))
        if isinstance(value, dict):
            preferred = (
                "summary", "assessment", "interpretation", "discrepancy", "analysis", "text", "message",
                "rationale", "action", "action_items", "actions", "steps", "recommendations",
            )
            ordered = [value[key] for key in preferred if key in value]
            if not ordered:
                ordered = [item for item in value.values() if isinstance(item, (str, list, dict))]
            return "; ".join(dict.fromkeys(filter(None, (SatelliteService._operator_text(item) for item in ordered))))
        return str(value).strip() if value is not None else ""
