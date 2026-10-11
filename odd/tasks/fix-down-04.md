# FIX-DOWN-04 — Gate live claims on connection state

## Objective
Remove live framing from `/link` and `/fleet` telemetry when the backend/WebSocket is not actually connected; restore it when connected.

## Scope
- `frontend/src/platform/link/LinkHealthPage.tsx` and `LinkHealthPage.live.test.ts`.
- `frontend/src/ops/fleet/FleetPage.tsx` telemetry child `frontend/src/dash/fleetLive/FleetLivePanel.tsx` and `FleetPage.live.test.ts`.
- `frontend/src/i18n/dict/ops.ts` / `platform.ts` for Spanish labels only.
- No backend, protocol, polling interval, or value changes.

## Checklist
- [x] Render tests for closed/open state on both pages; RED captured first.
- [x] Gate live wording and field badges on actual WebSocket connection state.
- [x] Capture blocked/restored-route 1024 screenshots; run required tests/build.
- [x] Record source, checks, screenshots, and commit identities.
- [x] Remove repeated offline status copy and cover both telemetry views with assertions.
- [ ] FIX-DOWN-04b: blocked pending reproduction; current blocked route renders no live title/status/badge in `/fleet` telemetry.

## Acceptance criteria
Closed state has no `EN VIVO`, `Al día`, or `en vivo` claims in the telemetry areas; open state preserves live framing. Restored live confirmation was pending during the first dispatch and was observed in FIX-DOWN-04b.

## Checks and evidence
- `cd frontend && bun test src` — 638 pass, 0 fail; `bun-test-src.txt`.
- `cd frontend && bun run build` — exit 0; `bun-build.txt`.
- `cd frontend && bun test src/honesty.test.ts` — 3 pass, 0 fail; `bun-test-honesty.txt`.
- RED: both test imports failed before implementation; `red.txt`.
- Browser blocked via Playwright route abort: `/tmp/og-goal/evidence/FIX-DOWN-04/link-blocked-1024.png`, `fleet-blocked-1024.png`.
- Initial restored-route attempt: `link-restored-1024.png`, `fleet-restored-1024.png`; localhost:8000 was unreachable then. Later restoration succeeded in FIX-DOWN-04b; see its evidence directory.
- Duplicate-copy RED: `duplicate-red.txt` showed the closed-state tests fail with repeated disconnected/offline text.
- Correction checks: `bun-test-src-duplicate.txt` (638 pass, 0 fail), `bun-build-duplicate.txt` (exit 0), and `bun-test-honesty-duplicate.txt` (3 pass, 0 fail).
- Updated 1024 blocked screenshots: `link-blocked-1024.png`, `fleet-blocked-1024.png`; browser summary: `browser-evidence-duplicate.txt`. Link now renders one disconnected status and one offline title; Fleet renders one exact `Sin conexión` status.
- RDD assessment for parent review: `rdd-assessment-final.json` reports medium / under_budget, not due. Parent spot check: `parent-spotcheck-honesty-final.txt`. Restored/live state remains pending; backend reachability failure is recorded in `backend-reachability.txt`.
- FIX-DOWN-04b reproduction: `/tmp/og-goal/evidence/FIX-DOWN-04b/panel-counts-before.txt` reports blocked panel counts 0/0/0 and restored counts 1/21/1 for heading/EN VIVO/Al día. Blocked panel `textContent` and matching text-node counts are also 0/0/0 in `leaf-node-counts.txt`; restored `/fleet` is live and backend health succeeded in `backend-reachability.txt`. Existing closed/open test passed in `parent-spotcheck-fleet-live-test.txt`. No new RED or source change was made because the reported blocked-state leak did not reproduce.

## TDD / route / persistence
TDD: ON; source: `/tmp/og-goal/briefs/_rules.md`; runner: `cd frontend && bun test src`.
Route: delegated direct, single writer (multi-file UI/test change).
Engram mirror: pending; no authoritative session ID or memory tools available.

## Source and status
The `/link` live gate is derived by `LinkHealthPage.connected` from API source and WebSocket state. `FleetLivePanelView` derives its gate from socket-backed state, set by `FleetLivePanel` only in the WebSocket `onopen` handler; polling no longer grants live labels.
`FleetLivePanelView` sets `connected` only for state `live` and renders `FleetLiveTelemetryFields` only when connected with a snapshot. FIX-DOWN-04b remains blocked pending a reproduction of the parent-reported blocked-route leak; Engram mirror remains pending (no authoritative session ID or memory tools).
Evidence directory: `/tmp/og-goal/evidence/FIX-DOWN-04/`.
Test commit: `f78d61c` `test(platform): bind live claims to state`.
Fix commit: `d19d97c` `fix(platform): gate live claims on connection`.
Correction commit: `9ba001b` `fix(platform): remove duplicate offline status`.
Status: original live-claim fix remains in place. FIX-DOWN-04b is blocked because the parent-reported leak did not reproduce (blocked counts 0/0/0); restored/live state returned in the follow-up check (panel counts 1/21/1).
