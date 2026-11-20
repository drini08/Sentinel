# SENTINEL security core

The security core is the executable contract for authenticated gateway events, deterministic SCADA facility state, explainable risk assessments, incidents, adaptive firewall rules, identity containment, continuity verification, rollback, policy control, and immutable-in-application audit evidence.

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

Adaptive-defense tests additionally verify scoped firewall enforcement, automatic expiration, global-rule rejection, server-side revoke/restore with RBAC, and rollback when a legitimate continuity transaction fails.

## Operational API

- `GET /api/v1/dashboard`, `/detections`, `/incidents`, `/audit` expose live operational state.
- `POST /api/v1/events/ingest` requires `X-Sentinel-Ingestion-Token` (local default: `sentinel-sim-ingest`).
- `/api/v1/firewall/rules` creates, lists, expires, and removes enforced scoped rules.
- `/api/v1/sessions/{id}/revoke|restore` enforces identity containment server-side.
- `/api/v1/services` and `/health-checks` expose continuity state and verification history.
- `/api/v1/policies` controls ordered response thresholds and corroboration requirements.
- Mutating operator endpoints require `X-Operator-Role: operator` or `admin`.
- `POST /api/v1/simulations/rollback` proves continuity-triggered automatic rollback.

## Facility API

- `GET /api/v1/facility/snapshot` returns authoritative assets, metrics, positions, and pipe connections.
- `POST /api/v1/facility/assets/{asset_id}/commands` evaluates an operator command through SENTINEL before applying it.
- `POST /api/v1/facility/reset` restores the deterministic baseline.
- `POST /api/v1/facility/scenarios/compromised-operator` runs the stakeholder demonstration and verifies continuity.

The in-process engine deliberately models bounded operational state rather than hydraulic physics. Physical state changes only after an allowed gateway decision. A blocked command leaves pumps, valves, and water levels unchanged while marking the targeted asset with contained security state.
