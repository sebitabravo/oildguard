# FIX-PROV-02 — Per-field provenance labels

## Objective and findings
Label each listed value beside the field on `/wheel/history`, `/report`, `/wheel`, and `/alerts/detail`; never change numbers or thresholds.
- P0-03: history level change `-0,3 L` — DEMO.
- P0-04: history loss rate `0,12 L/100 h` — MIXTO (DEMO data + CONFIGURACIÓN window; show split).
- P0-05: history completeness `92%` — DEMO.
- P0-06..07: history table levels `90,4 L`, `92,8 L` — DEMO.
- P0-08..09: report levels `94,7 L`, `14,7 L` — DEMO.
- P0-10: wheel HUD `66,5 L · 70%` — DEMO.
- P0-11,13,15,17: alert observed slope, level %, RMS, temperature — DEMO for demo records / EN VIVO for live records.
- P0-12,14,16,18: alert slope, level %, RMS, temperature thresholds — CONFIGURACIÓN.

## Authorized scope and acceptance
- History/report/wheel listed value cells only; alert-detail fields; BenchScene.tsx only for the P0-10 HUD label; adjacent `*.fieldlabels.test.ts`; dictionary label keys only if missing.
- Reuse existing source-badge styling and translations. Keep Spanish UI, existing formatters, values, physics, and thresholds unchanged.
- Tests render the affected components and assert adjacent labels and source splits; all 16 P0 fields are labeled.

## Stable checklist
- [x] FIX-PROV-02-T1: Add adjacent field-label tests; RED captured.
- [x] FIX-PROV-02-T2: Trace data sources and add per-field labels.
- [ ] FIX-PROV-02-T3: Run exact checks, capture route counts/screenshots, and record commits.

## TDD, route, checks, evidence
- TDD ON; source `/tmp/og-goal/briefs/_rules.md`; runner `cd frontend && bun test src`.
- Route: delegated direct; single bounded writer for multi-file UI work.
- Exact checks: `cd frontend && bun test src`; `cd frontend && bun run build`; `cd frontend && bun test src/honesty.test.ts`.
- Route evidence: `/tmp/og-goal/evidence/FIX-PROV-02/` (`red.txt`, check outputs, counts, 1024px screenshots).
- Mirror `odd/fix-prov-02/tasks`: pending because no registered session ID or memory tools are available; none invented.

## Status
- Implementation complete; final verification/evidence in progress.
- Test commit: `41d68e7 test(ops): specify provenance on four routes`.
- Fix commit: pending.
