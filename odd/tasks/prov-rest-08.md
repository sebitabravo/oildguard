# PROV-REST-08 — Per-field provenance on remaining routes

**Status: COMPLETE — implementation, verification, and work-unit commits are recorded.**

## Objective and problem

Add same-card/row/tile provenance to numeric values still missing it in VISUAL-OPENCODE-03 findings V3-033..V3-040. Keep displayed values, meanings, and layout unchanged; source labels must reflect the actual data path.

## Scope and constraints

- Authorized owner files and children only: `PressurePlot.tsx`, `RulPage.tsx`, `RulPage.density.test.ts`, `SimPage.tsx`, `ValidationPage.tsx`, `Dashboard.tsx`, child `WheelPanels.tsx`, `foundation.tsx`, `LinkHealthPage.tsx`, `DeviceInventoryPage.tsx`; missing `frontend/src/i18n/dict/*.ts` keys; new `frontend/src/ops/prov-rest.fieldlabels.test.ts`; this task file. PROV-REST-08b additionally allows only the located `/lab/bench` protocol owner for V3-036: `frontend/src/lab/bench/BenchPage.tsx`.
- Already fixed; do not rework: V3-028..V3-032. `already-fixed.txt` and paired live screenshot/DOM evidence are under `/tmp/og-goal/evidence/PROV-REST-08/`.
- V3-033..V3-040 need field labels. Numeric-only labeling; keep text-only RUL descriptions untagged. Use existing provenance components and source-specific labels. Do not change values, copy meaning, thresholds, layout, `AGENTS.md`, or dependencies.

## Tasks and acceptance

- [x] PR08-1 — Inspect every finding in live DOM/screenshots and classify existing labels; mapping/evidence recorded.
- [x] PR08-2 — Add per-route structural regression coverage; genuine RED captured, then focused tests pass.
- [x] PR08-3 — Add required provenance labels for V3-033..V3-040 using each field's true source.
- [x] PR08-4 — Verification, route counts, screenshots, parent readback, and commit records are complete.

Acceptance: V3-028..V3-032 remain unchanged; every numeric value in V3-033..V3-040 has a same-card/row/tile provenance label; text-only RUL legend/descriptions remain untagged; before/after unlabeled-number counts and 1024px screenshots are saved.

## Route, TDD, and verification

- Route: delegated direct. Mapping trigger: 13 findings span 4+ files; writer trigger: 8 missing findings span multiple non-trivial files. Explorer completed read-only mapping; one writer handles the implementation after this task file exists.
- TDD: on, required by `_rules.md`; source command `cd frontend && bun test src`.
- Checks: focused regression RED/GREEN; `cd frontend && bun test src`; `cd frontend && bun run build`; `cd frontend && bun test src/honesty.test.ts`; scratch-script per-route count at 1024px; screenshots; `git diff --check`.
- Evidence: `/tmp/og-goal/evidence/PROV-REST-08/`; initial live map `/tmp/og-goal/evidence/PROV-REST-08/already-fixed.txt`.
- Forecast: about 220 authored changed lines, excluding generated files. Delivery strategy: `ask-on-risk`.
- RDD: on by default; branch `feat/integrity-narrative`. Review each work-unit commit against the last reviewed boundary and follow native consent/status only.
- Commit records: `bf16249` test commit; `4a7c505` task document; `79ed860` platform; `c75d17b` lab; `ea22545` operations. Native risk assessments remain `medium/under_budget` for the range from `fd61e29`; no review was due.

## Progress and next step

- Live check: V3-028..V3-032 already have field labels. V3-033..V3-040 are missing; V3-038 currently renders `368550` session rows and `0 de 3` channels, not the old screenshot's zero session rows. Sources and labels are itemized in `already-fixed.txt`.
- Scope amendment: PROV-REST-08b authorizes the real `/lab/bench` protocol owner only for V3-036; do not change `frontend/src/sim/bench/BenchView.tsx`.
- TDD evidence: `red-08b.txt` records the focused RED before UI fixes; `focused-08b-final.txt` records 9 pass/0 fail. The corrected regression targets `/lab/bench` and preserves the closed RUL disclosure expectation. All mapped target groups now report zero unlabeled values in `unlabeled-after.txt` (before totals: 15, 70, 19, 43, 2, 3, 3, 1; after unlabeled counts: 0 for each group).
- Verification: `full-tests.txt` reports 670 pass/0 fail; `build.txt` exits 0; `honesty-test.txt` reports 3 pass/0 fail; `git-diff-check.txt` exits 0. Before/after 1024px screenshots are in `before/` and `after/`; screenshot logs record one failed 404 resource request per route, while each route rendered.
- All in-scope route owners and the structural test are committed. The initial repository state included a pre-existing `AGENTS.md` edit; it was left untouched.
- Engram mirror pending because this runtime exposes no memory tools or registered session identity.
- Next: no remaining implementation work. The only working-tree change outside the task is the pre-existing `AGENTS.md` edit.
