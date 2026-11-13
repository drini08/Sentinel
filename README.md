# SENTINEL

AI-assisted cybersecurity for critical infrastructure. SENTINEL detects suspicious behavior, explains risk, and selectively contains malicious sessions while legitimate services remain available.

## Run the complete demo

SENTINEL now includes a React operator console, an interactive 3D water-facility digital twin, and a FastAPI security core with deterministic SCADA state.

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

Open `http://127.0.0.1:5173/facility`.

The Facility page contains three reservoirs, raw-water intake, chemical dosing, clarification, filtration, pumping, distribution controls, operations, and backup power. Click an asset to inspect backend-owned telemetry and issue controls. **Run attack demo** establishes normal behavior, attempts a compromised pump command, displays the explainable block, and verifies that an independent legitimate command still succeeds.

## Verification

```powershell
.venv\Scripts\python.exe -m pytest backend\tests -q
npm.cmd test -- --run
npm.cmd run build
```

## Security core

The FastAPI service in `backend/` provides the gateway event contract, deterministic facility engine, explainable risk scoring, SQLite evidence storage, selective session containment, and repeatable compromised-operator scenario. See `backend/README.md` for API details.
