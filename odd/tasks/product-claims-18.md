# PRODUCT-CLAIMS-18 — remove unsupported product claims

- Objective: remove unverifiable cost and third-party savings claims from `PRODUCT.md`.
- Why: product text must not publish unsourced economic figures or external success cases.
- Scope: replace only the two claims in the “Stated in the pre-proposal” section with the specified economics-not-established bullet; preserve historical records.
- Constraints: only `PRODUCT.md` and this task file may be edited; no figures added; local commit only; leave `AGENTS.md` untouched.
- TDD: documentation-only; no RED step. Verification runner: `bun test`.
- Route: direct inline; one mechanical, explicitly specified paragraph edit, no multi-file source work.
- Forecast: under 400 authored changed lines. Delivery: one local commit; no remote actions.
- Mirror: Engram unavailable in this runtime; pending.

## Checklist
- [x] PC18-1 Replace the two `PRODUCT.md` bullets with the exact brief text.
- [x] Verify product guard, source-copy scan, honesty test, and frontend suite; save full outputs under `/tmp/og-goal/evidence/PRODUCT-CLAIMS-18/`.
- [ ] Commit only the two authorized files with the brief's requested subject; record commit identity.

## Acceptance and progress
- Acceptance: `PRODUCT.md` has no `USD` or `Razor`; the new bullet is exact; honesty test passed (3/0) and frontend suite passed (699/0); historical references remain unchanged.
- Progress: required checks passed. Full outputs are in `/tmp/og-goal/evidence/PRODUCT-CLAIMS-18/`; remaining history references are in `odd/tasks/integrity-narrative.md`, `odd/tasks/final-design.md`, `odd/tasks/oilguard-mining-sim.md`, `docs/progreso-tarea.md`, and `docs/integrity-inventory.md`.
- Next: commit the two authorized files and record the commit identity.
