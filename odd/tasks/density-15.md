# DENSITY-15 — Secondary content disclosures

## Objective
Collapse, without deleting, secondary dashboard content on `/fleet`, `/alerts`, and `/rul`; preserve all values, labels, provenance, honesty notes, and backend/demo banners.

## Problem and rationale
The 1440×900 first view is saturated. Owner decision is binding: COLLAPSE (`plegar`), not delete. Keep status context, first-row filters, and the primary operational view visible where the route has one.

## Scope and constraints
- Only the source, style, dictionary, new test, and task-document paths listed in `/tmp/og-goal/briefs/DENSITY-15.md` may change.
- Spanish-only disclosure labels through existing dictionaries; native closed `<details>/<summary>` or existing disclosure pattern.
- Never collapse honesty/backend/demo banners; never remove values or their adjacent provenance.
- Current branch only; local commits only; no remote actions; never touch `AGENTS.md` or `.codex/hooks.json`.
- Engram mirror `odd/density-15/tasks`: pending (memory tools/session identity unavailable).
- Baseline captured at 1440×900: `/fleet` 45 numbers/95 badges/8 buttons/3 cards; `/alerts` 28/27/0/8; `/rul` 42/41/4/6. Full counts and method are in `/tmp/og-goal/evidence/DENSITY-15/density-before.txt`.
- Baseline screenshots are `before-{fleet,alerts,rul}-chromium-1440.png` under `/tmp/og-goal/evidence/DENSITY-15/`.
- Disclosure plan: fold Fleet helper/live panel; Alerts distribution and safety-rule note; RUL repeated card list and its charts together to avoid nested disclosures. Keep all status, provenance, outage/demo/backend indicators and RUL assumptions reachable/visible.

## TDD and verification
- RED: `cd frontend && bun test src/ops/density-15.test.ts` fails before implementation.
- GREEN: `cd frontend && bun test src/ops/density-15.test.ts`.
- Full: `cd frontend && bun test src`; `cd frontend && bun run build`; `cd frontend && bun test src/honesty.test.ts`.
- Capture full command output and 1440×900 before/after route screenshots/counts in `/tmp/og-goal/evidence/DENSITY-15/`.
- Verify all labelled primary values remain present and reachable; reduce above-fold item counts by at least 40% per route.

## Checklist
- [x] D15-1 Add regression test for secondary disclosure boundaries and primary visibility; record observed RED.
- [ ] D15-2 Collapse only approved secondary blocks on all three routes, add Spanish labels, and verify visual/value-count evidence.
- [ ] D15-3 Run required checks, update evidence/progress, and commit test then implementation with explicit paths.

## Route and progress
- Route: delegated direct (3 route components/styles, dictionaries, and regression test require multi-file mapping/writing).
- Status: in progress; baseline and D15-1 complete. Three assertions fail against the current UI, as expected: Fleet helper is outside a disclosure, Alerts distribution is outside a disclosure, and RUL has 10 disclosures rather than one encompassing cards/charts. Full output: `/tmp/og-goal/evidence/DENSITY-15/red.txt` (exit 1).
- Next: parent assesses this test work-unit commit; then collapse only approved secondary blocks, preserve primary/status/provenance, and measure after.
- Commit identities: test work unit pending.
