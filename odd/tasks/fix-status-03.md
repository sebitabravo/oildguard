# FIX-STATUS-03 — Bind live source badge to validity

## Objective
Remove the live-source badge from stale or invalid level-card fields while retaining their validity badge; preserve live badge on valid live fields.

## Scope
- `frontend/src/ops/wheel/WheelPanels.tsx` — source/validity badges only.
- `frontend/src/i18n/dict/ops.ts` — Spanish source-origin text.
- `frontend/src/ops/wheel/WheelPanels.validity.test.ts` — adjacent render coverage.
- `/monitoring` 1024 screenshots and command evidence under `/tmp/og-goal/evidence/FIX-STATUS-03/`.
- No other files.

## Checklist
- [x] Test stale, invalid, and valid-live badge behavior (RED before implementation).
- [x] Suppress `EN VIVO` only when the same field is not valid; keep validity state and source origin text.
- [x] Run required tests/build and capture before/after screenshots.
- [x] Record observed evidence and commit identities.

## Acceptance criteria
Stale and invalid readings render their validity state without the `EN VIVO` badge; valid live readings retain it. No values, thresholds, or unrelated fields change.

## Checks
- `cd frontend && bun test src` — 634 pass, 0 fail; `bun-test-src.txt`.
- `cd frontend && bun run build` — exit 0, 0 errors; `bun-build.txt`.
- `cd frontend && bun test src/honesty.test.ts` — 3 pass, 0 fail; `bun-test-honesty.txt`.
- Focused RED: 2 failures for stale/invalid live badge; `red.txt`.
- `/monitoring` 1024 screenshots: `monitoring-before-1024.png`, `monitoring-after-1024.png` (dev route displayed DEMO fallback in both).

## TDD / route / persistence
TDD: ON; source: `/tmp/og-goal/briefs/_rules.md`; runner: `cd frontend && bun test src`.
Route: delegated direct, single writer (multi-file behavior/tests; parent-assigned).
Engram mirror: pending; no authoritative session ID or memory tools available.

## Evidence and status
Badge logic: `NumericEvidence` in `WheelPanels.tsx`; the source badge is conditional on validity.
Evidence directory: `/tmp/og-goal/evidence/FIX-STATUS-03/`.
Test commit: `cfaeecb` `test(ops): bind live badge to validity`.
Fix commit: `058935c` `fix(ops): hide live badge on invalid readings`.
Parent spot-check: `cd frontend && bun test src/honesty.test.ts` — 3 pass, 0 fail; `parent-spotcheck-honesty.txt`.
RDD: on; medium risk; `under_budget`; review not due, pending slice from `15a8f0d`.
Status: implemented; required checks and screenshots captured.
