# Dashboard Density Reduction

## Objective
Reduce above-the-fold visual density on `/fleet`, `/alerts`, and `/rul` without changing data, meaning, values, thresholds, provenance, or honesty behavior.

## Problem and Why
The DASH-AUD-01 audit ranked three repeated/oversized dashboard regions as the clearest density reductions. Preserve access to all existing information while making the default scan lighter.

## Scope and Constraints
- Authorized source files: the three specified page components, their adjacent CSS, their adjacent `*.density.test.ts` files, and `frontend/src/i18n/dict/ops.ts` only if strictly necessary.
- This task document is additionally authorized by the DASH-FIX-01 2nd-dispatch amendment. No other `odd/` file may change.
- No values, formatting, provenance, DEMO labels, backend-down banner, tokens, or other routes may change. No dependency additions.
- TDD: on (source: `_rules.md`); runner: `cd frontend && bun test src`.
- Route: delegated writer (three page surfaces, each with structure test); estimated authored change: ~250 lines, below the ~400-line planning heuristic. Delivery strategy: `ask-on-risk`.
- Engram mirror `odd/dash-density/tasks`: pending because no registered runtime identity or memory write tool is available.

## Tasks
- [x] D01 Fleet: add a compact KPI strip retaining all three values and per-field provenance; add failing-then-passing density test; commit `refactor(fleet): merge top kpi cards into one strip` (commit identity pending).
- [ ] D02 Alerts: collapse recurrence ranking behind a one-click disclosure by default; retain filtering; add density test; commit `feat(alerts): collapse recurrence ranking behind disclosure`.
- [ ] D03 RUL: collapse per-wheel charts behind a disclosure; keep horizon/status/provenance visible; add density test; commit `feat(rul): collapse per-wheel projection charts behind disclosure`.

## Acceptance and Checks
- Each density test fails on the unmodified UI, then passes after its change.
- `cd frontend && bun test src`; `cd frontend && bun run build`; `cd frontend && bun test src/honesty.test.ts`.
- Before/after screenshots at 1440 and 390 for all three routes; the unchanged DEMO labels remain visible on `/fleet`.
- Full command outputs and screenshots: `/tmp/og-goal/evidence/DASH-FIX-01/`.

## Progress
- Baseline screenshots captured before source edits; each 1440 capture logged one resource 404, while 390 captures logged no errors. Fleet DEMO labels are visible.
- Commits and review assessments: pending.
- D01: `FleetPage.density.test.ts` failed before the strip existed and passes after implementation (15 assertions); outputs: `/tmp/og-goal/evidence/DASH-FIX-01/red-fleet.txt` and `/tmp/og-goal/evidence/DASH-FIX-01/green-fleet.txt`. Runtime screenshot not repeated because baseline captures were supplied and the dispatch prohibited recapture; dev server left running.
- D01 commit: pending immediately before commit; rollback boundary is `FleetPage.tsx`, `fleet.css`, and `FleetPage.density.test.ts`.
- Next step: reconcile D01 commit identity, then proceed sequentially through D02 and D03.
