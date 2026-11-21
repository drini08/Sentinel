# Jury Attack Console Design

## Purpose

Add a public, presentation-ready attack console that lets a jury trigger controlled cyberattack simulations and immediately see Sentinel defend the shared water-facility digital twin.

The deployed entry points are:

- The production `.vercel.app` origin for the operator platform.
- The `/attack` path on that same production origin for the jury console and QR destination.

The jury flow has no account, login, or PIN. Scanning the QR opens the attack controls directly.

## Experience

The attack console is visually distinct from the operator platform and optimized for phones. It presents three predefined attack vectors:

1. Sensor spoofing: corrupts facility telemetry and tests anomaly detection.
2. Command injection: attempts an unsafe control command and tests command containment.
3. Compromised operator: simulates hostile authenticated activity and tests adaptive access restriction.

Each control runs a real backend simulation. The jury sees a concise attack progression and outcome while the operator console shows the same event, affected facility assets, defensive actions, and restored continuity. Arbitrary commands, targets, and payloads are never exposed.

The operator platform includes a presentation panel that displays the deployment-aware QR code, a copyable attack URL, current demo status, connected jury clients, and a reset control.

## Architecture

The existing Vite application gains a public `/attack` route outside the authenticated operator shell. The route and QR use a canonical public application URL derived from `VITE_PUBLIC_APP_URL`, with `window.location.origin` as the safe deployment fallback.

FastAPI gains a narrow jury API separated from operator endpoints. It accepts only allowlisted scenario identifiers, creates a shared simulation event, invokes the existing defense services, and returns a presentation-safe timeline. The operator UI observes the same backend state through short polling, avoiding a WebSocket dependency for the first deployable version.

The production deployment cannot use the repository's SQLite file as shared state because Vercel Functions provide only temporary writable storage. The persistence boundary will support a managed PostgreSQL connection through `DATABASE_URL`, while retaining SQLite for local development and tests. No production secret is exposed through Vite variables.

## API Boundary

The public API supports only these actions:

- Read the current demo status.
- Trigger one of the three predefined simulations.
- Read the public result for the triggered simulation.

Requests are rate-limited, duplicate triggers are rejected while a scenario is running, and all public inputs are schema-validated. Public responses exclude operator identities, policies, internal evidence details, database identifiers, and stack traces.

Operator-only APIs retain the existing role headers and add reset and presentation-status operations. Resetting creates a clean baseline without deleting audit evidence.

## Shared State and Synchronization

Every run has a generated run identifier, scenario type, lifecycle status, timestamps, affected assets, defensive actions, and continuity result. State transitions are persisted so that separate jury and operator devices see the same run even when requests reach different Vercel Function instances.

The jury console polls its active run until completion. The operator facility and presentation panel poll the current demo status and refresh their existing facility snapshot when the run changes. A failed or slow request remains retryable and never leaves the interface falsely claiming success.

## QR Code

The QR encodes the production `.vercel.app` origin followed by `/attack`. It is generated in the frontend from the canonical public URL, so preview and production deployments do not require committed domain names. A visible URL and copy button provide a fallback for cameras or restricted devices.

## Deployment Configuration

The Vercel deployment requires:

- `VITE_PUBLIC_APP_URL` for the canonical production URL.
- `VITE_SENTINEL_API_URL` when the API is hosted at a different origin; same-origin `/api` is preferred.
- `DATABASE_URL` for managed PostgreSQL.
- Server-only rate-limit and signing secrets if the selected persistence provider requires them.
- CORS restricted to the deployed frontend origin when the API is cross-origin.

The repository will include Vercel routing and Python entry-point configuration so client-side routes such as `/attack` survive direct navigation and refresh.

## Error Handling

The jury console distinguishes unavailable service, rate limiting, an already-running scenario, and failed simulation. It offers retry without duplicating a successful request. The operator console shows a disconnected indicator when it cannot confirm shared state. Backend errors use stable public error codes and log internal details only on the server.

## Verification

Automated backend tests cover the public allowlist, schema rejection, rate limiting, concurrent-trigger rejection, persistence, scenario completion, and response redaction. Frontend tests cover direct `/attack` routing, mobile controls, QR URL construction, run progress, retry behavior, and operator synchronization. A production-build check verifies Vercel routing and environment fallbacks. The final manual test uses two devices: one scans the QR and launches each scenario while the other watches the operator facility react and recover.

## Scope Boundaries

This feature is a controlled demonstration surface, not a general penetration-testing tool. It does not expose arbitrary payloads, real PLC commands, unrestricted targets, public operator APIs, accounts, payments, or permanent jury profiles.
