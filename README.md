# SENTINEL

AI-assisted cybersecurity for critical infrastructure. SENTINEL detects suspicious behavior, explains risk, and selectively contains malicious sessions while legitimate services remain available.

## Run the complete demo

SENTINEL includes a React operator console, an interactive 3D water-facility digital twin, and a modular FastAPI security core with deterministic SCADA state. The complete lifecycle runs locally: monitor → detect → assess → contain → verify → recover.

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

The console exposes live backend state across Overview, Facility, Threats, Incidents, Defense, Services, Policies, Logs, and Simulation Lab. The Facility contains three reservoirs, raw-water intake, chemical dosing, clarification, filtration, pumping, distribution controls, operations, and backup power.

For the complete visible demonstration: **Run attack demo** → inspect **Threats** → open the **Incident** evidence → inspect the scoped **Defense** rule → verify **Services** continuity → **Run rollback test** → inspect the **Logs** audit evidence. The scenario restricts only the malicious session/source, proves an independent legitimate facility operation still succeeds, and visibly reverts a deliberately overrestrictive rule.

`X-Operator-Role`, `X-Operator-Id`, and the default ingestion token are local simulation controls. They demonstrate authorization boundaries but are not production authentication.

## Verification

```powershell
.venv\Scripts\python.exe -m pytest backend\tests -q
npm.cmd test -- --run src
npm.cmd run build
```

## Implemented defense controls

The service in `backend/` provides authenticated event ingestion, explainable hybrid scoring, incident correlation, server-side session revocation, enforced IP/endpoint gateway rules, expiration, manual overrides, post-enforcement health checks, automatic rollback, role-gated administration, policy thresholds, and append-only application audit history. It uses SQLite for the self-contained demo while keeping persistence behind `EvidenceStore`. See `backend/README.md` for API details.
# Vercel deployment

The repository deploys as one Vercel project with two services:

- The Vite operator console at the project’s `.vercel.app` root.
- FastAPI under the same origin at `/api/*`.
- The public jury attack console at `/attack`.

Import the GitHub repository into Vercel and add a managed PostgreSQL integration before the production deployment. The integration must expose `DATABASE_URL`; it stores jury simulation state so the phone and operator console share the same event across function instances.

Copy `.env.example` to `.env.local` for local overrides. In Vercel, configure `DATABASE_URL` for Production and Preview. Keep `VITE_SENTINEL_API_URL` empty when the frontend and API use this repository's same-origin rewrites. Add `SENTINEL_CORS_ORIGINS` only for a separate frontend origin or LAN preview.

`VITE_PUBLIC_APP_URL` is optional. When omitted, the QR code uses the active deployment origin automatically. Set it to the final production `.vercel.app` URL if preview deployments should always display the production QR.

Run the production topology locally with Vercel CLI 48.1.8 or newer:

```powershell
vercel dev -L
```
