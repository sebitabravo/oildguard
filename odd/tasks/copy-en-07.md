# COPY-EN-07 — Spanish-only visible copy

**Status: IN PROGRESS; the 2nd and 3rd dispatch decisions resolve the demo translation and narrow `/mine` label scope.**

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
- [ ] CEN-3 — Translate the served demo script and remove visible state/source tokens within authorized scope.
- [ ] CEN-4 — Verify zero stop-word matches on all three routes; retain before/after counts.

Acceptance: the allowed rendered text on `/demo`, `/mine` (1024 px), and `/rul` (1024 px) contains no English stop-word matches, and labels preserve their current meaning.

## Route, TDD, and checks

- Route: delegated direct; the multi-file mapping and writer triggers apply. One writer handles the scoped implementation after reading this task record.
- TDD: on; runner `cd frontend && bun test src`; RED must fail for each identified source before implementation.
- Checks: `cd frontend && bun test src`; `cd frontend && bun run build`; `cd frontend && bun test src/honesty.test.ts`; browser scan and screenshots for the three routes; Impeccable detector on changed UI targets; `git diff --check`.
- Evidence directory: `/tmp/og-goal/evidence/COPY-EN-07/`.

## Progress and next step

- `/demo` uses `getEntry("docs", "demo-script.md")`; the authorized translation keeps structure, timings, steps, URLs, numbers, and claims. The 3rd dispatch authorizes only visible `/mine` label text in `TruckView.tsx`, retaining internal codes in `title`.
- Focused RED is 0 pass / 3 assertion failures for `/demo`, `/mine`, and `/rul`; output is `/tmp/og-goal/evidence/COPY-EN-07/red.txt`. Fresh browser baseline is `/tmp/og-goal/evidence/COPY-EN-07/english-before.txt` (118, 9, and 2 matches respectively).
- Application and demo source remain unchanged. Engram mirror pending because agent-attributed memory writes are unavailable in this runtime.
- Next: commit the regression-test work unit, implement only authorized copy changes, then run listed checks and record commits/evidence.
