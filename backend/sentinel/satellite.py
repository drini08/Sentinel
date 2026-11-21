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
    def __init__(self) -> None:
        self.project = os.getenv("EARTH_ENGINE_PROJECT")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.gemini_model = os.getenv("GEMINI_MODEL")
        self.dataset = os.getenv("EARTH_ENGINE_DATASET")
        self.cloud_percent = os.getenv("EARTH_ENGINE_CLOUD_PERCENT")
        self.water_index_threshold = os.getenv("EARTH_ENGINE_WATER_INDEX_THRESHOLD")
        self.scale_meters = os.getenv("EARTH_ENGINE_SCALE_METERS")
        self.max_pixels = os.getenv("EARTH_ENGINE_MAX_PIXELS")

    def _configured(self) -> bool:
        return all((
            self.project, self.gemini_key, self.gemini_model, self.dataset,
            self.cloud_percent, self.water_index_threshold, self.scale_meters, self.max_pixels,
        ))

    def status(self) -> SatelliteIntegrationStatus:
        return SatelliteIntegrationStatus(
            earth_engine_configured=bool(self.project),
            gemini_configured=bool(self.gemini_key),
            mode="live" if self._configured() else "unavailable",
            dataset=self.dataset,
        )

    def analyze(self, request: SatelliteAnalysisRequest, vercel_oidc_token: str | None = None) -> SatelliteAnalysisResult:
        if not self._configured():
            raise SatelliteLiveError("Live satellite analysis is not fully configured")
        try:
            metrics = self._earth_engine_metrics(request, vercel_oidc_token)
        except SatelliteLiveError:
            raise
        except Exception as error:
            print(f"Earth Engine query error: {type(error).__name__}: {error}", flush=True)
            raise SatelliteLiveError(f"Earth Engine query failed ({type(error).__name__})") from error

        observation, recommendation = self._explain(request, metrics)
        digest = sha256(json.dumps(request.model_dump(mode="json"), sort_keys=True).encode()).hexdigest()[:12]
        return SatelliteAnalysisResult(
            analysis_id=f"sat_{digest}",
            baseline_water_km2=metrics["baseline_water_km2"],
            current_water_km2=metrics["current_water_km2"],
            change_percent=metrics["change_percent"],
            scada_level_percent=request.scada_level_percent,
            observation=observation,
            recommendation=recommendation,
            imagery_dataset=self.dataset,
        )

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
            try:
                ee.Initialize(credentials=credentials, project=self.project)
            except Exception as error:
                raise SatelliteLiveError(f"Earth Engine initialization failed ({type(error).__name__})") from error
        elif vercel_oidc_token or os.getenv("VERCEL_OIDC_TOKEN"):
            credentials = self._vercel_federated_credentials(vercel_oidc_token or os.environ["VERCEL_OIDC_TOKEN"])
            try:
                ee.Initialize(credentials=credentials, project=self.project)
            except Exception as error:
                raise SatelliteLiveError(f"Earth Engine initialization failed ({type(error).__name__})") from error
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
                .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", float(self.cloud_percent)))
                .median()
                .clip(geometry)
            )

        def water_area(image) -> float:
            water = image.normalizedDifference(["B3", "B8"]).gt(float(self.water_index_threshold))
            area = ee.Image.pixelArea().updateMask(water).reduceRegion(
                reducer=ee.Reducer.sum(), geometry=geometry,
                scale=float(self.scale_meters), maxPixels=int(self.max_pixels),
            ).get("area", 0)
            return float(ee.Number(area).getInfo() or 0) / 1_000_000

        try:
            baseline_image = composite(request.baseline_start.isoformat(), request.baseline_end.isoformat())
            current_image = composite(request.current_start.isoformat(), request.current_end.isoformat())
        except Exception as error:
            raise SatelliteLiveError("Earth Engine composite failed") from error
        try:
            baseline = water_area(baseline_image)
            current = water_area(current_image)
        except Exception as error:
            raise SatelliteLiveError("Earth Engine water-mask reduction failed") from error
        if baseline <= 0:
            raise ValueError("No water pixels were available in the baseline range")
        return {
            "baseline_water_km2": round(baseline, 2),
            "current_water_km2": round(current, 2),
            "change_percent": round((current - baseline) / baseline * 100, 1),
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
            "scope": "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/earthengine",
            "requested_token_type": "urn:ietf:params:oauth:token-type:access_token",
            "subject_token_type": "urn:ietf:params:oauth:token-type:jwt",
            "subject_token": subject_token,
        }).encode()
        try:
            with urlopen(Request(
                "https://sts.googleapis.com/v1/token", data=token_body,
                headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST",
            ), timeout=15) as response:
                federated = json.loads(response.read())
        except HTTPError as error:
            raise SatelliteLiveError(f"Google STS exchange failed (HTTP {error.code})") from error
        access_body = json.dumps({
            "scope": [
                "https://www.googleapis.com/auth/cloud-platform",
                "https://www.googleapis.com/auth/earthengine",
            ],
            "lifetime": "3600s",
        }).encode()
        try:
            with urlopen(Request(
                f"https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/{service_account}:generateAccessToken",
                data=access_body,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {federated['access_token']}"},
                method="POST",
            ), timeout=15) as response:
                access = json.loads(response.read())
        except HTTPError as error:
            raise SatelliteLiveError(f"Google service-account impersonation failed (HTTP {error.code})") from error
        return Credentials(token=access["accessToken"])

    def _explain(
        self,
        request: SatelliteAnalysisRequest,
        metrics: dict[str, float | str | None],
    ) -> tuple[str, str]:
        prompt = (
            "You are explaining remote-sensing evidence for a water utility operator. "
            "Return JSON with an observation string of at most 24 words and a recommendation array containing "
            "at most 3 actions of at most 12 words each. Be concise. Do not repeat the raw metric values. "
            "Do not claim the satellite proves a cyberattack "
            "and do not recommend automatic physical control. Do not introduce or guess a geographic location name. "
            f"Baseline water area: {metrics['baseline_water_km2']} km2; "
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
            return observation, recommendation
        except (HTTPError, KeyError, StopIteration, TypeError, ValueError, URLError, TimeoutError) as error:
            raise SatelliteLiveError("Gemini satellite explanation failed") from error

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
