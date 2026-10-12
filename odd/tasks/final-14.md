# FINAL-14 — Open visual findings

## Objective
Resolve the five adjudicated visual findings from VISUAL-OPENCODE-04 without changing telemetry values, labels outside scope, or unrelated UI.

## Scope and constraints
- Authorized files: those listed in `/tmp/og-goal/briefs/FINAL-14.md`; parent amendment allows `frontend/src/dash/Dashboard.tsx` for F14-4 only.
- Local commits only; no PRs. Never edit `AGENTS.md` or `.codex/hooks.json`.
- UI is Spanish-only; reuse existing i18n and provenance components. No dependencies.
- TDD: enabled by `/tmp/og-goal/briefs/_rules.md`; runner `cd frontend && bun test src`.
- Planned route: delegated direct. Mapping was delegated because this requires 4+ files; a multi-file writer is required before implementation.
- Forecast: roughly 200–350 authored changed lines, to be revised if implementation proceeds. Delivery: `ask-on-risk`, constrained to local commits by the user; no PRs.

## Checklist and evidence
- [x] F14-1 Fleet: before `before-fleet-audit.txt` reports 30 clipped `td("DEMO")` cells and 3 DEMO/N1-N4 overlaps at x≈1220; after `dom-after.txt` reports 0 clipped DEMO-only cells and 0 overlaps (6 pairs, 6px gap). Screenshots: `fleet-1024-chromium-1024.png` → `after-fleet-1024-chromium-1024.png`.
- [x] F14-2 Cues: before `before-dom.txt` and after `dom-after.txt` show visible `Desliza para ver más` at 390px on both routes; no cue code change needed. After screenshots: `after-fleet-390-chromium-390.png`, `after-alerts-390-chromium-390.png`.
- [x] F14-3 Generated `frontend/public/favicon.ico` from existing SVG with `sips`; port-5174 curl returned 200 (`favicon-curl.txt`).
- [x] F14-4 Dashboard level badge now preserves the stale/invalid chip instead of EN VIVO; RED/GREEN test in `Dashboard.outage.test.ts`; after DOM shows `Lectura inválida` and no EN VIVO (`dom-after.txt`). Screenshots: `monitoring-1024-chromium-1024.png` → `after-monitoring-1024-chromium-1024.png`.
- [x] F14-5 `/wheel` dock oil value now shows the existing `DEMO` provenance tag beside the slider value; test in `BenchScene.fieldlabels.test.ts`; after DOM confirms adjacency (`dom-after.txt`). Screenshots: `wheel-1024-chromium-1024.png` → `after-wheel-1024-chromium-1024.png`.

## Acceptance and checks
- Evidence before/after for `/fleet` 1024, `/fleet` and `/alerts` 390, `/monitoring` 1024, `/wheel` 1024.
- Required checks if implementation proceeds: `cd frontend && bun test src`; `cd frontend && bun run build`; `curl -s -o /dev/null -w "%{http_code}" http://localhost:5174/favicon.ico`.
- RED: pre-fix focused suite failed on missing ICO, missing dashboard/dock badge helpers, and clipped-trend CSS contract (`red.txt`). Focused GREEN: 24 pass, 0 fail.
- Full checks: `bun-test.txt` (688 pass, 0 fail); `build.txt` (0 errors, exit 0); `favicon-curl.txt` (200). Screenshot runs report no browser errors.
- Route: delegated direct. Local commits: `cace06b`, `73f08dd`, `d0cdb2e`, `ec89a7e`. Existing `AGENTS.md` change preserved and not staged.
- RDD: medium / `under_budget` after each commit from base `6450d19`; no further commit-bound review due. Workspace candidates `review-427209b301325094` and `review-b8bda2ab9e2373b1` were approved and acknowledged with no findings.
- Engram mirror: pending; no authoritative runtime session identity was available.
