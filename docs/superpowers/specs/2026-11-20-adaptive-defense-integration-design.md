# Adaptive Defense Integration Design

**Date:** 2026-11-20  
**Source:** `origin/codex/sentinel-v2`  
**Target:** `main`

## Objective

Integrate the contributor branch's new adaptive-defense capabilities into the current product without importing its visual direction. The existing white/grey hybrid interface, muted navy and burgundy accents, cinematic overview, and 3D facility remain the product's design authority.

## Integration strategy

Use a selective functional port rather than a raw Git merge. The source branch and `main` both modify the same frontend pages, but for different reasons: the source branch adds live behavior while `main` contains the approved visual redesign. Backend and contract changes can be incorporated substantially as written; frontend behavior will be adapted into the current components and styling.

## Capabilities to add

### Security core

- Authenticated event ingestion for the simulation environment.
- Explainable detection history and incident correlation.
- Scoped firewall rules with validation, expiry, removal, and audit evidence.
- Server-side session revoke and restore controls.
- Protected-service health and continuity verification.
- Automatic rollback when a defensive rule disrupts a legitimate transaction.
- Role-gated incident, policy, session, firewall, and health-check mutations.
- Live dashboard aggregation and append-only application audit history.
- Rollback simulation for a visible demo of safe recovery.

### Operator console

- A Threat Intelligence page backed by live detections.
- A Defense Control page for scoped rules, restricted sessions, and rollback demonstrations.
- Backend-backed Incidents with operator status changes.
- Backend-backed Services with continuity verification and history.
- Backend-backed Policies for response thresholds and containment safeguards; the existing Settings page remains separate.
- Backend-backed Logs combining operational and audit evidence.
- Live posture data on the existing Overview without replacing its approved hero/network composition.

## Visual boundary

The following parts of `main` are preserved:

- `theme-hybrid`, the white/grey page surfaces, and the current global scale behavior.
- Existing typography, spacing, borders, button language, and muted color palette.
- Current Overview content hierarchy and network visualization.
- Current Facility digital twin and its dark cinematic canvas.
- Current responsive behavior and mobile navigation mechanics.

New pages and states will use existing `panel`, `PageHeader`, `Status`, table, button, and form patterns. No neon color, contributor theme replacement, or wholesale page overwrite will be introduced.

## Navigation and information architecture

Add `Threats` and `Defense` routes while keeping existing routes. Navigation labels remain concise so the horizontal header stays usable at the current 90% desktop scale. The intended order is:

1. Overview
2. Facility
3. Threats
4. Incidents
5. Defense
6. Services
7. Policies
8. Logs
9. Lab

Settings remains accessible from the profile control.

The contributor branch placed policy controls in Settings. During integration those controls move into the existing Policies route, where operators already expect response policy configuration.

## Data flow

A shared typed frontend client will own API requests, polling, mutation headers, loading/error state, and refresh behavior. Pages will render safe empty/offline states instead of fabricated live values. After a mutation, only affected resources are refreshed.

The local demo uses fixed operator identity headers and a simulation ingestion token. These are explicitly demo controls, not production authentication. The backend remains the authority for rule safety, role checks, session state, policy validation, audit records, and continuity results.

## Safety and failure behavior

- Reject infrastructure-wide targets and protected control-plane endpoints.
- Reject invalid or duplicate firewall rules.
- Require ordered policy thresholds.
- Preserve unrelated legitimate sessions and traffic during containment.
- Roll back a rule when the continuity probe fails.
- Show failed requests and disconnected backend state visibly in the UI.
- Keep all attack behavior synthetic and local.

## Testing and acceptance

Implementation is accepted when:

- Existing facility, overview, shell, and frontend tests still pass.
- Contributor adaptive-defense backend tests pass on `main`.
- New frontend tests cover polling/error behavior and critical operator actions.
- Backend tests verify unsafe rule rejection, expiry, RBAC, session controls, continuity checks, and rollback.
- The production frontend build succeeds.
- A manual demo proves: generate attack evidence, observe detection/incident, see scoped containment, verify legitimate continuity, demonstrate rollback, and inspect audit evidence.
- The approved white/grey design remains visually consistent across all new pages.

## Non-goals

- Production identity, secrets management, or external firewall integration.
- Replacing SQLite with a production database.
- Replacing the current visual design with the contributor branch's dark console.
- Expanding the synthetic attack catalogue beyond the source branch in this integration.

