# SENTINEL security core

The security core is the executable contract for gateway events, deterministic SCADA facility state, explainable risk assessments, incidents, and selective containment.

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

## Facility API

- `GET /api/v1/facility/snapshot` returns authoritative assets, metrics, positions, and pipe connections.
- `POST /api/v1/facility/assets/{asset_id}/commands` evaluates an operator command through SENTINEL before applying it.
- `POST /api/v1/facility/reset` restores the deterministic baseline.
- `POST /api/v1/facility/scenarios/compromised-operator` runs the stakeholder demonstration and verifies continuity.

The in-process engine deliberately models bounded operational state rather than hydraulic physics. Physical state changes only after an allowed gateway decision. A blocked command leaves pumps, valves, and water levels unchanged while marking the targeted asset with contained security state.
