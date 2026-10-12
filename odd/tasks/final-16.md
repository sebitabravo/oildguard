# FINAL-16 — validity-aware origin and login hit area

## Objective
Keep monitoring source wording consistent with reading validity and give the undersized `/login` control a 44 px minimum target without changing its label.

## Scope and constraints
- Only `frontend/src/ops/wheel/WheelPanels.tsx`, `frontend/src/i18n/dict/ops.ts`, `frontend/src/platform/login/**`, the two named new tests, and this task file.
- Spanish-only UI; all added visible wording uses the existing dictionary. Preserve valid-source wording and the login control's disabled state.
- Current branch only, local commits only; never touch `AGENTS.md` or `.codex/hooks.json`.
- Engram mirror `odd/final-16/tasks`: pending (no registered session identity or memory tools available).

## Tasks and acceptance
- [x] F16-1 Add RED/GREEN coverage for invalid, stale, estimate, and valid monitoring origin wording; neutral origin plus explicit validity for non-valid states, unchanged live wording for valid.
- [ ] F16-2 Measure `/login` at 1024 px; add RED/GREEN CSS-only 44 px minimum target coverage for the undersized control, without label or markup changes.
- Preserve all existing honesty guards and other behavior.

## Route and verification
- Route: delegated direct; mapping found the origin in `WheelPanels.NumericEvidence` and the sole under-44px login box in `.login__remember`.
- TDD: on, per `/tmp/og-goal/briefs/_rules.md`; runner `cd frontend && bun test src`.
- Required checks: `cd frontend && bun test src`; `cd frontend && bun run build`; `cd frontend && bun test src/honesty.test.ts`; browser measurements at 1024 px with `before.txt` and `after.txt`.
- Local commits: `fix(ops): state origin neutrally when reading is invalid or stale`; `fix(platform): give login control a 44 px hit area`.
- F16-1 evidence: `bun test src/ops/wheel/origin-validity.test.ts` failed before implementation (invalid/stale/estimate expected explicit neutral wording); `bun test src/ops/wheel/origin-validity.test.ts src/ops/wheel/WheelPanels.validity.test.ts` passed, 7 tests. Outputs: `/tmp/og-goal/evidence/FINAL-16/red-origin.txt` and `green-origin.txt`.
- Browser baseline at 1024×900: `/monitoring` shows live-origin text beside an invalid-reading chip; `/login` has exactly 1 control below 44 px (checkbox, 15 px). Screenshots and measurements: `/tmp/og-goal/evidence/FINAL-16/before-monitoring.png`, `before-login.png`, and `before.txt`.
- Status: F16-1 implemented and focused checks pass. F16-2 and combined final checks remain; the Engram mirror is pending because memory tools/session identity are unavailable.
