# CLOSE-17 — Final chart validity and evidence closeout

## Objective and problem
Remove the chart-card `EN VIVO` claim whenever its reading is stale or invalid, then record the final automated state without overstating evidence. The 1024 px monitoring chart ancestor currently has stale/invalid status text alongside a live source tag.

## Why and scope
The project’s honesty contract forbids stale measurements from appearing live. Scope is limited to the chart-card owner/children, one adjacent regression test, and the two reports named in CLOSE-17. Never edit `AGENTS.md` or other files.

## Constraints and authorization
Authorized local work and commits only on `feat/integrity-narrative`; no remote actions. Spanish-only UI; no new visible copy unless explicitly necessary. Preserve the owner’s uncommitted `AGENTS.md` change. Do not claim human comprehension or visual approval.

## Work units
- [x] A — Added a regression test for stale/invalid chart-card readings and gated the live badges on reading validity. Baseline exact 3-level-ancestor count: 1; after: 0 at 1024 px on `/monitoring`.
- [x] B — Appended `Final state (CLOSE-17)` with source-backed visual/outage measurements and checked every numeric product-readiness claim; no unsupported numeric claim required correction.

## Acceptance and checks
- Part A test fails before implementation and passes after; measured `EN VIVO` badges whose 3-level ancestor contains `Lectura inválida` or `Lectura obsoleta`: 0 after.
- Run `cd frontend && bun test src`, `cd frontend && bun run build`, `cd frontend && bun test src/honesty.test.ts`; `grep -rn "/Users/" frontend/src` has zero matches; final `git status --short` shows only owner-modified `AGENTS.md`.
- Capture full command outputs in `/tmp/og-goal/evidence/CLOSE-17/`.

## Execution record
- TDD: on per `/tmp/og-goal/briefs/_rules.md`; runner `cd frontend && bun test src`.
- Route: delegated direct; 4+ files need evidence mapping and the implementation spans source, test, and two reports.
- Forecast: approximately 100 authored changed lines; delivery strategy `ask-on-risk` (default); local logical commits per brief.
- Engram mirror `odd/close-17/tasks`: pending because no authoritative runtime session identity is available.
- Progress: Part A commit `92c5615` passed parent native review and exact acknowledgement (`approved`); non-blocking R3-001 noted the test does not exercise Dashboard prop wiring/backend-note rendering, and no correction transition was offered. Part B numeric-source audit found no unsupported claims. Final frontend tests/build/honesty passed, source grep found zero `/Users/` matches, and full outputs are in `/tmp/og-goal/evidence/CLOSE-17/`. All scoped work is complete; the three-minute comprehension test and owner visual approval remain human-only follow-ups.
