from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from sentinel.main import create_app
from sentinel.satellite import SatelliteLiveError, SatelliteService
from sentinel.satellite_models import SatelliteAnalysisRequest


SATELLITE_ENVIRONMENT = (
    "EARTH_ENGINE_PROJECT",
    "EARTH_ENGINE_DATASET",
    "EARTH_ENGINE_CLOUD_PERCENT",
    "EARTH_ENGINE_WATER_INDEX_THRESHOLD",
    "EARTH_ENGINE_SCALE_METERS",
    "EARTH_ENGINE_MAX_PIXELS",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
)


def analysis_payload() -> dict[str, object]:
    today = date.today()
    return {
        "polygon": [[0.0, 0.0], [0.01, 0.0], [0.01, 0.01]],
        "baseline_start": (today - timedelta(days=60)).isoformat(),
        "baseline_end": (today - timedelta(days=30)).isoformat(),
        "current_start": (today - timedelta(days=29)).isoformat(),
        "current_end": today.isoformat(),
        "scada_level_percent": 50,
    }


def test_satellite_status_is_unavailable_without_runtime_configuration(monkeypatch) -> None:
    for variable in SATELLITE_ENVIRONMENT:
        monkeypatch.delenv(variable, raising=False)
    client = TestClient(create_app(":memory:"))
    response = client.get("/api/v1/satellite/status")
    assert response.status_code == 200
    assert response.json() == {
        "earth_engine_configured": False,
        "gemini_configured": False,
        "mode": "unavailable",
        "dataset": None,
    }


def test_satellite_analysis_never_falls_back_without_live_configuration(monkeypatch) -> None:
    for variable in SATELLITE_ENVIRONMENT:
        monkeypatch.delenv(variable, raising=False)
    client = TestClient(create_app(":memory:"))
    response = client.post("/api/v1/satellite/analyze", json=analysis_payload())
    assert response.status_code == 503
    assert response.json()["detail"] == "Live satellite analysis is not fully configured"


def test_gemini_structured_explanation_is_flattened_for_operators() -> None:
    assert SatelliteService._operator_text({
        "summary": "Water extent declined.",
        "details": ["SCADA remains high.", "Check telemetry."],
    }) == "Water extent declined."
    assert SatelliteService._operator_text({
        "action_items": ["Check telemetry.", "Inspect the reservoir."],
        "priority": 1,
    }) == "Check telemetry.; Inspect the reservoir."


def test_configured_live_analysis_does_not_silently_fallback(monkeypatch) -> None:
    runtime = {
        "EARTH_ENGINE_PROJECT": "runtime-project",
        "EARTH_ENGINE_DATASET": "runtime-dataset",
        "EARTH_ENGINE_CLOUD_PERCENT": "1",
        "EARTH_ENGINE_WATER_INDEX_THRESHOLD": "0",
        "EARTH_ENGINE_SCALE_METERS": "1",
        "EARTH_ENGINE_MAX_PIXELS": "1",
        "GEMINI_API_KEY": "runtime-key",
        "GEMINI_MODEL": "runtime-model",
    }
    for variable, value in runtime.items():
        monkeypatch.setenv(variable, value)
    service = SatelliteService()
    monkeypatch.setattr(
        service,
        "_earth_engine_metrics",
        lambda request, token=None: (_ for _ in ()).throw(RuntimeError("disabled")),
    )
    with pytest.raises(SatelliteLiveError, match="Earth Engine query failed"):
        service.analyze(SatelliteAnalysisRequest.model_validate(analysis_payload()))


def test_federation_configuration_requires_all_runtime_values(monkeypatch) -> None:
    service = SatelliteService()
    monkeypatch.delenv("GCP_PROJECT_NUMBER", raising=False)
    monkeypatch.delenv("GCP_WORKLOAD_IDENTITY_POOL_ID", raising=False)
    monkeypatch.delenv("GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID", raising=False)
    monkeypatch.delenv("GCP_SERVICE_ACCOUNT_EMAIL", raising=False)
    with pytest.raises(RuntimeError, match="Vercel OIDC federation is not fully configured"):
        service._vercel_federated_credentials("test-token")
