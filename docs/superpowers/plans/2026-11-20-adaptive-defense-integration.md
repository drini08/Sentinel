# Adaptive Defense Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the adaptive-defense lifecycle from `origin/codex/sentinel-v2` into `main` while preserving the approved white/grey hybrid design, cinematic Overview, and 3D Facility.

**Architecture:** Selectively port the contributor's backend domain and API, then expose it through a shared typed React client. Adapt the contributor's behavior into the existing pages and semantic design classes instead of merging its frontend wholesale. The FastAPI service remains authoritative for rule safety, RBAC, state changes, audit evidence, and continuity rollback.

**Tech Stack:** Python 3.12, FastAPI, Pydantic 2, SQLite, pytest, React 19, TypeScript 7, React Router 7, Tailwind CSS 4, Vitest 5, Testing Library, Vite 8

**Spec:** `docs/superpowers/specs/2026-11-20-adaptive-defense-integration-design.md`

## Global Constraints

- Preserve `theme-hybrid`, the white/grey page surfaces, muted navy and burgundy accents, and the current global scale behavior.
- Preserve the current Overview content hierarchy and network visualization.
- Preserve the current Facility digital twin and its dark cinematic canvas.
- New pages must reuse existing `panel`, `PageHeader`, `Status`, table, button, form, and responsive patterns.
- Do not add production authentication claims; fixed operator headers and ingestion token remain explicitly local simulation controls.
- Keep attack behavior synthetic and local.
- Do not replace SQLite or add an external firewall dependency.

---

### Task 1: Adaptive-defense backend vertical slice

**Files:**
- Create: `backend/sentinel/defense.py`
- Create: `backend/tests/test_adaptive_defense.py`
- Modify: `backend/sentinel/models.py`
- Modify: `backend/sentinel/store.py`
- Modify: `backend/sentinel/detection.py`
- Modify: `backend/sentinel/security.py`
- Modify: `backend/sentinel/main.py`

**Interfaces:**
- Consumes: existing `RequestEvent`, `RiskAssessment`, `Incident`, `EvidenceStore`, and `SecurityService` behavior.
- Produces: `DefenseService`, `UnsafeRule`, `RuleCreate`, `FirewallRule`, `SessionProfile`, `ProtectedService`, `HealthCheck`, `Policy`, audit persistence, and the operational endpoints under `/api/v1`.

- [ ] **Step 1: Add the contributor's backend acceptance tests before implementation**

Inspect the reviewed source test:

```powershell
git show origin/codex/sentinel-v2:backend/tests/test_adaptive_defense.py
```

Create the file with `apply_patch`. It must contain the five source-branch tests named `test_scoped_firewall_rule_is_enforced_for_matching_ip_only`, `test_overrestrictive_rule_is_rolled_back_and_audited`, `test_expired_rule_is_not_enforced`, `test_unsafe_global_rule_is_rejected`, and `test_operator_can_revoke_and_restore_session_with_rbac` without weakening their assertions. Add API tests asserting that `/api/v1/events/ingest` rejects a missing token with `401`, ordered policy thresholds reject `moderate > high` with `422`, and blocking `/api/v1/facility/snapshot` rejects the rule with `422`.

- [ ] **Step 2: Run the new tests and verify the expected red state**

Run:

```powershell
python -m pytest backend/tests/test_adaptive_defense.py -q
```

Expected: collection fails because `sentinel.defense` and its new models do not exist on `main`.

- [ ] **Step 3: Port the backend implementation from the reviewed source branch**

Inspect the exact source delta:

```powershell
git diff origin/main...origin/codex/sentinel-v2 -- backend/sentinel/defense.py backend/sentinel/models.py backend/sentinel/store.py backend/sentinel/detection.py backend/sentinel/security.py backend/sentinel/main.py
```

Port that delta with `apply_patch`. Retain the current facility imports and endpoints in `main.py`. Confirm that the port provides these exact safety rules in `DefenseService._validate_scope`:

```python
forbidden = {"*", "0.0.0.0/0", "::/0", "/", "all", "authenticated-users"}
if target in forbidden:
    raise UnsafeRule("Infrastructure-wide and all-user rules are prohibited")
if request.target_type == "endpoint" and target in {"/health", "/api/v1/facility/snapshot"}:
    raise UnsafeRule("SENTINEL health and essential control-plane endpoints cannot be blocked")
```

Confirm that mutation endpoints call `require_operator`, continuity failure changes a rule to `ROLLED_BACK`, and `SecurityService.evaluate` checks active scoped rules before allowing a request.

- [ ] **Step 4: Run focused and existing backend tests**

Run:

```powershell
python -m pytest backend/tests/test_adaptive_defense.py backend/tests/test_attack_flow.py backend/tests/test_facility_api.py -q
```

Expected: all tests pass; the existing compromised-session and facility contracts remain valid.

- [ ] **Step 5: Commit the backend vertical slice**

```powershell
git add backend/sentinel backend/tests/test_adaptive_defense.py
git commit -m "feat(backend): add adaptive defense lifecycle"
```

---

### Task 2: Shared API contract and typed frontend client

**Files:**
- Create: `src/api.ts`
- Create: `src/api.test.tsx`
- Modify: `contracts/sentinel-api.yaml`

**Interfaces:**
- Consumes: Task 1 endpoints and JSON models.
- Produces: `usePolling<T>(path, fallback, interval?)`, `sentinelApi`, and exported types `Detection`, `ApiIncident`, `FirewallRule`, `Session`, `ProtectedService`, `HealthCheck`, `AuditEntry`, `Dashboard`, and `Policy`.

- [ ] **Step 1: Write failing polling and mutation-header tests**

Create `src/api.test.tsx` with:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { sentinelApi, usePolling } from "./api";

afterEach(() => vi.restoreAllMocks());

it("polls backend data and reports a connected state", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([{ rule_id: "rule-1" }]), { status: 200 }));
  const { result } = renderHook(() => usePolling("/api/v1/firewall/rules", [], 60_000));
  await waitFor(() => expect(result.current.connected).toBe(true));
  expect(result.current.data).toEqual([{ rule_id: "rule-1" }]);
});

it("sends explicit simulation operator identity on mutations", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ rule_id: "rule-1" }), { status: 200 }));
  await sentinelApi.createRule({ target_type: "ip", target_value: "203.0.113.44", action: "block", justification: "Confirmed synthetic source.", duration_seconds: 900 });
  const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
  expect(headers.get("X-Operator-Role")).toBe("operator");
  expect(headers.get("X-Operator-Id")).toBe("console-operator");
});
```

- [ ] **Step 2: Run the client tests and verify they fail**

Run:

```powershell
npm.cmd test -- --run src/api.test.tsx
```

Expected: FAIL because `src/api.ts` does not exist.

- [ ] **Step 3: Port the typed client and contract, then harden error handling**

Inspect the source files:

```powershell
git show origin/codex/sentinel-v2:src/api.ts
git show origin/codex/sentinel-v2:contracts/sentinel-api.yaml
```

Create/update both files with `apply_patch`. Keep `request<T>` private, use `VITE_SENTINEL_API_URL` with `http://127.0.0.1:8000` fallback, parse FastAPI `detail` on non-2xx responses, and expose `refresh` from `usePolling`. Preserve operator headers only on mutating operator calls.

- [ ] **Step 4: Run the focused client tests**

Run:

```powershell
npm.cmd test -- --run src/api.test.tsx
```

Expected: both tests pass without open timer warnings.

- [ ] **Step 5: Commit the client and contract**

```powershell
git add src/api.ts src/api.test.tsx contracts/sentinel-api.yaml
git commit -m "feat(web): add adaptive defense api client"
```

---

### Task 3: Threat Intelligence and Defense Control pages

**Files:**
- Create: `src/pages/Threats.tsx`
- Create: `src/pages/Threats.test.tsx`
- Create: `src/pages/Defense.tsx`
- Create: `src/pages/Defense.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 2 `usePolling`, `sentinelApi`, `Detection`, `FirewallRule`, and `Session`.
- Produces: `/threats` and `/defense` routes with live, offline, empty, mutation-success, and mutation-error states.

- [ ] **Step 1: Write failing route and interaction tests**

`src/pages/Threats.test.tsx` must mock `globalThis.fetch`, render the page, and assert the heading and returned risk score:

```tsx
expect(await screen.findByRole("heading", { name: "Threat Intelligence" })).toBeInTheDocument();
expect(await screen.findByText("94")).toBeInTheDocument();
expect(screen.getByText("4 correlated signals")).toBeInTheDocument();
```

`src/pages/Defense.test.tsx` must return empty rules/sessions for GET requests, use Testing Library's `fireEvent.click` on `Enforce for 15 min`, and assert the POST payload contains:

```ts
expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
  target_type: "ip",
  target_value: "203.0.113.44",
  action: "block",
  duration_seconds: 900,
});
```

- [ ] **Step 2: Run the page tests and verify they fail**

Run:

```powershell
npm.cmd test -- --run src/pages/Threats.test.tsx src/pages/Defense.test.tsx
```

Expected: FAIL because both page modules and routes are missing.

- [ ] **Step 3: Adapt the contributor pages into the current design system**

Use the contributor branch as the behavior reference:

```powershell
git show origin/codex/sentinel-v2:src/pages/Threats.tsx
git show origin/codex/sentinel-v2:src/pages/Defense.tsx
```

Implement the pages with existing semantic classes. Threats must show explainable signals and a useful empty state. Defense must create/remove scoped rules, run rollback, restore restricted sessions, disable actions while busy, and expose API errors with `role="alert"`. Do not add page-specific neon colors or dark-theme root wrappers.

Add to `src/App.tsx`:

```tsx
<Route path="threats" element={<Threats />} />
<Route path="defense" element={<Defense />} />
```

- [ ] **Step 4: Run the new page tests and type-check through the build**

Run:

```powershell
npm.cmd test -- --run src/pages/Threats.test.tsx src/pages/Defense.test.tsx
npm.cmd run build
```

Expected: tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit the new operator pages**

```powershell
git add src/App.tsx src/pages/Threats.tsx src/pages/Threats.test.tsx src/pages/Defense.tsx src/pages/Defense.test.tsx
git commit -m "feat(web): add threat and defense controls"
```

---

### Task 4: Live incidents, services, policies, and audit evidence

**Files:**
- Modify: `src/pages/Incidents.tsx`
- Create: `src/pages/Incidents.test.tsx`
- Modify: `src/pages/Services.tsx`
- Create: `src/pages/Services.test.tsx`
- Modify: `src/pages/Policies.tsx`
- Create: `src/pages/Policies.test.tsx`
- Modify: `src/pages/Logs.tsx`
- Create: `src/pages/Logs.test.tsx`

**Interfaces:**
- Consumes: Task 2 types, polling hook, and mutations.
- Produces: live investigation, continuity, policy, and audit workflows while retaining each current page's visual hierarchy.

- [ ] **Step 1: Write failing tests for the four backend-backed workflows**

Tests must verify these observable outcomes:

```tsx
// Incidents
expect(await screen.findByText("Administrative pump override anomaly")).toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: "Resolve incident" }));
expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/v1/incidents/"), expect.objectContaining({ method: "PATCH" }));

// Services
fireEvent.click(screen.getByRole("button", { name: "Verify continuity" }));
expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/v1/health-checks/run"), expect.objectContaining({ method: "POST" }));

// Policies
fireEvent.click(screen.getByRole("switch", { name: "Automatic scoped containment" }));
expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/v1/policies/"), expect.objectContaining({ method: "PATCH" }));

// Logs
expect(await screen.findByText("firewall rule created")).toBeInTheDocument();
fireEvent.change(screen.getByPlaceholderText(/Search actions/), { target: { value: "rollback" } });
expect(screen.getByText("firewall rule rolled back")).toBeInTheDocument();
```

- [ ] **Step 2: Run all four tests and verify the static pages fail them**

Run:

```powershell
npm.cmd test -- --run src/pages/Incidents.test.tsx src/pages/Services.test.tsx src/pages/Policies.test.tsx src/pages/Logs.test.tsx
```

Expected: FAIL because the current pages read static `src/data.ts` content and do not perform API mutations.

- [ ] **Step 3: Integrate live behavior without replacing the approved layouts**

Use these source pages for data-flow reference only:

```powershell
git show origin/codex/sentinel-v2:src/pages/Incidents.tsx
git show origin/codex/sentinel-v2:src/pages/Services.tsx
git show origin/codex/sentinel-v2:src/pages/Logs.tsx
git show origin/codex/sentinel-v2:src/pages/Settings.tsx
```

Adapt as follows:

- `Incidents`: preserve the queue/detail/evidence/sequence composition; replace fixtures with `ApiIncident[]`; add investigating and resolved mutations plus an empty state.
- `Services`: preserve table and metric cards; populate `ProtectedService[]`; make the primary action run a health check; show latest continuity status and history.
- `Policies`: keep policy configuration on this route, not Settings; bind ordered thresholds, automatic containment, and corroboration controls to the backend policy.
- `Logs`: preserve search/table/export behavior; replace fixtures with `AuditEntry[]`; export the filtered records as `sentinel-audit.json`.

All failed mutations must display a visible error and leave the previous data intact.

- [ ] **Step 4: Run the focused page suite**

Run:

```powershell
npm.cmd test -- --run src/pages/Incidents.test.tsx src/pages/Services.test.tsx src/pages/Policies.test.tsx src/pages/Logs.test.tsx
```

Expected: all workflow tests pass.

- [ ] **Step 5: Commit the backend-backed operational pages**

```powershell
git add src/pages/Incidents.tsx src/pages/Incidents.test.tsx src/pages/Services.tsx src/pages/Services.test.tsx src/pages/Policies.tsx src/pages/Policies.test.tsx src/pages/Logs.tsx src/pages/Logs.test.tsx
git commit -m "feat(web): connect operational pages to security core"
```

---

### Task 5: Preserve Overview and integrate navigation/posture data

**Files:**
- Modify: `src/components/Shell.tsx`
- Modify: `src/components/Shell.test.tsx`
- Modify: `src/pages/Overview.tsx`
- Modify: `src/pages/Overview.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Task 2 `Dashboard` and `usePolling`; Task 3 routes.
- Produces: discoverable Threats and Defense navigation plus live posture evidence inside the approved landing page.

- [ ] **Step 1: Extend preservation tests before changing the UI**

Add to `Shell.test.tsx`:

```tsx
expect(screen.getByRole("link", { name: "Threats" })).toHaveAttribute("href", "/threats");
expect(screen.getByRole("link", { name: "Defense" })).toHaveAttribute("href", "/defense");
expect(container.firstElementChild).toHaveClass("app-scale", "theme-hybrid");
```

Mock `/api/v1/dashboard` in `Overview.test.tsx` and retain all current assertions, especially:

```tsx
expect(screen.getByRole("heading", { name: "Critical infrastructure. Continuously defended." })).toBeInTheDocument();
expect(screen.getByText("Live defense network")).toBeInTheDocument();
expect(container.firstElementChild).toHaveClass("overview-apple");
```

Also assert one live posture value, such as `4 services protected` or `Continuity verified`.

- [ ] **Step 2: Run the preservation tests and verify only new expectations fail**

Run:

```powershell
npm.cmd test -- --run src/components/Shell.test.tsx src/pages/Overview.test.tsx
```

Expected: existing visual-preservation assertions pass; new routes/live posture assertions fail.

- [ ] **Step 3: Add concise navigation and live posture data**

Set navigation order in `Shell.tsx` to:

```ts
const navigation = [
  ["Overview", "/"], ["Facility", "/facility"], ["Threats", "/threats"],
  ["Incidents", "/incidents"], ["Defense", "/defense"], ["Services", "/services"],
  ["Policies", "/policies"], ["Logs", "/logs"], ["Lab", "/lab"],
];
```

Poll `/api/v1/dashboard` in `Overview.tsx`, but limit changes to the existing operational facts/status copy and links. Do not replace the hero, live network visualization, `What it does` section, CTA placement, or `overview-apple` class. Add only the minimum `styles.css` rules needed for new form/feedback states and mobile nav readability, scoped beneath `.theme-hybrid` where appropriate.

- [ ] **Step 4: Run preservation tests and the complete frontend suite**

Run:

```powershell
npm.cmd test -- --run src
```

Expected: all frontend tests pass; Vitest does not scan `.artifacts`.

- [ ] **Step 5: Commit the shell and overview integration**

```powershell
git add src/components/Shell.tsx src/components/Shell.test.tsx src/pages/Overview.tsx src/pages/Overview.test.tsx src/styles.css
git commit -m "feat(web): surface live adaptive defense posture"
```

---

### Task 6: Documentation, complete verification, merge, and push

**Files:**
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `.gitignore`
- Modify: `docs/superpowers/plans/2026-11-20-adaptive-defense-integration.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: reproducible setup/demo documentation and a verified `main` branch on `origin`.

- [ ] **Step 1: Update documentation and ignore local server logs**

Port the factual API/demo additions from the contributor branch while retaining the current product description. Document this visible demo path exactly:

```text
Run attack demo → inspect Threats → open Incident evidence → inspect scoped Defense rule
→ verify Services continuity → run rollback test → inspect Logs audit evidence
```

Document that the operator headers and ingestion token are local simulation controls, not production authentication. Add only local runtime logs to `.gitignore`; do not ignore test fixtures or evidence needed by the demo.

- [ ] **Step 2: Run fresh backend verification**

Run:

```powershell
python -m pytest backend/tests -q
```

Expected: all backend tests pass, including adaptive defense, existing facility, and existing attack-flow tests.

- [ ] **Step 3: Run fresh frontend verification and production build**

Run:

```powershell
npm.cmd test -- --run src
npm.cmd run build
```

Expected: all frontend tests pass and Vite creates `dist` without TypeScript errors.

- [ ] **Step 4: Run the manual end-to-end demo against local services**

Start FastAPI and Vite, then verify in Chrome at desktop and narrow widths:

```powershell
python -m uvicorn sentinel.main:app --app-dir backend --host 127.0.0.1 --port 8000
npm.cmd run dev -- --host 127.0.0.1
```

Acceptance observations:

1. Overview and Facility retain the approved visual design.
2. Running the attack creates live detection, incident, restricted session, firewall rule, health check, and audit evidence.
3. An independent legitimate facility operation remains allowed.
4. The rollback demo visibly creates then rolls back the unsafe scoped rule.
5. Every new page has a usable empty/offline state and no horizontal page overflow at the narrow viewport.

- [ ] **Step 5: Invoke verification-before-completion and record the evidence**

Re-run the commands from Steps 2 and 3 after any manual-demo fix. Update the checkboxes in this plan only after observing fresh passing output.

- [ ] **Step 6: Commit documentation and verification metadata**

```powershell
git add README.md backend/README.md .gitignore docs/superpowers/specs/2026-11-20-adaptive-defense-integration-design.md docs/superpowers/plans/2026-11-20-adaptive-defense-integration.md
git commit -m "docs: document adaptive defense demo"
```

- [ ] **Step 7: Finish the feature branch and integrate it into main**

Invoke `superpowers:finishing-a-development-branch`. Use a non-destructive fast-forward or reviewed merge into `main`; never reset or discard unrelated work.

- [ ] **Step 8: Push the verified main branch**

```powershell
git push origin main
```

Expected: `origin/main` points to the verified integration commit and `git status --short` is empty.

