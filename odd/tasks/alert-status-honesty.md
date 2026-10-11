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
- [x] A01: Separate the backend-reachability badge from the DEMO-source notice; RED and GREEN captured at `/tmp/og-goal/evidence/ALERT-FIX-01/red.txt` and `green.txt`; commit `b9dcfaa938ed169678c44a3e78a0a72a309fc7c5` (`fix(alerts): separate backend and data status`); native assessment against `b339eb9`: medium, `review_due:false`, `under_budget`.
- [x] A02: Pair all five filter labels with native controls and add responsive label-over-control layout; RED and GREEN captured in `/tmp/og-goal/evidence/ALERT-FIX-01/red.txt` and `green.txt`; commit `5260c99b458fc7f9e0cb9b0b2fb4843a320e5d9a` (`fix(alerts): align filter labels and controls`); native assessment against `b339eb9`: medium, `review_due:false`, `under_budget`.

## Acceptance and Checks
- RED tests fail before their respective UI changes; GREEN tests pass afterward.
- `cd frontend && bun test src`; `cd frontend && bun run build`; `cd frontend && bun test src/honesty.test.ts`.
- Capture `/alerts` at 1440 and 390 with `/tmp/og-goal/scripts/shot.mjs`.
- Evidence: `/tmp/og-goal/evidence/ALERT-FIX-01/red.txt`, `green.txt`, and screenshots.

## Progress
- Initial state: clean branch `feat/integrity-narrative`, HEAD `475e450`; RDD on by default; prior reviewed boundary `b339eb9`.
- A02's first build caught unsupported matcher typings in the new test (`toBeDefined` and negated `toContain`); the A02 commit was amended with equivalent supported boolean assertions. A first GREEN run also exposed an undefined test helper; the corrected retry passes.
- Final checks: `bun test src` 609 pass/0 fail (`bun-test-src-final.txt`); parent spot-check 609 pass/0 fail (`parent-spot-check.txt`); build exit 0, 44 pages (`build-final.txt`); honesty guard 3 pass/0 fail (`honesty-final.txt`).
- Visual readback: 1440 screenshot shows distinct backend-available and DEMO-source messages with five aligned label/control pairs; mobile full-page screenshot shows all five controls stacked below their labels. The required 390 viewport capture does not reach the filters. The 1440 and supplemental mobile captures logged a generic resource 404; the helper did not include its URL.
- Screenshots: `/tmp/og-goal/evidence/ALERT-FIX-01/alert-fix-chromium-1440.png`, `alert-fix-chromium-390.png`, and `alert-fix-mobile-full-chromium-390.png`.
- Next: source work complete; Engram mirror remains pending until a registered session identity and memory tool are available.
