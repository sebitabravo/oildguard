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
- [x] D01 Fleet: add a compact KPI strip retaining all three values and per-field provenance; add failing-then-passing density test; commit `refactor(fleet): merge top kpi cards into one strip` (`0841a213250171fa663bf86f0f94f2c968e35d7d`).
- [x] D02 Alerts: collapse recurrence ranking behind a one-click disclosure by default; retain filtering; add density test; commit `feat(alerts): collapse recurrence ranking behind disclosure` (`dca25057c76b5e2e004c3eb2abe2e5d8ca876dc8`).
- [x] D03 RUL: collapse per-wheel charts behind a disclosure; keep horizon/status/provenance visible; add density test; commit `feat(rul): collapse per-wheel projection charts behind disclosure` (`0b7d41b74ce0d9bb81d1752a01b93f97faa3bbdc`).

## Acceptance and Checks
- Each density test fails on the unmodified UI, then passes after its change.
- `cd frontend && bun test src`; `cd frontend && bun run build`; `cd frontend && bun test src/honesty.test.ts`.
- Before/after screenshots at 1440 and 390 for all three routes; the unchanged DEMO labels remain visible on `/fleet`.
- Full command outputs and screenshots: `/tmp/og-goal/evidence/DASH-FIX-01/`.

## Progress
- Baseline screenshots captured before source edits; each 1440 capture logged one resource 404, while 390 captures logged no errors. Fleet DEMO labels are visible.
- D01: `FleetPage.density.test.ts` failed before the strip existed and passes after implementation (16 assertions); outputs: `/tmp/og-goal/evidence/DASH-FIX-01/red-fleet.txt` and `/tmp/og-goal/evidence/DASH-FIX-01/green-fleet.txt`.
- D01 assessment: medium risk, `review_due: false`, `review_due_reason: under_budget`, assessed against `b339eb9`; last reviewed boundary remains `b339eb9`.
- D01 commit rollback boundary: `FleetPage.tsx`, `fleet.css`, and `FleetPage.density.test.ts`.
- D02: `AlertsInboxPage.density.test.ts` failed before the disclosure existed and passes after implementation (5 assertions); outputs: `/tmp/og-goal/evidence/DASH-FIX-01/red-alerts.txt` and `/tmp/og-goal/evidence/DASH-FIX-01/green-alerts.txt`. Recurrence rank buttons retain their wheel-filter action.
- D02 assessment: medium risk, `review_due: false`, `review_due_reason: under_budget`, assessed against `b339eb9`; last reviewed boundary remains `b339eb9`. The Impeccable detector reported the unchanged existing `side-tab` warning at `alerts.css:138`.
- D02 rollback boundary: `AlertsInboxPage.tsx`, `alerts.css`, and `AlertsInboxPage.density.test.ts`.
- D03: `RulPage.density.test.ts` failed before disclosure controls existed and passes after implementation (82 assertions); outputs: `/tmp/og-goal/evidence/DASH-FIX-01/red-rul.txt` and `/tmp/og-goal/evidence/DASH-FIX-01/green-rul.txt`. Each projected card's native disclosure is closed by default; horizon, status, source, metrics, and the visible 30% label remain outside or in the summary.
- D03 assessment: medium risk, `review_due: false`, `review_due_reason: under_budget`, assessed against `b339eb9`; last reviewed boundary remains `b339eb9`.
- D03 rollback boundary: `RulPage.tsx`, `rul.css`, and `RulPage.density.test.ts`.
- Final verification correction: Astro check rejected `.toContain` and `.toBeNull` in the D02/D03 density tests (four TS2339 errors; original output retained at `/tmp/og-goal/evidence/DASH-FIX-01/build.txt`). Replaced those matchers with boolean/string checks using `.toBe`; no UI code changed.
- Correction verification: focused D02/D03 tests: 2 pass, 0 fail (`density-tests-final.txt`); full suite: 607 pass, 0 fail (`bun-test-final.txt`); build: exit 0 (`build-final.txt`); honesty: 3 pass, 0 fail (`honesty-final.txt`). Build has existing unused/deprecation hints and Vite dynamic-import/chunk-size warnings.
- Correction commit: pending. Screenshots and visual readback were completed by the parent; dev server remains running.
- Next step: parent review and final closeout.
