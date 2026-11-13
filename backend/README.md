# SENTINEL security core

The security core is the executable contract for gateway events, explainable risk assessments, incidents, and selective containment.

## Local setup

From the repository root:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -e ".\backend[dev]"
.venv\Scripts\python -m uvicorn sentinel.main:app --app-dir backend --reload --port 8000
```

Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

## Verification

```powershell
.venv\Scripts\python -m pytest backend/tests
```

The primary integration test verifies that a compromised employee session receives a simulated `403`, an independent legitimate session receives `200`, and the incident evidence is retained.
