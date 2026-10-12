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
- [x] F16-2 Measure `/login` at 1024 px; add RED/GREEN CSS-only 44 px minimum target coverage for the undersized control, without label or markup changes.
- Preserve all existing honesty guards and other behavior.

## Route and verification
- Route: delegated direct; mapping found the origin in `WheelPanels.NumericEvidence` and the sole under-44px login box in `.login__remember`.
- TDD: on, per `/tmp/og-goal/briefs/_rules.md`; runner `cd frontend && bun test src`.
- Required checks: `cd frontend && bun test src`; `cd frontend && bun run build`; `cd frontend && bun test src/honesty.test.ts`; browser measurements at 1024 px with `before.txt` and `after.txt`.
- Local commits: `fix(ops): state origin neutrally when reading is invalid or stale`; `fix(platform): give login control a 44 px hit area`.
- F16-1 evidence: `bun test src/ops/wheel/origin-validity.test.ts` failed before implementation (invalid/stale/estimate expected explicit neutral wording); `bun test src/ops/wheel/origin-validity.test.ts src/ops/wheel/WheelPanels.validity.test.ts` passed, 7 tests. Outputs: `/tmp/og-goal/evidence/FINAL-16/red-origin.txt` and `green-origin.txt`.
- RDD after F16-1: medium, `under_budget`, 89 changed lines (assessment over `6186f5a`..`2fca257`; no review due).
- Browser baseline at 1024×900: `/monitoring` shows live-origin text beside an invalid-reading chip; `/login` has exactly 1 control below 44 px (checkbox, 15 px). Screenshots and measurements: `/tmp/og-goal/evidence/FINAL-16/before-monitoring.png`, `before-login.png`, and `before.txt`.
- Commit identity: `2fca2577ccb3dc53b45322fb8effe6e9138fc785` (`fix(ops): state origin neutrally when reading is invalid or stale`).
- F16-2 RDD: medium, `under_budget`, 120 changed lines (assessment over `6186f5a`..`fa88655`; no review due).
- Commit identity: `fa88655a298d58bff76933f6cbaa44f234fa0201` (`fix(platform): give login control a 44 px hit area`).
- Above-fold/accessibility counts at 1024×900: invalid cards pairing invalidity with live-origin text 1 → 0; login controls under 44 px 1 → 0, with checkbox box 15×15 px → 44×44 px.
- F16-2 evidence: `bun test src/platform/login/login.hitarea.test.ts` failed before CSS edits because the checkbox measured 15 px; it passed after implementation (1 test). Outputs: `/tmp/og-goal/evidence/FINAL-16/red-login.txt` and `green-login.txt`.
- Browser after at 1024×900: invalid monitoring cards with live-origin wording = 0; `/login` controls under 44 px = 0, with disabled checkbox measured at 44×44 px. Screenshots and measurements: `/tmp/og-goal/evidence/FINAL-16/after-monitoring.png`, `after-login.png`, and `after.txt`.
- Build correction: four negative `.not.toContain` test assertions were replaced with boolean `.includes(...).toBe(false)` assertions because the repository's assertion type does not support that matcher form. The initial failed build is preserved as `build-initial-fail.txt`; final build output is `build.txt`.
- Combined checks after the correction: `bun test src` passed (696 tests, 0 failures); `bun run build` exited 0 (45 pages); `bun test src/honesty.test.ts` passed (3 tests); `git diff --check` passed. Outputs: `bun-test.txt`, `build.txt`, `honesty.txt`, and `diff-check.txt` under `/tmp/og-goal/evidence/FINAL-16/`.
- Parent spot check: `cd frontend && bun test src` passed (696 tests, 0 failures), output `parent-spot-test.txt`.
- Test compatibility commit: `03e6ad5eec16911c8843d64ce7a06db1b565e6bf` (`test(ops): fix origin assertion types`); RDD medium, `under_budget`, 123 changed lines over `6186f5a`..`03e6ad5`.
- Status: complete. All three code/test commits and required checks are recorded; no source changes remain. Engram mirror is pending because memory tools/session identity are unavailable.
