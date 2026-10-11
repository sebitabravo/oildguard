# Alerts Status Honesty and Filter Layout

## Objective
Make `/alerts` report backend reachability separately from alert data source and keep filter labels paired with native controls.

## Problems and Why
- Header badge and banner contradict backend status; backend is reachable while displayed alerts are DEMO.
- Filter labels collide with adjacent native selects at desktop width, reducing scanability and control association.

## Scope and Constraints
- Authorized: `frontend/src/ops/alerts/AlertsInboxPage.tsx`, `frontend/src/ops/alerts/*.css`, the required alert-source/header-status keys only in `frontend/src/i18n/dict/opsAlerts.ts`, new `frontend/src/ops/alerts/AlertsInboxPage.status.test.ts`, and this new task document only.
- Preserve Spanish-only UI, native select accessibility, existing tokens and behavior; no dependencies. Stop if another repository file is required.
- TDD: on (source: `/tmp/og-goal/briefs/_rules.md`); runner: `cd frontend && bun test src`.
- Route: delegated writer; multiple behavior/test files and source-reading preparation require delegation. Estimate: ~120 authored lines; delivery strategy: `ask-on-risk`.
- Engram mirror `odd/alert-status-honesty/tasks`: pending because no registered runtime identity or memory-write tool is available.

## Checklist
- [x] A01: Separate the backend-reachability badge from the DEMO-source notice; RED and GREEN captured at `/tmp/og-goal/evidence/ALERT-FIX-01/red.txt` and `green.txt`; commit `fix(alerts): state backend reachability and data source separately` (SHA to record during A02).
- [ ] A02: Test and fix filter label/control layout at desktop and mobile while retaining native selects; record RED/GREEN; commit `fix(alerts): align filter labels with their controls`.

## Acceptance and Checks
- RED tests fail before their respective UI changes; GREEN tests pass afterward.
- `cd frontend && bun test src`; `cd frontend && bun run build`; `cd frontend && bun test src/honesty.test.ts`.
- Capture `/alerts` at 1440 and 390 with `/tmp/og-goal/scripts/shot.mjs`.
- Evidence: `/tmp/og-goal/evidence/ALERT-FIX-01/red.txt`, `green.txt`, and screenshots.

## Progress
- Initial state: clean branch `feat/integrity-narrative`, HEAD `475e450`; RDD on by default; prior reviewed boundary `b339eb9`.
- A01 complete; parent assessment required before A02. After A02, record both exact commit SHAs and remaining verification/screenshot observations.
