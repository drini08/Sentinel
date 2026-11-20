# SENTINEL

AI-assisted cybersecurity for critical infrastructure. SENTINEL detects suspicious behavior, explains risk, and selectively contains malicious sessions while legitimate services remain available.

## Run the complete demo

SENTINEL includes a React operator console, an interactive 3D water-facility digital twin, and a modular Python security core with deterministic SCADA state. The complete lifecycle is executable locally: monitor → detect → assess → contain → verify → recover.

Install dependencies once:

```powershell
python3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -e ".\backend[dev]"
npm.cmd install
```

Start the backend in the first terminal:

```powershell
.venv\Scripts\python.exe -m uvicorn sentinel.main:app --app-dir backend --reload --port 8000
```

Start the frontend in a second terminal:

```powershell
npm.cmd run dev
```

Open `http://127.0.0.1:5173/`.

The console exposes live backend state across Overview, Threat Intelligence, Incidents, Defense Control, Infrastructure, Activity & Audit, Settings, the Facility twin, and Simulation Lab. **Run attack demo** establishes normal behavior, attempts a compromised pump command, displays the explainable block, restricts only the malicious session/source, and verifies that an independent legitimate command still succeeds. **Run rollback test** creates an intentionally harmful scoped rule, detects a failed continuity transaction, and automatically reverts it.

## Verification

```powershell
.venv\Scripts\python.exe -m pytest backend\tests -q
npm.cmd test -- --run
npm.cmd run build
```

## Implemented defense controls

The service in `backend/` provides authenticated event ingestion, explainable hybrid scoring, incident correlation, server-side session revocation, enforced IP/endpoint gateway rules, expiration, manual overrides, post-enforcement health checks, automatic rollback, role-gated administration, policy thresholds, and append-only application audit history. It uses SQLite for the self-contained demo while keeping persistence behind `EvidenceStore`; production PostgreSQL/Django migration remains an infrastructure deployment concern rather than a demo dependency. See `backend/README.md` for API details.
