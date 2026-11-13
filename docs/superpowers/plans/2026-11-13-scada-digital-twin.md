# SCADA Digital Twin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cinematic, interactive 3D water facility whose telemetry and controls are owned by the FastAPI backend and protected by SENTINEL.

**Architecture:** Add an in-process deterministic SCADA engine to the security core, expose snapshot/command/reset/scenario endpoints, and render the returned topology with React Three Fiber. All mutations become `RequestEvent` objects evaluated by `SecurityService`; only allowed decisions update facility state.

**Tech Stack:** Python 3.12, FastAPI, Pydantic, pytest, React 19, TypeScript 7, Vite 8, React Three Fiber, Drei, Three.js, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-13-scada-digital-twin-design.md`

## Global Constraints

- Facility state is authoritative in the backend; the frontend never mutates it optimistically.
- The v1 engine is deterministic and bounded, not a hydraulic-physics simulator.
- The scene contains three reservoirs plus intake, dosing, clarification, filtration, pumping, manifold, control, power, and distribution assets.
- Poll facility state once per second and prevent overlapping requests.
- Normal commands visibly update facility state; compromised commands are blocked and do not mutate state.
- Preserve selective containment: an unrelated legitimate session remains operational after the attack.
- Support reduced motion and responsive drawer behavior.
- Keep the Facility route lazy-loaded and cap WebGL device pixel ratio.

---

### Task 1: Facility Domain and Deterministic Engine

**Files:**
- Create: `backend/sentinel/facility/__init__.py`
- Create: `backend/sentinel/facility/models.py`
- Create: `backend/sentinel/facility/topology.py`
- Create: `backend/sentinel/facility/engine.py`
- Create: `backend/tests/test_facility_engine.py`

**Interfaces:**
- Produces: `FacilityEngine.snapshot() -> FacilitySnapshot`
- Produces: `FacilityEngine.apply(asset_id: str, command: AssetCommand) -> FacilityAsset`
- Produces: `FacilityEngine.reset() -> FacilitySnapshot`
- Produces: `build_facility_assets() -> dict[str, FacilityAsset]`

- [ ] **Step 1: Write failing topology and engine tests**

```python
def test_topology_contains_complete_small_water_facility() -> None:
    snapshot = FacilityEngine().snapshot()
    assert len([a for a in snapshot.assets if a.asset_type == "reservoir"]) == 3
    assert {"intake", "clarifier", "filter", "pump_station", "valve", "control", "power", "outlet"} <= {
        asset.asset_type for asset in snapshot.assets
    }

def test_reservoir_isolation_changes_flow_without_invalid_levels() -> None:
    engine = FacilityEngine()
    changed = engine.apply("reservoir-a", AssetCommand(action="isolate", value=True))
    assert changed.status == "isolated"
    assert changed.metrics["outflow_m3s"] == 0
    assert 0 <= changed.metrics["level_percent"] <= 100
```

- [ ] **Step 2: Run the tests and verify import failures**

Run: `.venv\Scripts\python.exe -m pytest backend\tests\test_facility_engine.py -q`
Expected: FAIL because `sentinel.facility` does not exist.

- [ ] **Step 3: Implement strict models, fixed topology, command validation, state cloning, and reset**

```python
class AssetCommand(StrictModel):
    action: Literal["open", "close", "start", "stop", "set_mode", "set_target", "isolate"]
    value: str | float | bool | None = None

class FacilityEngine:
    def snapshot(self) -> FacilitySnapshot:
        return FacilitySnapshot(
            revision=self._revision,
            assets=[asset.model_copy(deep=True) for asset in self._assets.values()],
            connections=FACILITY_CONNECTIONS,
        )

    def apply(self, asset_id: str, command: AssetCommand) -> FacilityAsset:
        asset = self.get(asset_id)
        handler = self._handlers.get((asset.asset_type, command.action))
        if handler is None:
            raise UnsupportedFacilityCommand(asset_id, command.action)
        handler(asset, command.value)
        self._revision += 1
        return asset.model_copy(deep=True)

    def reset(self) -> FacilitySnapshot:
        self._assets = build_facility_assets()
        self._revision += 1
        return self.snapshot()
```

- [ ] **Step 4: Run engine tests**

Run: `.venv\Scripts\python.exe -m pytest backend\tests\test_facility_engine.py -q`
Expected: all tests pass.

- [ ] **Step 5: Commit the domain slice**

```powershell
git add backend/sentinel/facility backend/tests/test_facility_engine.py
git commit -m "feat(backend): add deterministic facility engine"
```

### Task 2: SENTINEL-Protected Facility Commands and Scenario API

**Files:**
- Create: `backend/sentinel/facility/service.py`
- Create: `backend/tests/test_facility_api.py`
- Modify: `backend/sentinel/main.py`
- Modify: `backend/sentinel/simulation.py`
- Modify: `contracts/sentinel-api.yaml`

**Interfaces:**
- Consumes: `FacilityEngine.apply`, `FacilityEngine.snapshot`, `SecurityService.evaluate`
- Produces: `FacilityService.execute(asset_id, request) -> FacilityCommandResult`
- Produces: `FacilityService.run_compromised_operator() -> FacilityScenarioResult`
- Produces endpoints under `/api/v1/facility`

- [ ] **Step 1: Write failing API tests for snapshot, allowed command, blocked command, reset, and continuity**

```python
def test_compromised_command_is_blocked_without_mutating_facility() -> None:
    client = TestClient(create_app(":memory:"))
    before = client.get("/api/v1/facility/snapshot").json()
    result = client.post("/api/v1/facility/scenarios/compromised-operator").json()
    after = client.get("/api/v1/facility/snapshot").json()
    assert result["attack"]["applied"] is False
    assert result["continuity_verified"] is True
    assert asset(before, "pump-station")["status"] == asset(after, "pump-station")["status"]
```

- [ ] **Step 2: Run API tests and verify missing routes**

Run: `.venv\Scripts\python.exe -m pytest backend\tests\test_facility_api.py -q`
Expected: FAIL with `404` responses.

- [ ] **Step 3: Implement the command envelope and security translation**

```python
class FacilityCommandRequest(StrictModel):
    command: AssetCommand
    session: OperatorSession

class FacilityCommandResult(StrictModel):
    applied: bool
    asset: FacilityAsset
    decision: GatewayDecision

def execute(self, asset_id: str, request: FacilityCommandRequest) -> FacilityCommandResult:
    decision = self.security.evaluate(self._to_request_event(asset_id, request))
    asset = self.engine.apply(asset_id, request.command) if decision.allowed else self.engine.get(asset_id)
    return FacilityCommandResult(applied=decision.allowed, asset=asset, decision=decision)
```

- [ ] **Step 4: Register facility services once in `create_app` and expose four endpoints**

```python
application.state.facility = FacilityService(FacilityEngine(), security)
# GET snapshot, POST command, POST reset, POST compromised-operator
```

- [ ] **Step 5: Update the OpenAPI contract and run all backend tests**

Run: `.venv\Scripts\python.exe -m pytest backend\tests -q`
Expected: all backend tests pass.

- [ ] **Step 6: Commit the protected API slice**

```powershell
git add backend contracts/sentinel-api.yaml
git commit -m "feat(backend): expose protected facility API"
```

### Task 3: Frontend Facility Client and Polling State

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Create: `src/facility/types.ts`
- Create: `src/facility/api.ts`
- Create: `src/facility/useFacility.ts`
- Create: `src/facility/api.test.ts`
- Create: `src/facility/useFacility.test.tsx`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: `facilityApi.getSnapshot`, `facilityApi.executeCommand`, `facilityApi.reset`, `facilityApi.runScenario`
- Produces: `useFacility()` with `snapshot`, `selectedAsset`, `selectAsset`, `executeCommand`, `runScenario`, `isStale`, and `error`

- [ ] **Step 1: Add Vitest, jsdom, Testing Library, Three.js, React Three Fiber, Drei, and postprocessing dependencies**

Run: `npm.cmd install three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing && npm.cmd install -D vitest jsdom @testing-library/react @testing-library/jest-dom @types/three`
Expected: lockfile updates without audit vulnerabilities.

- [ ] **Step 2: Write failing API mapping and non-overlapping polling tests**

```tsx
it("keeps the last snapshot and marks it stale when refresh fails", async () => {
  server.snapshot.mockResolvedValueOnce(facilitySnapshot).mockRejectedValueOnce(new Error("offline"));
  const { result } = renderHook(() => useFacility({ pollMs: 1000 }));
  await waitFor(() => expect(result.current.snapshot).toEqual(facilitySnapshot));
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(result.current.snapshot).toEqual(facilitySnapshot);
  expect(result.current.isStale).toBe(true);
});
```

- [ ] **Step 3: Run tests and verify missing modules**

Run: `npm.cmd test -- --run src/facility`
Expected: FAIL because facility modules do not exist.

- [ ] **Step 4: Implement typed fetch helpers and the polling hook**

```ts
export const facilityApi = {
  getSnapshot: () => request<FacilitySnapshot>("/api/v1/facility/snapshot"),
  executeCommand: (assetId: string, body: FacilityCommandRequest) =>
    request<FacilityCommandResult>(`/api/v1/facility/assets/${assetId}/commands`, { method: "POST", body }),
};
```

- [ ] **Step 5: Run frontend data tests**

Run: `npm.cmd test -- --run src/facility`
Expected: all data-layer tests pass.

- [ ] **Step 6: Commit the frontend data slice**

```powershell
git add package.json package-lock.json vite.config.ts src/facility src/test
git commit -m "feat(web): add facility data client"
```

### Task 4: Cinematic 3D Facility Scene

**Files:**
- Create: `src/facility/FacilityScene.tsx`
- Create: `src/facility/FacilityWorld.tsx`
- Create: `src/facility/assets/Reservoir.tsx`
- Create: `src/facility/assets/ProcessAsset.tsx`
- Create: `src/facility/assets/PipeNetwork.tsx`
- Create: `src/facility/scene.test.tsx`

**Interfaces:**
- Consumes: `FacilitySnapshot`, selected asset id, and `onSelect(assetId | null)`
- Produces: lazy-loadable `<FacilityScene />` with constrained camera and code-native geometry

- [ ] **Step 1: Write failing scene contract tests with the WebGL canvas mocked**

```tsx
it("renders every backend asset as a selectable scene object", () => {
  render(<FacilityWorld snapshot={facilitySnapshot} selectedId={null} onSelect={onSelect} />);
  expect(screen.getAllByTestId("facility-asset")).toHaveLength(facilitySnapshot.assets.length);
});
```

- [ ] **Step 2: Run the scene tests and verify missing components**

Run: `npm.cmd test -- --run src/facility/scene.test.tsx`
Expected: FAIL because the scene components do not exist.

- [ ] **Step 3: Implement reservoirs, treatment assets, pumps, valves, buildings, and animated pipes as focused components**

```tsx
<group position={asset.position} onClick={(event) => { event.stopPropagation(); onSelect(asset.id); }}>
  <mesh castShadow receiveShadow>{/* code-native geometry */}</mesh>
  <Html center distanceFactor={14}>{asset.name}</Html>
</group>
```

- [ ] **Step 4: Implement the canvas, lighting, environment, floor grid, bloom, constrained orbit controls, reduced motion, and DPR cap**

```tsx
<Canvas dpr={[1, 1.5]} camera={{ position: [15, 13, 19], fov: 42 }} shadows>
  <FacilityWorld
    snapshot={snapshot}
    selectedId={selectedId}
    onSelect={onSelect}
    reducedMotion={reducedMotion}
  />
  <OrbitControls minDistance={12} maxDistance={34} maxPolarAngle={Math.PI / 2.15} />
</Canvas>
```

- [ ] **Step 5: Run scene tests and production build**

Run: `npm.cmd test -- --run src/facility/scene.test.tsx; npm.cmd run build`
Expected: tests and TypeScript/Vite build pass.

- [ ] **Step 6: Commit the 3D scene**

```powershell
git add src/facility
git commit -m "feat(web): render cinematic facility twin"
```

### Task 5: Facility Page, Controls, and Navigation

**Files:**
- Create: `src/facility/AssetDrawer.tsx`
- Create: `src/facility/FacilityStatus.tsx`
- Create: `src/pages/Facility.tsx`
- Create: `src/pages/Facility.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Shell.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `useFacility`, `FacilityScene`, and facility API command types
- Produces: `/facility` route and primary navigation entry

- [ ] **Step 1: Write failing interaction tests for selection, command controls, blocked feedback, stale state, and scenario launch**

```tsx
it("opens controls for a selected reservoir and submits an isolate command", async () => {
  render(<Facility />);
  await user.click(screen.getByRole("button", { name: /reservoir a/i }));
  await user.click(screen.getByRole("button", { name: /isolate reservoir/i }));
  expect(api.executeCommand).toHaveBeenCalledWith("reservoir-a", expect.objectContaining({
    command: { action: "isolate", value: true },
  }));
});
```

- [ ] **Step 2: Run the page tests and verify failures**

Run: `npm.cmd test -- --run src/pages/Facility.test.tsx`
Expected: FAIL because the page and controls do not exist.

- [ ] **Step 3: Implement the status strip, contextual drawer, asset controls, command feedback, reset, and scenario action**

```tsx
<AssetDrawer
  asset={selectedAsset}
  disabled={isStale || commandPending}
  onCommand={executeCommand}
/>
```

- [ ] **Step 4: Add lazy routing, navigation, responsive layout, and reduced-motion styles**

```tsx
const Facility = lazy(() => import("./pages/Facility").then((module) => ({ default: module.Facility })));
<Route path="facility" element={<Suspense fallback={<FacilityLoading />}><Facility /></Suspense>} />
```

- [ ] **Step 5: Run page tests, all frontend tests, and the build**

Run: `npm.cmd test -- --run; npm.cmd run build`
Expected: all tests and build pass.

- [ ] **Step 6: Commit the integrated Facility page**

```powershell
git add src
git commit -m "feat(web): add interactive facility command center"
```

### Task 6: Unified Demo Flow, Documentation, and Final Verification

**Files:**
- Modify: `src/pages/Lab.tsx`
- Modify: `README.md`
- Modify: `backend/README.md`
- Create: `backend/tests/test_facility_demo.py`
- Modify: `docs/superpowers/plans/2026-11-13-scada-digital-twin.md`

**Interfaces:**
- Consumes: the facility scenario endpoint and existing incident/activity endpoints
- Produces: one repeatable demonstration shared by Lab and Facility

- [ ] **Step 1: Write a failing full demonstration test**

```python
def test_demo_changes_normal_state_blocks_attack_and_preserves_continuity() -> None:
    client = TestClient(create_app(":memory:"))
    allowed = command(client, "valve-manifold", LEGITIMATE_SESSION, "close")
    attack = client.post("/api/v1/facility/scenarios/compromised-operator").json()
    incidents = client.get("/api/v1/incidents").json()
    assert allowed["applied"] is True
    assert attack["attack"]["applied"] is False
    assert attack["continuity_verified"] is True
    assert len(incidents) == 1
```

- [ ] **Step 2: Run the demo test and verify the missing integration behavior**

Run: `.venv\Scripts\python.exe -m pytest backend\tests\test_facility_demo.py -q`
Expected: FAIL until the scenario and command helpers expose the complete flow.

- [ ] **Step 3: Complete the shared scenario behavior and replace Lab's timer-only simulation with the real endpoint**

```tsx
const result = await facilityApi.runScenario();
setSteps(result.steps);
```

- [ ] **Step 4: Document setup, both servers, facility controls, and the stakeholder demo sequence**

```text
Terminal 1: .venv\Scripts\python.exe -m uvicorn sentinel.main:app --app-dir backend --reload --port 8000
Terminal 2: npm.cmd run dev
Open: http://127.0.0.1:5173/facility
```

- [ ] **Step 5: Run complete verification**

Run: `.venv\Scripts\python.exe -m pytest backend\tests -q; npm.cmd test -- --run; npm.cmd run build; git diff --check; git status --short`
Expected: all tests pass, build succeeds, no whitespace errors, and only the plan checkbox updates remain.

- [ ] **Step 6: Mark plan tasks complete and commit**

```powershell
git add README.md backend/README.md backend/tests src/pages/Lab.tsx docs/superpowers/plans/2026-11-13-scada-digital-twin.md
git commit -m "docs: complete SCADA digital twin demo"
```

- [ ] **Step 7: Push verified `main`**

Run: `git push origin main`
Expected: GitHub `main` advances to the final verified commit.
