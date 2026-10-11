# FIX-PROV-02 — Per-field provenance labels

## Objective
Add adjacent source labels to the listed measurement values on `/wheel/history`, `/report`, `/wheel`, and `/alerts/detail` without changing values or thresholds.

## Findings
- P0-03..05: history KPI values (`-0.3 L`, `0.12 L/100 h`, `92%`).
- P0-06..07: history event table values (`90.4 L`, `92.8 L`).
- P0-08..09: report KPI values (`94.7 L`, `14.7 L`).
- P0-10: wheel HUD value (`66.5 L · 70%`).
- P0-11..18: alert trigger observed values and configured thresholds.

## Scope and acceptance
- Authorized routes/components only; BenchScene.tsx only for P0-10 adjacent label; dictionaries only if a label key is missing.
- Reuse existing provenance UI; preserve every numeric value, formatter, threshold, and Spanish-only visible copy.
- Render tests prove adjacent, correct-source labels; all listed route findings labeled.

## Checklist
- [ ] Add adjacent field-label tests and capture RED.
- [ ] Trace each value to its real source and implement per-field labels.
- [ ] Run required tests/build/honesty checks; capture route counts and screenshots.
- [ ] Record evidence and commits below.

## TDD, route, evidence
- TDD: ON; source `/tmp/og-goal/briefs/_rules.md`; runner `cd frontend && bun test src`.
- Route: delegated direct, one bounded writer; writer trigger applies to multi-file implementation.
- Evidence: `/tmp/og-goal/evidence/FIX-PROV-02/` (`red.txt`, checks, before/after counts, four screenshots).
- Engram mirror `odd/fix-prov-02/tasks`: pending; no authoritative session ID or memory tools available.

## Status
- In progress; implementation and verification not yet observed.
- Commits: pending.
