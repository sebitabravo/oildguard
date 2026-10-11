# COPY-EN-07 — Spanish-only visible copy

**Status: DONE; the 2nd and 3rd dispatch decisions resolve the demo translation and narrow `/mine` label scope.**

## Objective

Remove the reported English UI text from `/demo`, `/mine`, and `/rul` without changing meaning, numbers, or internal identifiers.

## Problem and why

QA-OPENCODE-02 found English in the Spanish-only product. `/demo` renders a served docs entry; the user authorized its Spanish translation while preserving its claims and structure.

## Scope and constraints

- Authorized targets: `docs/demo-script.md` for the 2nd dispatch translation only; `frontend/src/sim/truck/TruckView.tsx` and `frontend/src/sim/truck/index.ts` for visible PLM label text only; `frontend/src/ops/rul/RulPage.tsx` and its source-token mapping; required `frontend/src/i18n/dict/*.ts` keys; `frontend/src/i18n/spanish-visible.test.ts`.
- User decision accepted: translate `docs/demo-script.md` preserving structure, timings, steps, and URLs; translate `LIVE` to `EN VIVO`, leave `DEMO` unchanged, and preserve all numbers and claims. Commit it separately as `docs(demo): translate jury demo script to spanish`.
- 3rd dispatch decision accepted: edit only the visible label in `TruckView.tsx`; keep the PLM code in its `title` attribute and preserve all internal identifiers and state-machine logic. `index.ts` is allowed only for visible label text if needed.
- Keep state/source identifiers internal; visible text stays Spanish. Do not touch `AGENTS.md`, unrelated files, design tokens, or dependencies.

## Tasks and acceptance

- [x] CEN-1 — Resolve the `/demo` source decision; user authorized the specified docs translation.
- [x] CEN-2 — Add rendered-copy regression coverage and capture RED before source changes.
- [x] CEN-3 — Translate the served demo script and remove visible state/source tokens within authorized scope.
- [x] CEN-4 — Verify zero stop-word matches on all three routes; retain before/after counts.

Acceptance: the allowed rendered text on `/demo`, `/mine` (1024 px), and `/rul` (1024 px) contains no English stop-word matches, and labels preserve their current meaning.

## Route, TDD, and checks

- Route: delegated direct; the multi-file mapping and writer triggers apply. One writer handles the scoped implementation after reading this task record.
- TDD: on; runner `cd frontend && bun test src`; RED must fail for each identified source before implementation.
- Checks: `cd frontend && bun test src`; `cd frontend && bun run build`; `cd frontend && bun test src/honesty.test.ts`; browser scan and screenshots for the three routes; Impeccable detector on changed UI targets; `git diff --check`.
- Evidence directory: `/tmp/og-goal/evidence/COPY-EN-07/`.

## Progress and next step

- `/demo` uses `getEntry("docs", "demo-script.md")`; the authorized translation keeps structure, timings, steps, URLs, numbers, and claims. The 3rd dispatch authorizes only visible `/mine` label text in `TruckView.tsx`, retaining internal codes in `title`.
- Focused RED is 0 pass / 3 assertion failures for `/demo`, `/mine`, and `/rul`; output is `/tmp/og-goal/evidence/COPY-EN-07/red.txt`. Fresh browser baseline is `/tmp/og-goal/evidence/COPY-EN-07/english-before.txt` (118, 9, and 2 matches respectively).
- CEN-2 test work unit committed as `24b6b8a test(i18n): guard Spanish-visible copy`; its pre-change RED is captured in `red.txt`.
- CEN-3 translated `docs/demo-script.md`, removed visible PLM state suffixes while retaining codes in `title`, localized the visible RUL source badge, and labeled the `/mine` section `Medidor de carga útil III`. Docs guard preserved heading structure, timings, URLs, step counts, and command blocks.
- CEN-4 checks: 662 tests pass (151,284 expectations); build completes with 0 errors (8 existing hints); honesty tests pass; browser stop-word scan is 0 for `/demo`, `/mine`, and `/rul`; Impeccable detector returns `[]`; `git diff --check` passes. The Spanish-visible test directly asserts the RUL LIVE label is `EN VIVO`. Full evidence and before/after screenshots are under `/tmp/og-goal/evidence/COPY-EN-07/`.
- Fresh browser baseline counts were 118, 9, and 2 for `/demo`, `/mine`, and `/rul`; post-change counts are 0 using the documented code/URL/ID exclusions and allowing `DEMO`.
- The authorized `/demo` translation was committed separately as `0666b5e docs(demo): translate jury demo script to spanish`; remaining UI copy and regression coverage were committed as `7fe50b9 fix(i18n): localize mine and rul copy`.
- Native assessments after both work-unit commits returned medium risk and `review_due=true` (`slice_budget_reached`, 499 then 534 lines across the accumulated range); the user-selected decline was applied separately to each exact candidate, so neither created a review record. Evidence: `assess-docs-commit.txt`, `start-docs-commit.txt`, `decline-docs-commit.txt`, `status-after-docs-decline.txt`, `assess-fix-commit.txt`, `start-fix-commit.txt`, `decline-fix-commit.txt`, and `status-after-fix-decline.txt`.
- Engram mirror pending because agent-attributed memory writes are unavailable in this runtime.
- Final task-record update follows the fix commit so its commit identity can be recorded without amending or obscuring the implementation commit.
