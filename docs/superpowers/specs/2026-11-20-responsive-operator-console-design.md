# Responsive Operator Console Design

## Goal

Make the complete Sentinel operator console usable and visually intentional from 360px phones through tablets and desktop displays, while preserving the approved white/grey editorial design and dark operational canvases.

## Design Principles

- Responsive behavior must recompose information instead of uniformly shrinking the desktop layout.
- Preserve the current visual identity, typography, muted navy/burgundy accents, and cinematic command-center character.
- Keep primary actions visible and touch targets at least 44px high on mobile.
- Avoid page-level horizontal overflow at every supported width.
- Retain the interactive 3D facility on phones, with reduced visual density and mobile-specific controls.
- Preserve desktop layouts unless a responsive change materially improves them.

## Breakpoints

- **Phone:** 360–599px
- **Large phone / small tablet:** 600–899px
- **Tablet / compact desktop:** 900–1199px
- **Desktop:** 1200px and above

CSS media queries and component-level responsive behavior should follow these ranges consistently. The implementation may use existing Tailwind breakpoints where they map cleanly to these bands.

## Application Shell and Navigation

Desktop retains the existing horizontal navigation. Below 900px, the header displays the Sentinel identity, a compact status area, and a hamburger button. Activating the hamburger opens an accessible full-screen navigation panel containing every route in the same order as desktop.

The menu must:

- trap neither scrolling nor keyboard focus incorrectly;
- expose `aria-expanded`, `aria-controls`, and an explicit close control;
- close after route selection, Escape, or viewport transition back to desktop;
- use at least 44px row targets;
- prevent the page behind it from scrolling while open.

Main content padding and vertical rhythm reduce progressively on tablets and phones. Footer content stacks on narrow widths.

## Overview

The desktop split hero remains unchanged. Below 760px it becomes a single-column composition:

1. Editorial headline, supporting copy, and CTAs.
2. Live proof facts in a compact grid.
3. The defense network visualization in a shorter, edge-to-edge operational panel.

Phone typography uses fluid sizes that remain readable at 360px without awkward single-word lines. CTAs become full-width only at the narrowest width. The network retains animation and the blocked-path story, while labels and legends reduce in density. The “What it does” section becomes a single-column sequence with compact separators.

## Facility Digital Twin

The 3D facility remains interactive on mobile. Responsive scene behavior will simplify rather than replace it:

- use a closer, mobile-specific camera framing;
- reduce or hide secondary asset labels below 600px;
- keep primary reservoirs, treatment, control, pump, and distribution assets selectable;
- preserve tap selection and disable interactions that depend on hover;
- maintain reduced-motion behavior;
- reduce rendering density where practical without changing authoritative facility state.

The status strip becomes horizontally scrollable with priority fields retained. Asset controls become a bottom sheet on mobile, with a visible grab area, bounded height, internal scrolling, and a close button. Command results appear above the bottom sheet and never cover primary controls. Facility header actions stack into full-width touch-friendly controls.

## Operational Pages

Threats, Incidents, Defense, Services, Policies, Logs, and Lab retain their backend-backed behavior.

Dense desktop tables transform into mobile card lists below 760px. Each card presents the same important fields in a labeled hierarchy; no evidence or security status may disappear solely due to screen size. Desktop tables remain available at larger widths.

- **Threats:** risk, classification, evidence count, and recommendation remain visible.
- **Incidents:** queue and detail stack; verified response evidence becomes a compact vertical sequence.
- **Defense:** rule creation, rule history, sessions, and rollback controls stack with full-width form controls.
- **Services:** health inventory and continuity history use cards; verification action stays visible.
- **Policies:** thresholds and toggles stack without clipped labels or controls.
- **Logs:** audit entries become cards with action, actor, entity, outcome, detail, and time.
- **Lab:** scenario description precedes the execution trace; controls remain reachable without excessive scrolling.

## Forms, Feedback, and Accessibility

- Inputs and buttons use a minimum 44px interactive height on touch widths.
- Focus states remain visible against both light and dark surfaces.
- Error, offline, empty, busy, success, containment, and rollback states must remain visible on mobile.
- Dialog/menu semantics and keyboard behavior must be covered by component tests.
- Long identifiers and paths wrap safely without widening the viewport.
- Respect `prefers-reduced-motion` across navigation, network, and facility transitions.

## Testing and Acceptance

Automated tests will cover:

- hamburger open, close, route selection, Escape, and accessibility attributes;
- responsive table/card rendering without losing key fields;
- Facility mobile labels/drawer behavior where it is represented in React state;
- preservation of existing desktop behavior and all current API workflows.

The production build and complete backend/frontend suites must pass. Browser verification must cover widths of 360px, 390px, 430px, 768px, 1024px, and desktop, including:

- no page-level horizontal overflow;
- usable navigation and touch targets;
- readable Overview typography and network visualization;
- selectable 3D assets and usable bottom-sheet controls;
- visible error and success feedback;
- intact white/grey design with dark operational panels.

## Out of Scope

- Replacing the 3D facility with a separate 2D application.
- Changing the backend API or adaptive-defense lifecycle.
- Redesigning the established color system or desktop product identity.
- Creating native iOS or Android applications.
