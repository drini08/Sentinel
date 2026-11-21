from __future__ import annotations

import base64

from fastapi.testclient import TestClient

from sentinel.main import create_app


def test_visual_inspection_reports_configuration(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    client = TestClient(create_app(tmp_path / "sentinel.db"))

    response = client.get("/api/v1/visual-inspection/status")

    assert response.status_code == 200
    assert response.json()["configured"] is False


def test_visual_inspection_requires_gemini(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    client = TestClient(create_app(tmp_path / "sentinel.db"))

    response = client.post("/api/v1/visual-inspection/analyze", json={
        "filename": "pump.jpg",
        "mime_type": "image/jpeg",
        "image_base64": base64.b64encode(b"small-image-placeholder").decode(),
        "context": "Pump station intake",
    })

    assert response.status_code == 503
    assert response.json()["detail"] == "Gemini visual inspection is not configured"

