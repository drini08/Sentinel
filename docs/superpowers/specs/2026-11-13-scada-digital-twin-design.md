# SENTINEL SCADA Digital Twin Design

## Purpose

Build a stakeholder-ready demonstration in which a visually rich, browser-based 3D water facility is driven by backend SCADA state. Operators can inspect and control facility assets, while every control request passes through SENTINEL for explainable authorization, detection, incident creation, and selective containment.

The experience should make SENTINEL's value understandable within one minute: the facility is operating normally, a compromised operator attempts a dangerous command, SENTINEL blocks only that session, and legitimate operations continue visibly.

## Selected Direction

Use a cinematic dark command-center digital twin as a dedicated **Facility** page. The 3D scene occupies most of the viewport. Selecting an asset opens a contextual control drawer without obscuring the overall facility.

The first version uses an in-process SCADA simulation module inside the existing FastAPI security core. This is preferred over a separate service because it keeps setup and demonstration reliable while retaining module boundaries that can later be extracted behind the same API contract.

Rejected alternatives:

- A frontend-only simulation would look convincing but would not demonstrate real security enforcement.
- A separate SCADA microservice would improve deployment realism but add orchestration and failure modes without improving the first stakeholder demonstration.

## Facility Topology

The small facility contains enough connected equipment to feel operational rather than decorative:

- Raw-water intake basin and intake valve
- Three reservoirs with independently changing levels
- Coagulation and chemical-dosing unit
- Two circular clarifiers
- Filtration building
- High-lift pump station with three pumps
- Distribution valve manifold
- Operations/control building
- Backup generator
- Municipal distribution outlet
- A connected pipe network with animated flow direction

Every selectable asset has an identifier, type, display name, operating status, security status, metrics, and supported commands. Reservoirs expose level, capacity, inflow, outflow, and isolation controls. Pumps expose mode, utilization, and start/stop controls. Valves expose position and open/close controls. Process buildings are inspectable but have only the controls needed for the demonstration.

## Architecture

### Backend

Add a focused `facility` package to the existing Python backend:

- `models.py` defines facility snapshots, assets, metrics, commands, and command results.
- `topology.py` owns the fixed facility layout and asset relationships.
- `engine.py` owns deterministic state transitions and time-based metric updates.
- `service.py` translates operator commands into SENTINEL gateway events, applies allowed commands, and records blocked commands.

The simulation is deterministic and lightweight, not a hydraulic-physics engine. State changes use bounded rules so water levels and flow rates remain believable and reproducible during demos.

Expose these endpoints under `/api/v1/facility`:

- `GET /snapshot` returns the complete facility state and topology.
- `POST /assets/{asset_id}/commands` evaluates and conditionally applies an operator command.
- `POST /reset` restores the deterministic baseline.
- `POST /scenarios/compromised-operator` runs the stakeholder attack sequence against live facility state.

The existing incident and activity endpoints remain the source of security evidence. Polling the snapshot once per second is sufficient for the first version and avoids introducing WebSocket lifecycle complexity.

### Frontend

Add a `Facility` route and navigation item. Use React Three Fiber and Drei for the scene, camera controls, selection, labels, and reusable 3D primitives. Build the facility from code-native geometry rather than external 3D files so the repository remains self-contained and easy to modify.

Frontend units remain isolated:

- `facility/api.ts` owns typed backend calls.
- `facility/types.ts` mirrors the API contract.
- `facility/useFacility.ts` owns polling, selection, commands, and scenario state.
- `facility/FacilityScene.tsx` renders the overall 3D world.
- Small asset components render reservoirs, clarifiers, buildings, pumps, valves, and pipes.
- `facility/AssetDrawer.tsx` renders metrics and permitted controls for the selected asset.
- `pages/Facility.tsx` composes the scene, status strip, drawer, and scenario controls.

## Visual and Interaction Design

The scene uses matte charcoal industrial geometry, cyan water and normal flow, amber degraded states, and red security threats. Lighting combines a cool environment light, restrained emissive accents, soft shadows, subtle bloom, and a faint floor grid. The camera begins at a cinematic isometric angle with constrained orbit and zoom.

Interaction rules:

- Hovering highlights an asset and reveals its short label.
- Clicking selects the asset, eases the camera toward it, and opens the contextual drawer.
- Clicking empty space returns to the facility overview.
- Animated pipe flow reflects actual backend flow and valve state.
- Commands show pending, allowed, or blocked feedback next to the affected asset.
- During an attack, the suspicious route pulses red, the blocked asset is outlined, and containment propagates back to the compromised session while unaffected flows remain cyan.
- Reduced-motion users receive state changes without camera easing, pulsing, or continuous decorative animation.

The scene remains usable at laptop sizes. On narrow screens the drawer becomes a bottom sheet and expensive effects are reduced.

## Demonstration Flow

1. The Facility page opens on normal operation with moving water and live metrics.
2. The presenter clicks reservoirs, pumps, and valves to show backend-backed telemetry and controls.
3. A legitimate valve or pump command succeeds and the physical state visibly changes.
4. The presenter starts **Compromised operator**.
5. The compromised session establishes normal behavior, then attempts an administrative pump or valve override from an unrecognized context.
6. SENTINEL displays the risk signals, blocks the command, creates an incident, and restricts only the suspicious session.
7. A legitimate operator command succeeds immediately afterward, proving continuity.

The existing Simulation Lab should launch the same backend scenario rather than maintain a separate fake timer sequence.

## Data and Security Flow

1. The frontend sends an asset command with operator session context.
2. The facility service creates a `RequestEvent` representing that control request.
3. `SecurityService.evaluate` returns an explainable gateway decision.
4. If allowed, the facility engine applies the command and returns the updated asset state.
5. If blocked, facility state remains unchanged and the response includes the incident and containment evidence.
6. The next snapshot updates the scene, asset drawer, activity feed, and incident views.

The frontend never decides whether a control is authorized and never mutates authoritative facility state locally.

## Error Handling

- Unknown assets and unsupported commands return typed `404` and `422` responses.
- Blocked security decisions return a successful command-result envelope with `applied: false`, not a transport failure.
- Backend unavailability keeps the last snapshot visible, marks data as stale, disables controls, and offers retry.
- Polling requests do not overlap; a slow response skips the next interval.
- The engine clamps all simulated metrics to safe ranges and rejects invalid command parameters.

## Testing

Backend tests cover topology integrity, deterministic state updates, valid and invalid commands, blocked compromised commands, persistence of incident evidence, reset behavior, and continued legitimate access after containment.

Frontend tests cover API mapping, polling state, selection and drawer behavior, command feedback, stale-data handling, and the scenario transition sequence. The production build remains a required verification step.

One end-to-end demonstration test verifies that a command changes a visible asset metric, the compromised command is blocked without changing facility state, an incident appears, and a legitimate command still succeeds.

## Performance and Scope Boundaries

Target smooth interaction on a typical stakeholder laptop. Use instancing or merged geometry for repeated small objects, cap device pixel ratio, pause decorative motion when the tab is hidden, and lazy-load the Facility route so the existing console remains fast.

The first version does not include real PLC protocols, external 3D model files, multi-user synchronization, historical replay, hydraulic simulation, geographic maps, or integration with a production SCADA system. The API boundaries leave room for these later without burdening the demonstration.

## Completion Criteria

- `main` contains the backend SCADA simulation and the interactive Facility page.
- At least three reservoirs and the supporting treatment, pumping, valve, intake, control, and power assets are visible.
- Reservoirs, pumps, and valves are selectable and expose backend-backed controls.
- Normal commands visibly change facility state.
- The compromised-operator scenario produces an explainable block and selective containment.
- Legitimate operations visibly continue after containment.
- Backend tests, frontend tests, the production build, and the end-to-end demonstration pass.
