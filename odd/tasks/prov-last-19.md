# PROV-LAST-19 — per-field provenance on remaining values

- Objective: give every visible business value on the requested routes a same-card/row provenance label.
- Problem / why: demo, derived, assumption, gap, live and configuration values are not consistently distinguished at the field where they appear.
- Scope: task-brief owner components and dictionary label keys, one new field-label test, this task file; `/tmp/og-goal/scratch/unlabeled.mjs` may receive only the stated counting exemptions.
- Constraints: Spanish-only UI; preserve values, meaning, and layout; do not guess source; leave unknown values unlabeled and report them for owner decision; no `AGENTS.md` edits; local commits only.
- TDD: enabled by `_rules.md`; frontend runner `cd frontend && bun test src`; test commit must show RED before implementation.
- RDD: on by default (`gentle-ai review mode status`, 2026-10-12); assess each work-unit commit from the latest reviewed boundary.
- Route: delegated direct. Mapping spans 13+ route owners; writer trigger is multi-file provenance labeling and one regression test.
- Forecast: over 400 authored lines is possible. Local-only delivery; no PR or remote operation. Follow the brief's two explicit Conventional Commits.
- Mirror: Engram unavailable without a registered session identity; pending.

## Checklist
- [x] PV19-1 Add allowed counting exemptions to the scratch acceptance script; save the pre-edit route counts.
- [x] PV19-1 Add per-value/card assertions in `frontend/src/ops/prov-last.fieldlabels.test.ts`; captured RED (699 pass, 6 expected failures) at `/tmp/og-goal/evidence/PROV-LAST-19/red.txt`; test-only commit `a2d174a439c6d1d5a5315f83be0eef144e64d159` (`test(ops): specify per-field provenance on remaining business values`).
- [x] PV19-1 Add only source-supported provenance labels in allowed route owners; leave unresolved fields for owner decision.
- [x] PV19-1 Run acceptance script after, `bun test src/honesty.test.ts`, full `bun test src`, build, and detector; save outputs.
- [ ] PV19-1 Commit implementation with the brief's fix subject and record commit identity.

## Acceptance and progress
- Acceptance: all measured routes reach zero unexplained business values; only brief-listed non-business categories are excluded; unresolved-source values are named, not guessed; tests/build pass.
- Progress: requested goal sections read; baseline uses the brief's categories for timestamps (including chart-relative times), row/pagination counters, actual chart axes, repeat legends and identifiers. Exact output: `/tmp/og-goal/evidence/PROV-LAST-19/unlabeled-before.txt`. RED was observed before implementation; final focused tests pass. After-count is 0 on all 18 routes: `/tmp/og-goal/evidence/PROV-LAST-19/unlabeled-after.txt`.
- Baseline unlabelled: `/` 1; `/fleet` 0; `/monitoring` 0; `/wheel/history` 6; `/rul` 0; `/calibration` 0; `/mine` 0; `/wheel` 1; `/alerts` 0; `/alerts/detail` 6; `/alerts/rules` 14; `/devices` 60; `/link` 0; `/lab/sim` 0; `/lab/validation` 115; `/lab/bench` 0; `/report` 2; `/demo` 0.
- Source mapping resolved `/` `10 Hz` and `/wheel` `1 kHz` as CONFIGURACIÓN; no owner decision remains. Report and devices values use DEMO/EN VIVO/DERIVED per field; validation fixture truth/estimate and errors are SUSTITUTO SINTÉTICO/DERIVED.
- Verification: `bun test src/honesty.test.ts` 3/3; `bun test src` 705/705; `bun run build` exit 0; acceptance 0 unlabelled; detector output `[]`. Outputs are in `/tmp/og-goal/evidence/PROV-LAST-19/`.
- Rollback boundary: revert only this task's route-owner labels and `frontend/src/ops/prov-last.fieldlabels.test.ts`; the earlier test-only commit remains independently revertible.
- Next: record the implementation commit identity and close the task.
