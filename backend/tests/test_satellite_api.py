from fastapi.testclient import TestClient

from sentinel.main import create_app
from sentinel.satellite import SatelliteService


POLYGON = [
    [21.3007, 42.8145],
    [21.3204, 42.8072],
    [21.3418, 42.8168],
]


def test_satellite_status_uses_demo_mode_without_credentials(monkeypatch) -> None:
    monkeypatch.delenv("EARTH_ENGINE_PROJECT", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    client = TestClient(create_app(":memory:"))

    response = client.get("/api/v1/satellite/status")

    assert response.status_code == 200
    assert response.json() == {
        "earth_engine_configured": False,
        "gemini_configured": False,
        "mode": "demo",
        "dataset": "COPERNICUS/S2_SR_HARMONIZED",
    }


def test_satellite_analysis_compares_polygon_evidence_with_scada(monkeypatch) -> None:
    monkeypatch.delenv("EARTH_ENGINE_PROJECT", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    client = TestClient(create_app(":memory:"))

    response = client.post("/api/v1/satellite/analyze", json={
        "name": "Batlava Reservoir",
        "polygon": POLYGON,
        "baseline_start": "2025-06-01",
        "baseline_end": "2025-08-31",
        "current_start": "2026-06-01",
        "current_end": "2026-08-31",
        "scada_level_percent": 82,
    })

    assert response.status_code == 200
    result = response.json()
    assert result["source"] == "demo"
    assert result["explanation_source"] == "deterministic"
    assert result["mismatch_detected"] is True
    assert result["change_percent"] < -8
    assert result["imagery_dataset"] == "COPERNICUS/S2_SR_HARMONIZED"
    assert "SCADA reports 82%" in result["observation"]


def test_gemini_structured_explanation_is_flattened_for_operators() -> None:
    assert SatelliteService._operator_text({
        "summary": "Water extent declined.",
        "details": ["SCADA remains high.", "Check telemetry."],
    }) == "Water extent declined.; SCADA remains high.; Check telemetry."
