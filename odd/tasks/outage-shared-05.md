# OUTAGE-SHARED-05 — Shared backend outage notice

## Objective
Show the existing backend-outage notice on Monitoring, Fleet, RUL, Link, and Devices only after the page's existing REST load reports an outage; preserve copy and styling.

## Problem and why
Only Monitoring currently exposes a backend outage. QA-OPENCODE-02 confirmed Fleet, RUL, Link, and Devices omit the notice when the backend is blocked.

## Scope and constraints
- Authorized files: `frontend/src/ui/BackendOutageNotice.tsx` and tests; banner extraction in `frontend/src/dash/Dashboard.tsx`; notice mount points in Fleet, RUL, Link, and Devices pages; missing i18n keys only; this task document.
- Preserve current Spanish-only UI, existing copy/i18n keys, visual styling, and every page's existing REST request/state. No second health check or unrelated refactor.
- Do not touch `AGENTS.md`, physics, thresholds, or files outside the brief. TDD is on; runner: `cd frontend && bun test src`.
- Route: delegated implementation, because mapping spans 4+ page files and the behavior/test change spans multiple non-trivial files. Engram mirror pending: memory tools and authoritative session identity are unavailable.
- Forecast: about 180 authored changed lines; delivery strategy `ask-on-risk`.

## Acceptance criteria
- One shared notice preserves Dashboard's current wording and styling; Dashboard uses it without a visual change.
- Each of Fleet, RUL, Link, and Devices shows it on an observed backend failure and hides it for a successful live REST result; pending and WebSocket-only disconnect states do not falsely claim backend outage.
- No additional backend request, copy change, extra dependency, or out-of-scope file.

## Tasks and progress
- [x] O05-1 Map current notice, page REST state, and test seams. Evidence: read-only mapping; existing state is page-local, not a global health store.
- [x] O05-2 Add failing shared-component and four page outage tests; capture RED output in `red.txt` (641 pass, 5 expected missing-export/module failures).
- [x] O05-3 Extract notice and mount it using existing page REST outcome state. Full tests: 651 pass; build: 0 errors; honesty: 3 pass.
- [x] O05-4 Blocked/unblocked browser probe: 5/5 blocked notices, 0/5 open notices. Screenshots and probe output are under `/tmp/og-goal/evidence/OUTAGE-SHARED-05/`.
- [x] O05-5 Commit the extraction and page integrations. `7b08f6bceda3cae9e098a28e24ce338ce3b6fc6a` (`refactor(ui): extract shared backend outage notice`) and `adcf757e3632f6522b31c7f67949cea7a3c0441f` (`fix(ops): show outage notice on four pages`) are medium / `under_budget`; no review was due (`assess-commit-1.txt`, `assess-commits-1-2.txt`). The second subject is concise to comply with the repo's 50-character limit; its body names Fleet, RUL, Link, and Devices.

## Verification
- RED: `cd frontend && bun test src` with new tests before implementation; save to `/tmp/og-goal/evidence/OUTAGE-SHARED-05/red.txt`.
- GREEN: full `bun test src`, `bun run build`, and `bun test src/honesty.test.ts`; capture each complete output under `/tmp/og-goal/evidence/OUTAGE-SHARED-05/`.
- Browser: block `http://localhost:8000/**`, capture five 1024px route screenshots; unblock and confirm all notices disappear. Record `notice-blocked` and `notice-open` counts.
- There is no global health singleton: Fleet and RUL use their page-local `backendState`; Link and Devices use `useBackendOrDemo().source`; Dashboard uses `isBackendOutage`. Each reuses its existing REST outcome. No new health request was added.
- Browser result: `notice-blocked: 5/5`; `notice-open: 0/5` (`browser.txt`); ten route/state screenshots are present in the evidence directory.
- Impeccable detector: no findings (`impeccable-detect.txt`).

## Next step
Task implementation and checks are complete. The Engram mirror remains pending because no authoritative session identity or memory tools were available.
