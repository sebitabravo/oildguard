# DENSITY-15 — Secondary content disclosures

## Objective
Collapse, without deleting, secondary dashboard content on `/fleet`, `/alerts`, and `/rul`; preserve all values, labels, provenance, honesty notes, and backend/demo banners.

## Problem and rationale
The 1440×900 first view is saturated. Owner decision is binding: COLLAPSE (`plegar`), not delete. Keep status context, first-row filters, and the primary operational view visible where the route has one. Owner clarified that the 40% reduction was not an owner requirement; report measured changes without a percentage threshold.

## Scope and constraints
- Only the source, style, dictionary, new test, and task-document paths listed in `/tmp/og-goal/briefs/DENSITY-15.md` may change.
- Spanish-only disclosure labels through existing dictionaries; native closed `<details>/<summary>` or existing disclosure pattern.
- Never collapse honesty/backend/demo banners; never remove values or their adjacent provenance.
- Current branch only; local commits only; no remote actions; never touch `AGENTS.md` or `.codex/hooks.json`.
- Engram mirror `odd/density-15/tasks`: pending (memory tools/session identity unavailable).
- Baseline captured at 1440×900: `/fleet` 45 numbers/95 badges/8 buttons/3 cards; `/alerts` 28/27/0/8; `/rul` 42/41/4/6. Full counts and method are in `/tmp/og-goal/evidence/DENSITY-15/density-before.txt`.
- Baseline screenshots are `before-{fleet,alerts,rul}-chromium-1440.png` under `/tmp/og-goal/evidence/DENSITY-15/`.
- Owner amendment: the 40% reduction threshold was not approved; report measured counts without a minimum. The Fleet table and Alerts inbox rows must remain visible.
- Disclosure plan: fold Fleet helper/live panel; Alerts distribution and safety-rule note while keeping the existing recurrence disclosure first; RUL repeated card list behind one outer disclosure while retaining each card's closed projection-chart disclosure. Keep all status, provenance, outage/demo/backend indicators and RUL assumptions reachable/visible.

## TDD and verification
- RED: `cd frontend && bun test src/ops/density-15.test.ts` fails before implementation.
- GREEN: `cd frontend && bun test src/ops/density-15.test.ts`.
- Full: `cd frontend && bun test src`; `cd frontend && bun run build`; `cd frontend && bun test src/honesty.test.ts`.
- Capture full command output and 1440×900 before/after route screenshots/counts in `/tmp/og-goal/evidence/DENSITY-15/`.
- Verify all labelled primary values remain present and reachable; report actual above-fold item counts with no minimum reduction target.

## Checklist
- [x] D15-1 Add regression test for secondary disclosure boundaries and primary visibility; record observed RED.
- [x] D15-2 Collapse approved secondary blocks only; keep Fleet table and Alerts inbox rows visible, preserve all values/provenance, and retain per-card chart disclosures.
- [x] D15-3 Run required checks, update evidence/progress, and commit test then implementation with explicit paths.

## Route and progress
- Route: delegated direct (3 route components/styles, dictionaries, and regression test require multi-file mapping/writing).
- Status: complete. No primary Fleet or Alerts rows were collapsed. Owner rejected the 40% threshold. Corrective RED/GREEN for existing alerts-order and RUL-chart contracts is recorded in `red-existing-contracts.txt` and `green-focused.txt`.
- RDD after test commit: medium, `under_budget` (assessment over `fcbe2f6`..`2dc604d`; no review due).
- After evidence: `/tmp/og-goal/evidence/DENSITY-15/measurement-after.json`; all rendered Fleet and RUL primary totals match baseline. Alerts has 25 rows/53 source tags versus 24/52 at baseline because live backend data changed; 5 summary tiles remain.
- Above-fold items (numbers/badges/buttons/cards): Fleet 45/95/8/3 → 45/95/8/3; Alerts 28/27/0/8 → 20/31/0/8; RUL 42/41/4/6 → 7/8/4/0. No minimum reduction is required.
- Full rendered values: Fleet 112 rows/1008 provenance cells/3 KPIs/1162 provenance tags; Alerts 25 rows/5 tiles/25 inbox tags/53 source tags; RUL 12 cards/12 horizons/25 metric groups/86 provenance tags. Baseline screenshots/counts: `/tmp/og-goal/evidence/DENSITY-15/before-{fleet,alerts,rul}-chromium-1440.png`; after screenshots use matching `after-` names. All after captures reported no page errors.
- Checks: focused density 3/0; `bun test src` 691/0; build exit 0 (0 errors, 8 existing hints); honesty 3/0; final `git diff --check` output is in `diff-check.txt`. Dev server stopped.
- Next: commit the secondary-only implementation locally; no remote actions.
- Commit identities: `2dc604d42b8fcc880e722225bd760407b17de32f` (`test(ops): specify secondary disclosures`); implementation pending.
