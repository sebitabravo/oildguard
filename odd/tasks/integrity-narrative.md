# OilGuard — Integrity Narrative Work Record

**Status: APPROVED / IN PROGRESS.**

This is the canonical ODD feature record. The user explicitly approved the presented plan in chat on 2026-10-10. That approval authorizes the scoped work below; it is not a native RDD receipt or delivery approval. OpenCode in Herdr `w1T:p3` is the only production writer; the parent orchestrator maps, reviews, verifies, and authorizes one work unit at a time. Do not push, open a PR, or merge.

Planning lenses used (read-only): `cognitive-doc-design` (lead with the answer, progressive disclosure, checklists), `impeccable` (planning/audit only, no UI edits, no repairs), `threejs-skill-router` (route only; no scene skills loaded, no design contract created). Artifact language is English by contract.

Path convention: all frontend paths below are repo-relative starting with `frontend/src/`. Landing files live under `frontend/src/platform/landing/`. NEW means a proposed path that does not exist yet (all NEW names verified non-existent at plan time; nothing is created by this plan).


## ODD execution metadata

- **Objective:** Close the approved integrity gaps and build the evidence-led bilingual narrative landing described below without unsupported claims.
- **Problem / why:** Current UI and docs can imply healthy or physically validated results when evidence is synthetic, unavailable, stale, or mixed-source; the landing also needs sourced physical claims and accessible static-first interaction.
- **Scope:** Front A A01–A13, then Front B B01–B12, strictly in numeric order. No task may start before its dependencies and evidence gates pass.
- **Constraints:** Preserve `.codex/hooks.json` exactly as found and never stage it. No physics/threshold changes, new dependencies, external uploads, generated claims, pushes, PRs, or merges. Keep integrity evidence explicit; unresolved facts stay unresolved. Comments in Spanish; identifiers, tests, docs, and non-UI artifacts in English; UI copy bilingual through existing dictionaries.
- **Route:** Delegated direct. Mapping trigger: 25 work units spanning more than four files; one serialized writer, OpenCode in Herdr `w1T:p3`. Parent reviews each full diff and proof before committing or advancing.
- **TDD:** On for this approved feature, explicitly selected by the user-approved plan; runner `cd frontend && bun test src`. Behavior changes require a negative test observed failing against pre-fix code in a disposable copy, then RED → GREEN → REFACTOR.
- **Checks:** Each row's focused command; applicable UI evidence matrix in §4; full checks at A13/B12: `cd frontend && bun test src`, `cd frontend && bun run build`, `python3 -m pytest -q`.
- **Forecast / delivery:** Estimate 2,500–5,000 authored changed lines including tests/docs/i18n; advisory only. Strategy `ask-on-risk`; the user selected `feature-branch-chain` before the A02 work-unit commit because the forecast exceeds the delivery budget. PR boundaries remain to be recorded when delivery is authorized; no remote delivery is authorized.
- **Engram mirror:** Pending; runtime did not register an authoritative session identity, so no agent-attributed memory write is permitted.
- **Current state (2026-10-11, America/Santiago):** Branch `feat/integrity-narrative`. A01 DONE `5122505`; A02 DONE `9a4d7a8` (medium-risk native review of the A01–A02 range acknowledged: one reliability lens, no findings); A03 DONE `8ef515f`. Nine further work-unit commits landed on top of `8ef515f`: A04 `4ed5b1a`, A05 `b7df2af`, A06 `71e0719`, Spanish-only S01–S06 `8dc5f4f` (BREAKING, 122 files), A07+A08 `e116e53`, A09+A10 `dec47dc`, A11+A12 `4f735ef`, A13+B01 `a752832`, B03 evidence `9e911c9` (B03 unit formally pending). A13 notes the F-01 order-leak post-fix green (§3.1). Fresh gates re-verified 2026-10-11: `cd frontend && bun test src` → 594 pass, 0 fail, 150319 expectations, 97 files, exit 0; `cd frontend && bun run build` → 44 pages, exit 0. B02–B12 stay pending: landing code rides in the tree per the S01–S06 commit note, units pending formal pass. The pre-existing user-owned `.codex/hooks.json` modification remains untouched. The Engram mirror remains pending. The goal is not complete.

## 1. Reading report

Baseline observed: commit `a739728703fa110789909a8079b7d8af72e04e0e` on branch `feat/final-design`. Working tree has exactly one dirty path, user-owned `M .codex/hooks.json`, which this plan never touches; the original clean-tree requirement of source-brief §9.7 stays PENDING OWNER RESOLUTION and the goal is never marked complete while dirty (see §5). No current-goal task document and no genuine human approval were found; `/tmp/og-goal/scratch` holds historical audits and screenshots, not completion evidence. Existence of every principal path in the impact map was verified narrowly (present unless marked NEW); content beyond the validation-trio scope of the prior task was not re-audited here.

The four Front-A headline integrity issues are still carried as open (annex bias/RMSE gate claims, unreported fixture RMSE, calibration/annex falsifier-status contradiction, untraceable economics in feasibility), plus the section-3 fail-visible defect family (backend outage reads as calm, mixed live/demo fleet fields, unlabeled demo confidence/sigma, self-generated calibration nominal, `stale:false` literal). Three minor corrections are also still carried (turning-circle 30.4 vs 29.7 history, cumulative-vs-per-case stress deltas, brittle line-number anchors).

Actual targeted check actually executed (prior bounded task, not a full-suite claim): `cd frontend && bun test src/lab/validation/logic.test.ts` → 18 pass, 0 fail, 60 expectations. Exact page-path pooled computation on the fixture rows the page loads: `allPairs=650`, `scored=350`, `baseline excluded=300`; pooled `RMSE=2.5152846440114875`, `bias=-0.19371885714285692`, `MAE=1.7956234285714283`. The brief's approximate "2.52 L" is confirmed by this exact value to rounding precision; it is a confirmation, not a contradictory number replacement. No claim is made about the rest of the suite, build, Python, or Rust health; nothing else was run in this planning task.

Corrections applied after the parent readback failure (all incorporated below, none implemented): the fleet merge bug lives in `frontend/src/ops/fleet/logic.ts` (`mergeLiveDevices`) plus `FleetPage.tsx`, not Dashboard; the calibration verdict bug lives in `frontend/src/lab/calibration/CalibrationPage.tsx` plus `lab/calibration/logic.ts`, not Dashboard; the defective stress table lives in `docs/bench/stress.md`, not the old task doc. Dictionaries are modular (`frontend/src/i18n/dict/ops.ts`, `dict/platform.ts`); `frontend/src/i18n/index.ts` is a merge barrel and stays READ ONLY unless a task proves a shared-behavior change is required. Displayed wheel values live in `frontend/src/ops/wheel/WheelPanels.tsx`. 3D scenes get separate deferred modules, not space inside `Landing.tsx`. The Astro integration was inspected narrowly: `frontend/src/pages/index.astro` (8 lines) renders `Landing` with `client:load` inside `PublicLayout.astro` (hardcodes `lang="en"`); `frontend/astro.config.mjs` has no i18n routing; language state is client-side via `frontend/src/i18n/index.ts` merging the modular dicts — so B02 proposes exact minimal static paths with any new locale page clearly marked proposed, and no page-architecture change happens now. Of the three disputed statistical gates, only `MIN_R2` is implemented; other real runtime gates exist elsewhere and may be cited, so the annex wording must say exactly that. The banned-term condition is two separate gaps, not one satisfied scan: guard/test/policy LITERALS are present in-repo (the raw zero-match condition stays UNRESOLVED and is never presented as satisfied by a semantic scan), and `honesty.test.ts` coverage is frontend-only (a separate coverage gap).

## 2. Impact map

Conventions: NEW = proposed, non-existent path. READ ONLY = the task may read but must not edit; any needed change there is a stop-and-report to the parent, not a silent expansion. Tests named in a task's scope test actual behavior (including a negative case that fails without the fix), never file-string snapshots. Per-field provenance means per FIELD, never row or page level.

### Front A — integrity closure

- A01 permitted: `frontend/src/dash/Dashboard.tsx`, `frontend/src/dash/analyzerAvailability.ts`, `frontend/src/dash/analyzerAvailability.test.ts`, NEW `frontend/src/dash/Dashboard.outage.test.ts`, `frontend/src/i18n/dict/ops.ts`. `frontend/src/i18n/index.ts` READ ONLY.
- A02 permitted: `frontend/src/dash/Dashboard.tsx`, NEW `frontend/src/dash/readingFreshness.ts`, NEW `frontend/src/dash/readingFreshness.test.ts`, `frontend/src/dash/Dashboard.outage.test.ts` (extended), `frontend/src/i18n/dict/ops.ts`. Freshness cutoff must trace to actual timestamps/config, not arbitrary physics tuning. `frontend/src/i18n/index.ts` READ ONLY.
- A03 permitted: `frontend/src/ops/fleet/logic.ts` (includes `mergeLiveDevices`), `frontend/src/ops/fleet/FleetPage.tsx`, `frontend/src/ops/fleet/logic.test.ts`, NEW `frontend/src/ops/fleet/FleetPage.provenance.test.ts` (component integration for per-field provenance), `frontend/src/i18n/dict/ops.ts`. `frontend/src/i18n/index.ts` READ ONLY.
- A04 permitted: `frontend/src/dash/Dashboard.tsx`, `frontend/src/ops/wheel/WheelPanels.tsx`, NEW `frontend/src/ops/wheel/WheelPanels.provenance.test.ts`, `frontend/src/dash/Dashboard.outage.test.ts` (extended), `frontend/src/i18n/dict/ops.ts`. `frontend/src/i18n/index.ts` READ ONLY.
- A05 permitted: `frontend/src/lab/calibration/CalibrationPage.tsx`, `frontend/src/lab/calibration/logic.ts`, `frontend/src/lab/calibration/logic.test.ts`, `frontend/src/i18n/dict/platform.ts`. `docs/calibration.md` NOT touched here (only in A07). `frontend/src/i18n/index.ts` READ ONLY.
- A06 permitted: `frontend/src/lab/validation/ValidationPage.tsx`, `frontend/src/lab/validation/validation.css`, `frontend/src/lab/validation/logic.test.ts`, NEW `frontend/src/lab/validation/ValidationPage.rmse.test.ts`, `frontend/src/i18n/dict/platform.ts`. Production metric `frontend/src/lab/validation/logic.ts` READ ONLY. `frontend/src/i18n/index.ts` READ ONLY.
- A07 permitted: `docs/calibration.md`, `docs/thesis-annex.md`. Nothing else.
- A08 permitted: `docs/thesis-annex.md`, with complete symbol-by-symbol anchor evidence (exhaustive, not a spot-check pretending exhaustiveness). Nothing else.
- A09 permitted: `docs/feasibility.md` (remove the untraceable case from the submission argument; the historical reason for the correction is preserved elsewhere unchanged). Nothing else.
- A10 permitted: `odd/tasks/oilguard-pro-twin.md` (history correction only). Nothing else.
- A11 permitted: `docs/bench/stress.md`, NEW `scripts/bench/recalculate_stress_deltas.py`, NEW `tests/test_stress_deltas.py`. Source JSON artifacts READ ONLY: `docs/bench/stress-baseline.json`, `docs/bench/stress-baseline-noinflux.json`, `docs/bench/stress-results.json`; method reference READ ONLY: `bench/stress/run_matrix.py` (slope of cumulative `accepted_total`, per-case before/after). The negative test must catch the cumulative-as-delta regression.
- A12 permitted: `frontend/src/honesty.test.ts`, NEW `docs/integrity-inventory.md` (proposed violations-vs-policy inventory). Wider doc remediation cannot start until the inventory returns exact additional first-party paths to the parent and the parent approves explicit bounded remediation. No list shrinking, exemptions, allowlist, encoding tricks, or history erasure.
- A13 permitted: only NEW `docs/reports/front-a-integrity.md` (evidence report). Every production, test, and doc source is READ ONLY; findings reopen the owning task instead of mutating source under QA.

Shared-file serialization for Front A: `Dashboard.tsx`, `dict/ops.ts`, `dict/platform.ts`, `docs/thesis-annex.md` are touched by more than one A task and are serialized strictly in numeric task order. No parallel writers at any time.

### Front B — narrative landing rebuild (static-first, native scroll, deferred WebGL)

- B01 permitted: only NEW `docs/research/landing-claims.md` (read-only evidence report; source trace preserves unproven claims as unproven). No invented geometry, mounts, pauses, or TRL numbers. Physical facts need source resolution, not author opinion; TRL numbers need an author decision recorded verbatim.
- B02 permitted: `frontend/src/platform/landing/Landing.tsx`, `frontend/src/platform/landing/landing.css`, NEW `frontend/src/platform/landing/beats.ts`, NEW `frontend/src/platform/landing/beats.test.ts`, NEW `frontend/src/platform/landing/locale.test.ts`, `frontend/src/i18n/dict/platform.ts`, plus editable locale-propagation scope for `frontend/src/pages/index.astro` and `frontend/src/layouts/PublicLayout.astro` (locale propagation only; all other callers keep the English default), plus proposed NEW `frontend/src/pages/es/index.astro` (PROPOSED pending human approval, not accomplished; `/` stays EN and `/es/` becomes the static ES landing). Native language links plus a deterministic initial locale in Landing keep no-JS content off localStorage. `frontend/astro.config.mjs` READ ONLY; `frontend/src/i18n/index.ts` READ ONLY unless later evidence requires a separately approved expansion. Implementation references, not working-code evidence: https://docs.astro.build/en/guides/routing/ (file-based static routes) and https://docs.astro.build/en/guides/framework-components/ (server-rendered islands plus hydration).
- B03 permitted: NEW `frontend/src/platform/landing/LandingScene.tsx`, NEW `frontend/src/platform/landing/sceneHost.ts`, NEW `frontend/src/platform/landing/landing.scene.test.ts`, `frontend/src/platform/landing/Landing.tsx`, `frontend/src/platform/landing/landing.css`, NEW exact posters `frontend/src/platform/landing/posters/assembly.svg`, `posters/sensors.svg`, `posters/cycle.svg`, `posters/oil.svg`, NEW `docs/bench/landing-performance.md`. The perf budget is SET here and the without-3D baseline is MEASURED here, before any scene work; B09 enforces. `frontend/src/twin/render/stage.ts` NOT touched (no shared-stage change unless proven necessary and parent-approved).
- B04 permitted: NEW `frontend/src/platform/landing/scenes/assembly.ts`, NEW `frontend/src/platform/landing/scenes/assembly.test.ts`, `frontend/src/platform/landing/sceneHost.ts`, `frontend/src/platform/landing/LandingScene.tsx`. Existing geometry builders (`frontend/src/sim/bench/*`, `frontend/src/sim/truck/*`, `frontend/src/twin/*`) READ ONLY for reuse; no missing imports are created in a prior task to satisfy a later one. `frontend/src/twin/render/stage.ts` NOT touched by default.
- B05 permitted: NEW `frontend/src/platform/landing/scenes/sensors.ts`, NEW `frontend/src/platform/landing/scenes/sensors.test.ts`, NEW `frontend/src/platform/landing/SensorDetails.tsx`, NEW `frontend/src/platform/landing/SensorDetails.test.ts`, `frontend/src/platform/landing/sceneHost.ts`, `frontend/src/platform/landing/LandingScene.tsx`, `frontend/src/i18n/dict/platform.ts`. Declares `scenes/assembly.ts` as anchor host if mount markers attach there. `frontend/src/i18n/index.ts` READ ONLY.
- B06 permitted: NEW `frontend/src/platform/landing/scenes/haulCycle.ts`, NEW `frontend/src/platform/landing/scenes/haulCycle.test.ts`, `frontend/src/platform/landing/sceneHost.ts`, `frontend/src/platform/landing/LandingScene.tsx`, `frontend/src/i18n/dict/platform.ts`. Existing `frontend/src/sim/truck/cycle.ts` READ ONLY (four phases; only LOAD/DUMP stationary; no invented pauses). `frontend/src/i18n/index.ts` READ ONLY.
- B07 permitted: NEW `frontend/src/platform/landing/scenes/oil.ts`, NEW `frontend/src/platform/landing/scenes/oil.test.ts`, NEW `frontend/src/platform/landing/PressurePlot.tsx`, NEW `frontend/src/platform/landing/PressurePlot.test.ts`, `frontend/src/platform/landing/sceneHost.ts`, `frontend/src/platform/landing/LandingScene.tsx`, `frontend/src/i18n/dict/platform.ts`. `frontend/src/twin/physics.ts` READ ONLY (never adjust physics or thresholds). `frontend/src/i18n/index.ts` READ ONLY.
- B08 permitted: NEW `frontend/src/platform/landing/storyProgress.ts`, NEW `frontend/src/platform/landing/storyProgress.test.ts` (native reversible progress regression), `frontend/src/platform/landing/Landing.tsx`, `frontend/src/platform/landing/landing.css`, `frontend/src/platform/landing/sceneHost.ts`, `frontend/src/platform/landing/LandingScene.tsx`. `frontend/src/twin/render/stage.ts` NOT touched by default.
- B09 permitted: NEW `frontend/src/platform/landing/sceneLifecycle.ts`, NEW `frontend/src/platform/landing/sceneLifecycle.test.ts`, `frontend/src/platform/landing/sceneHost.ts`, `frontend/src/platform/landing/LandingScene.tsx`, `docs/bench/landing-performance.md` (enforce the B03 budget; report measured comparison, no invented numbers). `frontend/src/twin/render/stage.ts` NOT touched by default.
- B10 permitted: NEW `frontend/src/platform/landing/landing.a11y.test.ts`, NEW `frontend/src/platform/landing/locale.test.ts` (both static documents carry the correct html lang with all 8 beats pre-hydration; language links usable without JS), `frontend/src/platform/landing/Landing.tsx`, `frontend/src/platform/landing/LandingScene.tsx`, `frontend/src/platform/landing/SensorDetails.tsx`, `frontend/src/platform/landing/landing.css`, `frontend/src/i18n/dict/platform.ts`, plus editable locale-propagation scope for `frontend/src/pages/index.astro` and `frontend/src/layouts/PublicLayout.astro` (locale propagation only; all other callers keep the English default; proposed NEW `frontend/src/pages/es/index.astro` stays PROPOSED pending approval). `frontend/astro.config.mjs` READ ONLY; `frontend/src/i18n/index.ts` READ ONLY unless later evidence requires a separately approved expansion.
- B11 permitted: only NEW `docs/reports/landing-visual-qa.md` (evidence report). All UI sources READ ONLY; corrections found here reopen the owning task.
- B12 permitted: only NEW `docs/reports/integrity-narrative-closeout.md` (evidence report). All production sources READ ONLY; the original goal is not marked complete without the human test and clean-tree proof.

Shared-file serialization for Front B: `Landing.tsx`, `landing.css`, `dict/platform.ts`, `LandingScene.tsx`, `sceneHost.ts` are shared across B tasks and serialized in numeric order B01 through B12. No parallel writers even when tasks look technically independent.

## 3. Task table (exactly 25 rows)

Check commands use the exact existing runners. Full checks catalog (not run in this planning task): `cd frontend && bun test src`; `cd frontend && bun run build`; `python3 -m pytest -q`; inspect `test.sh`/CI if extra Rust parity steps are needed, without inventing commands. Per-row commands below are the narrow owning-task checks plus the §4 closure proof contract. NEW marks a proposed path. Estimates are estimates, not guarantees; every row is at most 4h.

| progress | id | one-line objective | area | explicit target files | depends on | acceptance | exact command or bounded browser/manual procedure | estimate |
|---|---|---|---|---|---|---|---|---|
| DONE — commit `5122505` | A01 | Make total backend outage visually unmissable on Dashboard | frontend-dashboard | `frontend/src/dash/Dashboard.tsx`, `frontend/src/dash/analyzerAvailability.ts`, `frontend/src/dash/analyzerAvailability.test.ts`, NEW `frontend/src/dash/Dashboard.outage.test.ts`, `frontend/src/i18n/dict/ops.ts` | none (first task) | Backend-down renders a prominent outage banner and no calm/all-clear fleet message; negative test fails without the fix; disposable backend only (see §4) | `cd frontend && bun test src/dash/analyzerAvailability.test.ts src/dash/Dashboard.outage.test.ts` plus targeted manual: disposable backend down, Dashboard at 1024px EN screenshot, confirm banner; closure: §4 full capture matrix | 3h |
| DONE — commit `9a4d7a8` | A02 | Derive stale state from timestamps instead of a constant false | frontend-dashboard | `frontend/src/dash/Dashboard.tsx`, NEW `frontend/src/dash/readingFreshness.ts`, NEW `frontend/src/dash/readingFreshness.test.ts`, `frontend/src/dash/Dashboard.outage.test.ts`, `frontend/src/i18n/dict/ops.ts` | A01 | Stale indicator follows data timestamps/config; production path can reach stale; cutoff traced to actual timestamps, not physics tuning; negative test fails on the constant-false path | `cd frontend && bun test src/dash/readingFreshness.test.ts src/dash/Dashboard.outage.test.ts` plus targeted manual: aged-timestamp fixture at 1024px EN/ES; closure: §4 full capture matrix | 3h |
| DONE — commit `8ef515f` | A03 | Add per-FIELD mixed-source fleet provenance in mergeLiveDevices and FleetPage | frontend-fleet | `frontend/src/ops/fleet/logic.ts`, `frontend/src/ops/fleet/FleetPage.tsx`, `frontend/src/ops/fleet/logic.test.ts`, NEW `frontend/src/ops/fleet/FleetPage.provenance.test.ts`, `frontend/src/i18n/dict/ops.ts` | A02 | Every merged fleet field shows its own live/demo provenance at the field; no silent demo-as-live field; negative test fails when a demo field renders unlabeled | `cd frontend && bun test src/ops/fleet/logic.test.ts src/ops/fleet/FleetPage.provenance.test.ts` plus targeted manual: backend live then disposable-backend down, verify per-field labels at 1024px EN; closure: §4 full capture matrix | 4h |
| DONE — commit `4ed5b1a` | A04 | Label per-field source, units, band, and validity for numeric confidence/sigma/level where displayed | frontend-wheel | `frontend/src/dash/Dashboard.tsx`, `frontend/src/ops/wheel/WheelPanels.tsx`, NEW `frontend/src/ops/wheel/WheelPanels.provenance.test.ts`, `frontend/src/dash/Dashboard.outage.test.ts`, `frontend/src/i18n/dict/ops.ts` | A03 | Numeric confidence, sigma, and level fields each show source label, units, band where applicable, and validity per FIELD; demo values never show bare 3-decimal precision; negative test fails on an unlabeled demo number | `cd frontend && bun test src/ops/wheel/WheelPanels.provenance.test.ts src/dash/Dashboard.outage.test.ts` plus targeted manual: inspect the three numeric fields live and down at 1024px EN/ES; closure: §4 full capture matrix | 3h |
| DONE — commit `b7df2af` | A05 | Report calibration verdict as synthetic with physical state not evaluated | frontend-calibration | `frontend/src/lab/calibration/CalibrationPage.tsx`, `frontend/src/lab/calibration/logic.ts`, `frontend/src/lab/calibration/logic.test.ts`, `frontend/src/i18n/dict/platform.ts` | A04 | Self-generated curve verdict reads synthetic/nominal-synthetic with physical bench explicitly not evaluated; no bare nominal pass remains; negative test fails on the old nominal verdict | `cd frontend && bun test src/lab/calibration/logic.test.ts` plus targeted manual: open calibration verdict live and disposable-backend down, capture both states; closure: §4 full capture matrix | 3h |
| DONE — commit `71e0719` | A06 | Display recomputed fixture RMSE with provenance and falsifier context | frontend-validation | `frontend/src/lab/validation/ValidationPage.tsx`, `frontend/src/lab/validation/validation.css`, `frontend/src/lab/validation/logic.test.ts`, NEW `frontend/src/lab/validation/ValidationPage.rmse.test.ts`, `frontend/src/i18n/dict/platform.ts` | A05 | Current computed pooled RMSE 2.5152846440114875 with n=350, bias, MAE, fixture path, and non-bench falsifier note is visible; metric logic untouched; test fails without display | `cd frontend && bun test src/lab/validation/logic.test.ts src/lab/validation/ValidationPage.rmse.test.ts` plus targeted manual: Validation page at 1024px EN screenshot of RMSE tile and note; closure: §4 full capture matrix | 3h |
| DONE — commit `e116e53` (shared A07+A08) | A07 | Unify falsifier claims and mark bias/RMSE runtime gates unimplemented | docs-gates | `docs/calibration.md`, `docs/thesis-annex.md` | A06 | Both docs state one falsifier status (not evaluated on physical bench, synthetic diagnostic reported separately); of the three disputed statistical gates only MIN_R2 is implemented (other real runtime gates elsewhere may still be cited); bias/RMSE gates stated as not implemented, not passed | `cd frontend && bun test src` plus targeted manual: search gate terms in both docs and confirm identical status wording | 3h |
| DONE — commit `e116e53` (shared A07+A08) | A08 | Repair annex code anchors to actual symbols, never line numbers | docs-annex | `docs/thesis-annex.md` | A07 | Every code anchor names a real symbol; zero line-number anchors and zero anchors to nonexistent symbols remain; evidence is symbol-by-symbol exhaustive | `cd frontend && bun test src` plus targeted manual: verify each anchor resolves to a named symbol with the full anchor list pasted | 3h |
| DONE — commit `dec47dc` (shared A09+A10) | A09 | Remove untraceable economics from the submission argument | docs-feasibility | `docs/feasibility.md` | A08 serial order only, technically independent disjoint doc | USD figure removed from the submission argument with the historical correction reason preserved elsewhere unchanged; no submission reasoning depends on it | `cd frontend && bun test src` plus targeted manual: read the economic argument end to end and confirm no reliance remains | 2h |
| DONE — commit `dec47dc` (shared A09+A10) | A10 | Correct turning-circle history while preserving the correction reason | docs-history | `odd/tasks/oilguard-pro-twin.md` | A09 serial order only, technically independent disjoint doc | 30.4m VERIFIED label corrected to 29.7m with the reason for correction retained; no contradictory VERIFIED value remains | `cd frontend && bun test src` plus targeted manual: read the turning-circle passage and confirm single consistent value plus history note | 2h |
| DONE — commit `4f735ef` (shared A11+A12) | A11 | Correct stress deltas by reproducible per-case recalculation from committed JSON results | docs-stress | `docs/bench/stress.md`, NEW `scripts/bench/recalculate_stress_deltas.py`, NEW `tests/test_stress_deltas.py` | A10 serial order only, technically independent disjoint doc | Deltas recomputed per case from the committed JSONs with method shown; cumulative-as-delta presentation and inverted regression-as-improvement readings gone; negative test catches the cumulative-as-delta regression; source JSONs and physics unchanged | `python3 -m pytest -q tests/test_stress_deltas.py` with `python3 scripts/bench/recalculate_stress_deltas.py --baseline docs/bench/stress-baseline.json --after docs/bench/stress-results.json` (exact flags confirmed at implementation approval) plus targeted manual: paste observed numbers | 3h |
| DONE — commit `4f735ef` (shared A11+A12) | A12 | Inventory first-party docs and extend honesty guard only after explicit policy approval | guard-policy | `frontend/src/honesty.test.ts`, NEW `docs/integrity-inventory.md` | A11 | Inventory lists every additional first-party doc path and returns them to the parent for explicit bounded remediation approval; wider remediation does not start before inventory, allowed paths, and policy are resolved; raw zero-match stays UNRESOLVED until then; no list shrinking, exemptions, allowlist, encoding tricks, or history erasure | `cd frontend && bun test src/honesty.test.ts` plus targeted manual: record the author policy decision verbatim in the task evidence | 3h |
| DONE — commit `a752832` (shared A13+B01; F-01 post-fix green) | A13 | Front-A closure audit as evidence report only, no source mutation | audit-front-A | NEW `docs/reports/front-a-integrity.md` only; all sources READ ONLY | A12 | Live, down, and stale states captured; every demo field labeled per FIELD; docs, metrics, guard, and full applicable suites evidenced with pasted proof; findings reopen owning tasks; no new behavior added | `cd frontend && bun test src` then `cd frontend && bun run build` then `python3 -m pytest -q` plus targeted manual: attach down/stale captures per §4 matrix | 4h |
| DONE — commit `a752832` (shared A13+B01) | B01 | Resolve or trace physical and numerical claims before any landing claim or geometry | landing-evidence | NEW `docs/research/landing-claims.md` only | A13 full A closure | Read-only evidence report traces mounting points, pause count, and gear-source claims; TRL posture records the author decision verbatim; unresolved items stay unresolved; no stationary-hardware, marker, pause, or TRL number invented | Targeted manual only: read-only source trace with links or file references; no code or scene change; report gaps explicitly | 3h |
| [ ] | B02 | Write eight semantic bilingual beats as readable static content with exact Astro integration | landing-content | `frontend/src/platform/landing/Landing.tsx`, `frontend/src/platform/landing/landing.css`, NEW `frontend/src/platform/landing/beats.ts`, NEW `frontend/src/platform/landing/beats.test.ts`, NEW `frontend/src/platform/landing/locale.test.ts`, `frontend/src/i18n/dict/platform.ts`; editable locale-propagation scope for `frontend/src/pages/index.astro` and `frontend/src/layouts/PublicLayout.astro` (English default preserved for other callers); proposed NEW `frontend/src/pages/es/index.astro` (PROPOSED, `/` stays EN, `/es/` static ES) | B01 | Eight beats with one idea each, compact max 2 screens per beat and about 12 total, full EN+ES, existing tokens, no marketing tone, no-JS readable EN at `/` and ES at proposed `/es/` via server-rendered markup with native language links and deterministic initial locale; negative tests fail on missing beat, over-length beat, missing locale key, wrong html lang, missing beat pre-hydration, or JS-dependent language links | `cd frontend && bun test src/platform/landing/beats.test.ts src/platform/landing/locale.test.ts` plus targeted manual: disable JS, read all beats at `/` and proposed `/es/` top to bottom; closure: §4 full capture matrix | 4h |
| [ ] | B03 | Add deferred persistent landing scene host plus four exact static scene posters on a native scroll base | landing-host | NEW `frontend/src/platform/landing/LandingScene.tsx`, NEW `frontend/src/platform/landing/sceneHost.ts`, NEW `frontend/src/platform/landing/landing.scene.test.ts`, `frontend/src/platform/landing/Landing.tsx`, `frontend/src/platform/landing/landing.css`, NEW `frontend/src/platform/landing/posters/assembly.svg`, NEW `frontend/src/platform/landing/posters/sensors.svg`, NEW `frontend/src/platform/landing/posters/cycle.svg`, NEW `frontend/src/platform/landing/posters/oil.svg`, NEW `docs/bench/landing-performance.md` | B02 | Persistent host defers the independent 3D chunk until in viewport; four exact posters stand in without WebGL; cover loads legible before 3D exists; native scroll preserved; perf budget SET and without-3D baseline MEASURED here; negative test fails when the host loads 3D eagerly or without a poster fallback | `cd frontend && bun test src/platform/landing/landing.scene.test.ts` plus targeted manual: throttle network, confirm cover paint before 3D at 1024px and 390px; closure: §4 full capture matrix | 4h |
| [ ] | B04 | Build cutaway assembly scene with demonstrable 32.62:1 reduction and orbit/zoom/isolate controls | landing-scene-A | NEW `frontend/src/platform/landing/scenes/assembly.ts`, NEW `frontend/src/platform/landing/scenes/assembly.test.ts`, `frontend/src/platform/landing/sceneHost.ts`, `frontend/src/platform/landing/LandingScene.tsx` | B03 | Hub, carrier, planets, sun, wet brakes, and motor read in cutaway; 32.62:1 reduction demonstrable from the B01-traced source; orbit, zoom, and isolate work; negative test fails on missing part, broken reduction ratio, or dead control | `cd frontend && bun test src/platform/landing/scenes/assembly.test.ts src/platform/landing/landing.scene.test.ts` plus targeted manual: orbit/zoom/isolate each part at 1024px EN, capture three states; closure: §4 full capture matrix | 4h |
| [ ] | B05 | Add four sensor selectors with full mount, measurement, install, and modification detail per sourced truth | landing-scene-B | NEW `frontend/src/platform/landing/scenes/sensors.ts`, NEW `frontend/src/platform/landing/scenes/sensors.test.ts`, NEW `frontend/src/platform/landing/SensorDetails.tsx`, NEW `frontend/src/platform/landing/SensorDetails.test.ts`, `frontend/src/platform/landing/sceneHost.ts`, `frontend/src/platform/landing/LandingScene.tsx`, `frontend/src/i18n/dict/platform.ts` | B04 | Pressure, temperature, vibration, and current cards match the B01-traced source table (assembly.ts declared as anchor host if markers attach there); selectors open the right card; no stationary claim beyond sourced truth; negative test fails on a wrong or unselectable sensor | `cd frontend && bun test src/platform/landing/scenes/sensors.test.ts src/platform/landing/SensorDetails.test.ts` plus targeted manual: select all four sensors EN/ES, screenshot each card; closure: §4 full capture matrix | 3h |
| [ ] | B06 | Build haul-cycle scene with supported pauses and visible settled versus sloshing oil | landing-scene-C | NEW `frontend/src/platform/landing/scenes/haulCycle.ts`, NEW `frontend/src/platform/landing/scenes/haulCycle.test.ts`, `frontend/src/platform/landing/sceneHost.ts`, `frontend/src/platform/landing/LandingScene.tsx`, `frontend/src/i18n/dict/platform.ts` | B05 | Cycle uses only supported LOAD/DUMP pauses; moving oil reads agitated and stopped oil reads settled; no invented third or fourth pause; negative test fails on an extra pause or indistinguishable oil state | `cd frontend && bun test src/platform/landing/scenes/haulCycle.test.ts src/platform/landing/landing.scene.test.ts` plus targeted manual: play cycle forward and reverse at 1024px, capture moving and settled states; closure: §4 full capture matrix | 4h |
| [ ] | B07 | Build cutaway-oil scene with actual pressure/volume sensitivity plot and provenance | landing-scene-D | NEW `frontend/src/platform/landing/scenes/oil.ts`, NEW `frontend/src/platform/landing/scenes/oil.test.ts`, NEW `frontend/src/platform/landing/PressurePlot.tsx`, NEW `frontend/src/platform/landing/PressurePlot.test.ts`, `frontend/src/platform/landing/sceneHost.ts`, `frontend/src/platform/landing/LandingScene.tsx`, `frontend/src/i18n/dict/platform.ts` | B06 | Sensitivity plot uses actual read-only physics values with source and numeric provenance shown; physics and thresholds untouched; negative test fails on an untraced number or altered physics import | `cd frontend && bun test src/platform/landing/scenes/oil.test.ts src/platform/landing/PressurePlot.test.ts` plus targeted manual: verify every number on screen traces to physics or docs; closure: §4 full capture matrix | 3h |
| [ ] | B08 | Coordinate reversible native-scroll beats, scenes, and cameras with no scroll hijack | landing-scroll | NEW `frontend/src/platform/landing/storyProgress.ts`, NEW `frontend/src/platform/landing/storyProgress.test.ts`, `frontend/src/platform/landing/Landing.tsx`, `frontend/src/platform/landing/landing.css`, `frontend/src/platform/landing/sceneHost.ts`, `frontend/src/platform/landing/LandingScene.tsx` | B07 | Full forward and reverse scroll plus fast gestures keep beat, scene, and camera in agreement with no jumps; wheel behavior never hijacked; automated reversible-progress regression plus browser proof | `cd frontend && bun test src/platform/landing/storyProgress.test.ts` plus targeted manual: scroll the full landing top-to-bottom and bottom-to-top slow then fast at 1024px and 390px EN, record any jump with timestamp; closure: §4 full capture matrix | 3h |
| [ ] | B09 | Enforce render lifecycle and the B03 performance budget with measured comparison | landing-lifecycle | NEW `frontend/src/platform/landing/sceneLifecycle.ts`, NEW `frontend/src/platform/landing/sceneLifecycle.test.ts`, `frontend/src/platform/landing/sceneHost.ts`, `frontend/src/platform/landing/LandingScene.tsx`, `docs/bench/landing-performance.md` | B08 | One render loop; paused when hidden or out of view; DPR max 2; resize and dispose handled; B03 budget enforced against the measured without-3D baseline with no invented measurements; negative test fails on a leaked loop, missing dispose, or DPR breach | `cd frontend && bun test src/platform/landing/sceneLifecycle.test.ts src/platform/landing/landing.scene.test.ts` plus targeted manual: record budget table and hidden/out-of-view pause checks; closure: §4 full capture matrix | 3h |
| [ ] | B10 | Provide keyboard, reduced-motion, no-WebGL, and no-JS equivalents in both locales | landing-a11y | NEW `frontend/src/platform/landing/landing.a11y.test.ts`, NEW `frontend/src/platform/landing/locale.test.ts`, `frontend/src/platform/landing/Landing.tsx`, `frontend/src/platform/landing/LandingScene.tsx`, `frontend/src/platform/landing/SensorDetails.tsx`, `frontend/src/platform/landing/landing.css`, `frontend/src/i18n/dict/platform.ts`; editable locale-propagation scope for `frontend/src/pages/index.astro` and `frontend/src/layouts/PublicLayout.astro` (English default preserved for other callers; proposed NEW `frontend/src/pages/es/index.astro` stays PROPOSED) | B09 | Full keyboard path; reduced-motion static equivalents; no-WebGL posters; no-JS readable page at `/` (EN) and proposed `/es/` (ES) with correct html lang, all 8 beats pre-hydration, and JS-free language links; EN and ES complete; no empty-placeholder fallback; negative test fails on a keyboard trap, missing equivalent, wrong html lang, or JS-dependent language link | `cd frontend && bun test src/platform/landing/landing.a11y.test.ts src/platform/landing/locale.test.ts` plus targeted manual: keyboard-only pass and reduced-motion pass EN/ES; closure: §4 full capture matrix | 3h |
| [ ] | B11 | Pass visual acceptance across widths, languages, motion modes, scroll directions, and console health | landing-visual-QA | NEW `docs/reports/landing-visual-qa.md` only; all UI sources READ ONLY | B10 | 390/768/1024/1440 EN/ES normal and reduced motion pass; forward/reverse and fast gestures pass; zero resource or console failures; at most one bounded defect batch plus confirm, with fixes reopening their owning tasks | Targeted manual: matrix captures across four widths times two languages times two motion modes plus console log export, all pasted into the report | 4h |
| [ ] | B12 | Run final integrated audit plus three-minute human comprehension test and written close-out | audit-closeout | NEW `docs/reports/integrity-narrative-closeout.md` only; all production sources READ ONLY | B11 | Problem, location, difficulty, and physical-validation gap understood by a human in about three minutes with written evidence; simulated or model self-review never presented as the human test (pending if unavailable); full suites evidenced; tree state reported with hooks pending owner resolution; the goal is NOT marked complete without the human test and clean-tree proof | `cd frontend && bun test src` then `cd frontend && bun run build` then `python3 -m pytest -q` plus targeted manual: human comprehension notes and final captures per §4 matrix | 4h |

## 3.1 Current work log

### A01 — complete; commit `5122505`

- OpenCode added `isBackendOutage`, bilingual outage copy, a `role="alert"` banner, and `DashboardStatusNotices`, the production-rendered notices component, so the calm “four ladder levels are quiet” message is suppressed only during a live backend outage. No all-clear claim is shown while live telemetry is unavailable.
- TDD evidence from the disposable baseline archive: `bun test src/dash/Dashboard.outage.test.ts` failed before A01 because `isBackendOutage` was not exported (0 pass, 1 fail, exit 1). A mutation removing the calm-message suppression then failed the integration assertion (4 pass, 1 fail, exit 1). No live-worktree rollback was used.
- Focused GREEN: `cd frontend && bun test src/dash/analyzerAvailability.test.ts src/dash/Dashboard.outage.test.ts` → 9 pass, 0 fail, 41 expectations. The parent requested a fresh-context read-only spot check, which independently returned the same result and exit code 0. Dictionary/guard check: `bun test src/i18n/index.test.ts src/honesty.test.ts` → 9 pass, 0 fail, 5,597 expectations. `git diff --check` passed for the tracked A01 source paths.
- Screenshots under `/tmp/og-a01-e2e/`: parent inspected live 1024px EN and outage 1024px EN/ES; the alert is visible during outage and the calm notice returns after backend recovery. Parent also inspected 390px outage EN/ES, each in normal and real reduced-motion mode; the alert remains readable, title/detail wrap as one coherent message, and `matchMedia('(prefers-reduced-motion: reduce)').matches` was true for the reduced-motion captures. The earlier 390px Spanish capture that missed the alert was superseded by these complete captures.
- An earlier evidence retry mistakenly invoked `bunx astro dev` from `/tmp/og-a01-e2e`, which attempted temporary package resolution and did not serve the page; the parent interrupted it before installation. It made no tracked repository edits. Final captures were later produced using the project-local Astro binary. The disposable backend and frontend processes were stopped; ports 8001 and 5174 are clear.
- Parent read the full A01 diff and independently inspected the EN/ES desktop/mobile and reduced-motion captures. Work-unit commit: `5122505` (`fix(dashboard): surface backend outage state`), containing only the four scoped source/test files and this feature record; `.codex/hooks.json` was not staged. Native RDD remained on (default); assessment against base `a739728703fa110789909a8079b7d8af72e04e0e` returned `risk=medium`, `changed_lines=323`, `review_due=false`, `review_due_reason=under_budget`. No review transaction was started. Keep the same base-ref as the last reviewed boundary for the next commit until native review acknowledges a later range. A02 had not started at that point. The feature forecast remains 2,500–5,000 authored lines and delivery strategy is `ask-on-risk`; the user later selected `feature-branch-chain` before the A02 work-unit commit. No PR boundary or remote delivery has been created.

### A02 — DONE (verified 2026-10-10, America/Santiago; commit `9a4d7a8`; native review acknowledged; A03 not started at A02 closure)

Outcome first: A02 is complete at work-unit commit `9a4d7a8`; its native medium-risk review covered the A01–A02 committed range, admitted one reliability lens with no findings, and was acknowledged (authority burned). A01 stays DONE at commit `5122505`. At the time of A02 closure, A03 was still pending and had not started; it was completed later in commit `8ef515f`. The user-owned `.codex/hooks.json` dirt remains untouched. The user selected `feature-branch-chain` for the feature's delivery strategy; no PR or remote action is authorized or underway. The goal is not complete.

| Topic | Decision |
|-------|----------|
| Cutoff | 120 s traced to the existing device-inventory staleness threshold, not physics tuning |
| Timestamp path | Parent independently traced the live timestamp through `backend/main.py:1270` (`t_iso`), `frontend/src/sim/api.ts:59`, and the Dashboard parse path |
| Cutoff trace | 120 s comes from existing `frontend/src/platform/devices/logic.ts:24` / `DeviceInventoryPage.tsx:134` and `dict/platform.ts:298`; no physics or alert threshold changed |
| Notice semantics | Aged live readings render one amber stale notice with `role="status"` plus the stale-data validity chip, and no calm message |
| Precedence | Backend outage keeps its own higher-priority `role="alert"` banner; stale is suppressed during outage |
| Bounded correction | The first capture round showed a nested critical-red/amber box; that was corrected in the one bounded A02 correction and recaptured |
| Allowed diff | Limited to Dashboard, new `readingFreshness.ts` plus its test, the extended outage test, and `dict/ops.ts`; no dependencies added |

Verification checklist (reviewer can confirm each line):

- [x] Focused A02 GREEN: `cd frontend && bun test src/dash/readingFreshness.test.ts src/dash/Dashboard.outage.test.ts` → 25 pass, 0 fail, 120 expectations, exit 0 (full output pasted verbatim below).
- [x] Guard GREEN: `cd frontend && bun test src/i18n/index.test.ts src/honesty.test.ts` → 9 pass, 0 fail, 5605 expectations, exit 0 (full output pasted verbatim below).
- [x] Negative proof in disposable copy `/tmp/og-a02-negative.oQLvhc` (source copy only mutated to force `resolveReadingStale` to false; live worktree never reverted): `cd /tmp/og-a02-negative.oQLvhc/frontend && bun test src/dash/Dashboard.outage.test.ts` → 12 pass, 3 fail, 82 expect calls, exit 1; failures include the aged-timestamp production seam, the aged reading path, and the single stale box. This proves the stale production-status path fails under a constant-false mutation; it is expected failure evidence, not a broken live check.
- [x] `git diff --check`: no output, exit 0.
- [x] EN/ES screenshots visually inspected by the parent at `/tmp/og-a02-e2e/aged-en-1024.png` and `/tmp/og-a02-e2e/aged-es-1024.png`, each 1024×800: backend live with the aged timestamp, one amber stale notice with role=status, the stale-data validity chip, no calm message. Outage remains the higher-priority error banner.
- [x] Runtime scenario and rollback boundary for the work-unit commit: disposable stub/backend on 8001 plus local Astro on 5174; stopped disposable PIDs 97850/97972; parent checked `lsof -nP -iTCP:8001 -iTCP:5174 -sTCP:LISTEN` with no listeners returned; other ports/services left untouched; rollback equals the work-unit commit boundary only.
- [x] Honesty boundary: native RDD mode is on (decided by default). The initial worktree assessment was unassessable because the untracked progress document needed explicit scope; the committed candidate was then frozen with that untracked path excluded. The candidate covered 7 committed paths / 775 lines across A01–A02 at medium risk; user granted review, the `review-reliability` lens returned no findings, and the exact acknowledgement burned authority. The review boundary is now the A02 commit. The user selected `feature-branch-chain`; no PR or remote action is authorized or underway.

Full focused output (copied verbatim, not trimmed):

```
bun test v1.4.2 (50a8a8387)

src/dash/readingFreshness.test.ts:
(pass) reading freshness cutoff > matches the device-inventory staleness threshold (120 s, not physics tuning) [0.37ms]
(pass) isReadingStale > treats the DEMO fresh-fixture age (8 s) as fresh [0.13ms]
(pass) isReadingStale > treats the DEMO stale-fixture age (180 s) as stale [0.01ms]
(pass) isReadingStale > keeps the exact cutoff fresh and stales anything past it
(pass) isReadingStale > treats a missing or unparsable timestamp as stale without inventing an age [0.02ms]
(pass) isReadingStale > treats a future timestamp as fresh
(pass) resolveReadingStale production path > reaches stale for the live wheel with an aged backend timestamp [0.22ms]
(pass) resolveReadingStale production path > stays fresh for the live wheel with a recent backend timestamp
(pass) resolveReadingStale production path > never flags the demo walk or DEMO wheels against the wall clock [0.01ms]
(pass) resolveReadingStale production path > negative: the pre-A02 constant-false path reports valid for aged data [0.03ms]

src/dash/Dashboard.outage.test.ts:
(pass) backend outage banner state > reports an outage only for the live wheel with a failed backend [0.03ms]
(pass) backend outage banner output > renders an unmistakable alert banner in English, never the calm message [3.81ms]
(pass) backend outage banner output > renders the same alert banner localized in Spanish, never the calm message [0.14ms]
(pass) backend outage banner layout > keeps title and detail in a single coherent content node [0.31ms]
(pass) dashboard outage status path > outage without active alert shows the prominent banner and no calm message [0.44ms]
(pass) dashboard outage status path > healthy state without escalation keeps the calm notice and no outage banner [0.13ms]
(pass) dashboard stale production seam (timestamp in, notice out) > aged live timestamp resolves stale inside the component: stale box, no calm [0.31ms]
(pass) dashboard stale production seam (timestamp in, notice out) > fresh live timestamp resolves fresh inside the component: calm, no stale [0.16ms]
(pass) dashboard stale production seam (timestamp in, notice out) > outage keeps precedence through the seam: alert banner, stale suppressed [0.24ms]
(pass) dashboard stale reading status path > aged live timestamp renders the stale notice and no calm message [0.35ms]
(pass) dashboard stale reading status path > fresh live timestamp keeps the calm notice and no stale banner [0.90ms]
(pass) dashboard stale reading status path > negative: forcing the pre-A02 constant-false path hides the stale state [0.08ms]
(pass) dashboard stale reading status path > outage keeps its own banner without duplicating the stale notice [0.09ms]
(pass) stale notice layout > keeps title and detail in a single coherent content node [0.51ms]
(pass) stale notice layout > renders one stale box with status semantics, never nested in the outage lane [0.16ms]

25 pass
0 fail
120 expect() calls
Ran 25 tests across 2 files. [89.00ms]
```

Exit 0.

Full guard output (copied verbatim, not trimmed):

```
bun test v1.4.2 (50a8a8387)

src/honesty.test.ts:
(pass) honesty matcher > normalizes case and accents while respecting short-token boundaries [5.29ms]
(pass) frontend honesty guard > contains no unsupported claims or machine-control actions [361.38ms]

src/i18n/index.test.ts:
(pass) i18n dictionary > every key has non-empty EN and ES copy [1.22ms]
(pass) i18n dictionary > no sprint or task codes leak into UI copy [0.81ms]
(pass) i18n dictionary > Spanish dictionary copy keeps required accents [2.41ms]
(pass) i18n dictionary > Spanish dictionary copy uses decimal commas outside factual specifications [0.96ms]
(pass) i18n dictionary > the demo lab note formats every displayed number for the selected language [2.81ms]
(pass) i18n dictionary > the dashboard footnote reflects the geometry-derived pressure [0.12ms]
(pass) navigation exposes the three product sections [0.02ms]

9 pass
0 fail
5605 expect() calls
Ran 9 tests across 2 files. [448.00ms]
```

Exit 0.

### A03 — DONE (commit `8ef515f`; A04 next)

The committed A03 diff contains only the five permitted fleet/i18n paths: `logic.ts`, `FleetPage.tsx`, `logic.test.ts`, the new `FleetPage.provenance.test.ts`, and `dict/ops.ts` (`git show --format= --name-only HEAD`). `mergeLiveDevices` records provenance per field; the rendered level and synthetic sigma carry distinct badges even in a LIVE row. This closes the fleet mixed-source task, not the separate Dashboard/wheel numeric validity work in A04 or the full Front-A capture matrix at A13.

- Focused GREEN, independently spot-checked after the sigma correction: `cd frontend && bun test src/ops/fleet/logic.test.ts src/ops/fleet/FleetPage.provenance.test.ts` — 20 pass, 0 fail, 247 expectations across two files, exit 0. Full captured output follows.
- Isolated negative proof: a disposable `git archive HEAD` copy had only the sigma field-source entry/type and the sigma DEMO badge removed; its tests were unchanged and the live worktree was not reverted. In that copy, `cd <temp>/frontend && bun test src/ops/fleet/logic.test.ts src/ops/fleet/FleetPage.provenance.test.ts` — 17 pass, 3 fail, 235 expectations, exit 1. The three failures identify missing sigma provenance in live/demo rows and the missing DEMO badge beside sigma in the EN/ES rendering. The disposable copy was cleaned up. Full captured combined stdout/stderr follows.
- The 1024 px English screenshots `/private/tmp/og-a03-e2e/fleet-live-en-1024.png` and `/private/tmp/og-a03-e2e/fleet-down-en-1024.png` were read back: the live row shows LIVE on the measured level and DEMO on synthetic sigma and other demo telemetry; the fallback rows show DEMO. The screenshot evidence is limited to this targeted state/width/language pair; the broader EN/ES, mobile, and reduced-motion closure matrix remains for A13. The 1024 px table is dense, with some badges overlapping adjacent content; do not treat these screenshots as a layout-quality pass.
- No new RDD/review result or delivery authority is claimed for A03 here. No push, PR, merge, or remote operation occurred in this documentation closeout. `.codex/hooks.json` remains user-owned and untouched; the Engram mirror is unavailable/pending because no authoritative session identity was provided to this pane.

Full focused GREEN output (captured after the sigma correction):

```text
bun test v1.4.2 (50a8a8387)

src/ops/fleet/FleetPage.provenance.test.ts:
(pass) fleet per-field provenance > a LIVE-merged row keeps demo telemetry labeled DEMO at the field [18.15ms]
(pass) fleet per-field provenance > demo rows label every field DEMO [0.91ms]
(pass) fleet per-field provenance > live device without a level keeps level DEMO while last-comm stays LIVE [1.09ms]
(pass) fleet per-field provenance > negative: a demo temperature in a LIVE row renders unlabeled without the fix [1.01ms]
(pass) fleet per-field provenance > level LIVE does not cover demo sigma: distinct badges EN+ES [0.74ms]

src/ops/fleet/logic.test.ts:
(pass) fleet overview logic > groups demo wheels by truck and preserves both positions [0.09ms]
(pass) fleet overview logic > counts alerts and communication states [0.20ms]
(pass) fleet overview logic > filters model, state, and wheel search [0.11ms]
(pass) fleet overview logic > replaces matching demo rows with live levels and source [0.05ms]
(pass) fleet overview logic > serializes visible rows as escaped CSV [0.53ms]
(pass) fleet overview logic > builds the monitoring detail link [0.03ms]
(pass) fleet overview logic > formats ages and keeps demo telemetry within the fixed reference day [0.14ms]
(pass) fleet per-field provenance in mergeLiveDevices > demo rows mark every merged field DEMO [0.05ms]
(pass) fleet per-field provenance in mergeLiveDevices > live merge marks only level and last-comm LIVE, demo telemetry stays DEMO [0.07ms]
(pass) fleet per-field provenance in mergeLiveDevices > live device without a level keeps level DEMO while last-comm stays LIVE [0.05ms]
(pass) fleet per-field provenance in mergeLiveDevices > live-only devices mark synthesized telemetry DEMO [0.08ms]
(pass) fleet per-field provenance in mergeLiveDevices > negative: row-level LIVE alone would silently present demo telemetry as live [0.03ms]
(pass) fleet per-field provenance in mergeLiveDevices > fleetFieldSource reads the per-field provenance map [0.02ms]
(pass) fleet per-field provenance in mergeLiveDevices > live merge keeps sigma DEMO while level goes LIVE [0.26ms]
(pass) fleet per-field provenance in mergeLiveDevices > demo rows mark sigma DEMO [0.01ms]

 20 pass
 0 fail
 247 expect() calls
Ran 20 tests across 2 files. [133.00ms]
```

Exit 0.

Full isolated-negative combined stdout/stderr (captured from the disposable copy):

```text
bun test v1.4.2 (50a8a8387)

src/ops/fleet/FleetPage.provenance.test.ts:
(pass) fleet per-field provenance > a LIVE-merged row keeps demo telemetry labeled DEMO at the field [12.07ms]
(pass) fleet per-field provenance > demo rows label every field DEMO [0.86ms]
(pass) fleet per-field provenance > live device without a level keeps level DEMO while last-comm stays LIVE [0.76ms]
(pass) fleet per-field provenance > negative: a demo temperature in a LIVE row renders unlabeled without the fix [0.65ms]
116 |       const cells = cellsOf(renderRow(lang, row));
117 |       const levelCell = cells[1] ?? "";
118 |       const liveLabel = t("fleet.source.live", lang);
119 |       const demoLabel = t("fleet.source.demo", lang);
120 |       expect(levelCell.includes(liveLabel)).toBe(true);
121 |       expect(levelCell.includes(demoLabel)).toBe(true);
                                                  ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (/private/var/folders/bj/3qcy2bvx4n5_qbxhsbg9cww40000gn/T/oilguard-a03-negative-h8z5zqn1/frontend/src/ops/fleet/FleetPage.provenance.test.ts:121:45)
(fail) fleet per-field provenance > level LIVE does not cover demo sigma: distinct badges EN+ES [4.19ms]

src/ops/fleet/logic.test.ts:
(pass) fleet overview logic > groups demo wheels by truck and preserves both positions [0.10ms]
(pass) fleet overview logic > counts alerts and communication states [0.17ms]
(pass) fleet overview logic > filters model, state, and wheel search [0.11ms]
(pass) fleet overview logic > replaces matching demo rows with live levels and source [0.05ms]
(pass) fleet overview logic > serializes visible rows as escaped CSV [0.60ms]
(pass) fleet overview logic > builds the monitoring detail link [0.02ms]
(pass) fleet overview logic > formats ages and keeps demo telemetry within the fixed reference day [0.19ms]
(pass) fleet per-field provenance in mergeLiveDevices > demo rows mark every merged field DEMO [0.05ms]
(pass) fleet per-field provenance in mergeLiveDevices > live merge marks only level and last-comm LIVE, demo telemetry stays DEMO [0.07ms]
(pass) fleet per-field provenance in mergeLiveDevices > live device without a level keeps level DEMO while last-comm stays LIVE [0.04ms]
(pass) fleet per-field provenance in mergeLiveDevices > live-only devices mark synthesized telemetry DEMO [0.07ms]
(pass) fleet per-field provenance in mergeLiveDevices > negative: row-level LIVE alone would silently present demo telemetry as live [0.03ms]
(pass) fleet per-field provenance in mergeLiveDevices > fleetFieldSource reads the per-field provenance map [0.03ms]
163 |       latest_level_liters: 91.2,
164 |       last_t_iso: "2026-10-10T09:00:00.000Z",
165 |     }]);
166 |     const row = live.find((item) => item.id === "wheel-RH-01");
167 |     expect(row?.fieldSources.level).toBe("LIVE");
168 |     expect(row?.fieldSources).toMatchObject({ sigma: "DEMO" });
                                    ^
error: expect(received).toMatchObject(expected)

  {
-   "sigma": "DEMO",
+   "alert": "DEMO",
+   "lastComm": "LIVE",
+   "level": "LIVE",
+   "lossRate": "DEMO",
+   "regime": "DEMO",
+   "temperature": "DEMO",
+   "trend": "DEMO",
+   "vibration": "DEMO",
  }

- Expected  - 1
+ Received  + 8

      at <anonymous> (/private/var/folders/bj/3qcy2bvx4n5_qbxhsbg9cww40000gn/T/oilguard-a03-negative-h8z5zqn1/frontend/src/ops/fleet/logic.test.ts:168:31)
(fail) fleet per-field provenance in mergeLiveDevices > live merge keeps sigma DEMO while level goes LIVE [3.92ms]
168 |     expect(row?.fieldSources).toMatchObject({ sigma: "DEMO" });
169 |   });
170 |
171 |   test("demo rows mark sigma DEMO", () => {
172 |     // El sigma demo necesita procedencia propia para no leerse como vivo en una fila LIVE.
173 |     expect(rows[0]?.fieldSources).toMatchObject({ sigma: "DEMO" });
                                        ^
error: expect(received).toMatchObject(expected)

  {
-   "sigma": "DEMO",
+   "alert": "DEMO",
+   "lastComm": "DEMO",
+   "level": "DEMO",
+   "lossRate": "DEMO",
+   "regime": "DEMO",
+   "temperature": "DEMO",
+   "trend": "DEMO",
+   "vibration": "DEMO",
  }

- Expected  - 1
+ Received  + 8

      at <anonymous> (/private/var/folders/bj/3qcy2bvx4n5_qbxhsbg9cww40000gn/T/oilguard-a03-negative-h8z5zqn1/frontend/src/ops/fleet/logic.test.ts:173:35)
(fail) fleet per-field provenance in mergeLiveDevices > demo rows mark sigma DEMO [0.08ms]

 17 pass
 3 fail
 235 expect() calls
Ran 20 tests across 2 files. [130.00ms]
```

Exit 1 (expected negative proof).

### A04 — DONE (functional evidence accepted; closed without commit by user authorization)

- **Authorized paths:** `frontend/src/dash/Dashboard.tsx`, `frontend/src/ops/wheel/WheelPanels.tsx`, NEW `frontend/src/ops/wheel/WheelPanels.provenance.test.ts`, `frontend/src/dash/Dashboard.outage.test.ts`, `frontend/src/i18n/dict/ops.ts`; `frontend/src/i18n/index.ts` is read-only. Only this feature record and `docs/progreso-tarea.md` may be updated as task records.
- **Acceptance:** Numeric confidence, sigma, and level each show their own provenance, units, uncertainty band where applicable, and validity in live and backend-down states; demo figures never appear as unlabeled three-decimal measurements. UI copy remains bilingual. No physics constants, thresholds, dependencies, or unrelated sources change.
- **TDD/checks:** TDD is ON from this approved feature plan; exact runner `cd frontend && bun test src`. Observe RED from tests first, then GREEN and an isolated disposable-copy negative proof. Focused command: `cd frontend && bun test src/ops/wheel/WheelPanels.provenance.test.ts src/dash/Dashboard.outage.test.ts`; original work-order check: `cd frontend && bun test src/dash && bun run build`. Capture full output and exit status. Browser evidence targets live/down at 1024 px in EN and ES using local-only disposable processes. No A05 work, stage/commit, native review, or remote action is authorized in this bounded unit.
- **Observed implementation state:** Uncommitted edits exist in the five permitted A04 source/test/i18n paths. Numeric level, sigma, and confidence now have field-level evidence rendering; the tests cover mixed-source and backend-down cases. The user separately authorized exactly two A03 test-typing changes, which the parent applied in `frontend/src/ops/fleet/logic.test.ts:168,173`: `toMatchObject({ sigma: "DEMO" })` became direct `.fieldSources.sigma.toBe("DEMO")`; no A03 production behavior changed. The user then explicitly authorized closing A04 without a commit because the work order prohibits commits. The wider capture matrix remains reserved for A13.
- **TDD RED:** Before A04 production edits, the focused command against test-only changes returned 15 pass, 3 fail, 107 expectations, exit 1. Failures covered the missing local Dashboard confidence field and missing level/DEMO field evidence in `TelemetryRow`. The full RED output remains in the execution transcript; it is not reconstructed here.
- **Focused GREEN, rerun on the current tree:** `cd frontend && bun test src/ops/wheel/WheelPanels.provenance.test.ts src/dash/Dashboard.outage.test.ts` — 18 pass, 0 fail, 138 expectations across two files; exit 0. Full combined output is recorded below.
- **Required build check:** `cd frontend && bun test src/dash && bun run build` — 78 pass, 0 fail, 462 expectations across 18 Dashboard test files; `astro check` returned 0 errors, 0 warnings, 10 hints; 40 static pages built; compound exit 0. Vite separately warned about a chunk above 500 kB; that is not an `astro check` warning. The first post-fix run passed, and a second run captured full combined output below. The earlier exit-1 blocker remains historical evidence, not the current result.
- **Honesty/i18n guard:** `cd frontend && bun test src/i18n/index.test.ts src/honesty.test.ts` — 9 pass, 0 fail, 5629 expectations across two files, exit 0.
- **Isolated negative proof:** In a disposable `git archive HEAD` copy, the five current A04 files were overlaid and dependencies linked; only `<NumericEvidence field="sigma" source={sigmaSource}>` was mutated to `source="LIVE"`, leaving tests intact and the live worktree unchanged. The exact focused command in the copy produced 17 pass, 1 fail, 122 expectations, exit 1; the failed assertion expected sigma's DEMO label but received LIVE and `Valid reading`. The copy was deleted.
- **Targeted browser evidence:** A locally owned stub on `127.0.0.1:8001` served finite live level 91.2 L, sigma 0.46 L, confidence 0.908; Astro ran on 5174 with `PUBLIC_BACKEND_URL` aimed at the stub, and owned headless Chrome/CDP ran on 9223. At 1024×800, `/tmp/og-a04-e2e/live-en-1024.png` and `live-es-1024.png` show separate LIVE source/validity for level, sigma and confidence; `down-en-1024.png` and `down-es-1024.png` show separate DEMO source/synthetic-validity and a backend-unreachable alert after stopping the stub. All four screenshots were inspected. Confidence is displayed to two decimals with a unitless 0–1 label; sigma and level carry liters and a band. The broader widths/reduced-motion matrix remains for A13. All three locally owned processes stopped, ports 8001/5174/9223 clear; no unrelated listener was stopped.
- **Delivery boundary:** No stage, commit, native review, push, PR, merge, or remote operation. User-owned `.codex/hooks.json` preserved. `git diff --check` on the scoped tracked changes and the new test returned no whitespace errors. A05 is the next authorized work unit.
- **Engram mirror:** Pending/unavailable because this pane has no authoritative runtime session ID or tools.

Full focused GREEN output from the current-tree rerun (combined stdout/stderr):

```text
bun test v1.4.2 (50a8a8387)

src/dash/Dashboard.outage.test.ts:
(pass) backend outage banner state > reports an outage only for the live wheel with a failed backend [0.84ms]
(pass) backend outage banner output > renders an unmistakable alert banner in English, never the calm message [4.62ms]
(pass) backend outage banner output > renders the same alert banner localized in Spanish, never the calm message [0.09ms]
(pass) backend outage banner layout > keeps title and detail in a single coherent content node [0.32ms]
(pass) dashboard outage status path > outage without active alert shows the prominent banner and no calm message [0.29ms]
(pass) dashboard outage status path > healthy state without escalation keeps the calm notice and no outage banner [0.07ms]
(pass) dashboard stale production seam (timestamp in, notice out) > aged live timestamp resolves stale inside the component: stale box, no calm [0.20ms]
(pass) dashboard stale production seam (timestamp in, notice out) > fresh live timestamp resolves fresh inside the component: calm, no stale [0.08ms]
(pass) dashboard stale production seam (timestamp in, notice out) > outage keeps precedence through the seam: alert banner, stale suppressed [0.14ms]
(pass) dashboard stale reading status path > aged live timestamp renders the stale notice and no calm message [0.35ms]
(pass) dashboard stale reading status path > fresh live timestamp keeps the calm notice and no stale banner [1.27ms]
(pass) dashboard stale reading status path > negative: forcing the pre-A02 constant-false path hides the stale state [0.08ms]
(pass) dashboard stale reading status path > outage keeps its own banner without duplicating the stale notice [0.10ms]
(pass) stale notice layout > keeps title and detail in a single coherent content node [0.36ms]
(pass) stale notice layout > renders one stale box with status semantics, never nested in the outage lane [0.43ms]
(pass) dashboard numeric provenance path > the local wheel render does not expose bare demo confidence [13.01ms]

src/ops/wheel/WheelPanels.provenance.test.ts:
(pass) wheel numeric evidence > mixed-source level, sigma and confidence each carry their own source and validity [1.63ms]
(pass) wheel numeric evidence > backend-down demo level is not shown as a live valid reading [0.60ms]

 18 pass
 0 fail
 138 expect() calls
Ran 18 tests across 2 files. [119.00ms]
```

Exit 0.

Full second required-check combined stdout/stderr, from the passing post-typing-fix rerun (only terminal trailing spaces removed for Markdown hygiene):

```text
bun test v1.4.2 (50a8a8387)

src/dash/readingFreshness.test.ts:
(pass) reading freshness cutoff > matches the device-inventory staleness threshold (120 s, not physics tuning) [0.02ms]
(pass) isReadingStale > treats the DEMO fresh-fixture age (8 s) as fresh [0.06ms]
(pass) isReadingStale > treats the DEMO stale-fixture age (180 s) as stale [0.01ms]
(pass) isReadingStale > keeps the exact cutoff fresh and stales anything past it [0.01ms]
(pass) isReadingStale > treats a missing or unparsable timestamp as stale without inventing an age [0.02ms]
(pass) isReadingStale > treats a future timestamp as fresh [0.01ms]
(pass) resolveReadingStale production path > reaches stale for the live wheel with an aged backend timestamp [0.04ms]
(pass) resolveReadingStale production path > stays fresh for the live wheel with a recent backend timestamp [0.01ms]
(pass) resolveReadingStale production path > never flags the demo walk or DEMO wheels against the wall clock [0.01ms]
(pass) resolveReadingStale production path > negative: the pre-A02 constant-false path reports valid for aged data [0.04ms]

src/dash/svgPresentationAttributes.test.ts:
(pass) Preact SVG presentation attributes > uses standards-compliant dashed names throughout the TSX tree [140.13ms]

src/dash/alertSeverity.test.ts:
(pass) alert severity colors > preserves the shared N1–N4 palette [0.20ms]
(pass) alert severity colors > both dashboard consumers use the shared map instead of local copies [1.96ms]

src/dash/LevelChart.test.tsx:
(pass) LevelChart locale formatting > threshold labels use the selected language decimal separator [7.59ms]

src/dash/evaluationReason.test.ts:
(pass) unevaluated analysis reason localization > localizes every stable backend reason code [0.18ms]
(pass) unevaluated analysis reason localization > does not expose an unknown backend diagnostic [0.03ms]

src/dash/backendNotes.test.ts:
(pass) dashboard backend note localization > localizes known alert and fallback notes in Spanish [0.14ms]
(pass) dashboard backend note localization > localizes the known suppressed-RUL backend explanation without changing English [0.05ms]
(pass) dashboard backend note localization > preserves known English notes and passes unknown backend text through verbatim [0.02ms]
(pass) dashboard backend note localization > preserves prototype property names as unknown backend text [0.10ms]

src/dash/RulPanel.test.tsx:
(pass) RUL suppression explanation > formats RUL metrics with the selected language's decimal separator [1.79ms]
(pass) RUL suppression explanation > uses critical, warning, then normal colors by the eight-hour horizon with localized text [0.75ms]
(pass) RUL suppression explanation > renders the clean-baseline reason in English and Spanish [0.15ms]
(pass) RUL suppression explanation > keeps an unknown backend suppression reason verbatim [0.04ms]
(pass) RUL suppression explanation > localizes the known no-rows backend reason and preserves its English wording [0.06ms]
(pass) RUL suppression explanation > uses the structured localized reason instead of a raw backend diagnostic [0.04ms]
(pass) RUL suppression explanation > keeps analyzer import diagnostics out of the unavailable panel [0.08ms]
(pass) RUL suppression explanation > prioritizes analyzer-unavailable copy over structured notes in both languages [0.22ms]
(pass) RUL suppression explanation > renders structured RUL note and reason messages in both languages [0.39ms]

src/dash/signingBadge.test.ts:
(pass) measurement signing badge state > does not render when the backend does not provide signing status [0.03ms]
(pass) measurement signing badge state > shows the enforced healthy state with rejection count [0.03ms]
(pass) measurement signing badge state > marks enforcement-off and rejected states distinctly [0.02ms]

src/dash/Dashboard.outage.test.ts:
(pass) backend outage banner state > reports an outage only for the live wheel with a failed backend [0.03ms]
(pass) backend outage banner output > renders an unmistakable alert banner in English, never the calm message [0.22ms]
(pass) backend outage banner output > renders the same alert banner localized in Spanish, never the calm message [0.05ms]
(pass) backend outage banner layout > keeps title and detail in a single coherent content node [0.17ms]
(pass) dashboard outage status path > outage without active alert shows the prominent banner and no calm message [0.22ms]
(pass) dashboard outage status path > healthy state without escalation keeps the calm notice and no outage banner [0.07ms]
(pass) dashboard stale production seam (timestamp in, notice out) > aged live timestamp resolves stale inside the component: stale box, no calm [0.14ms]
(pass) dashboard stale production seam (timestamp in, notice out) > fresh live timestamp resolves fresh inside the component: calm, no stale [0.07ms]
(pass) dashboard stale production seam (timestamp in, notice out) > outage keeps precedence through the seam: alert banner, stale suppressed [0.08ms]
(pass) dashboard stale reading status path > aged live timestamp renders the stale notice and no calm message [0.08ms]
(pass) dashboard stale reading status path > fresh live timestamp keeps the calm notice and no stale banner [0.09ms]
(pass) dashboard stale reading status path > negative: forcing the pre-A02 constant-false path hides the stale state [0.08ms]
(pass) dashboard stale reading status path > outage keeps its own banner without duplicating the stale notice [0.11ms]
(pass) stale notice layout > keeps title and detail in a single coherent content node [0.13ms]
(pass) stale notice layout > renders one stale box with status semantics, never nested in the outage lane [0.08ms]
(pass) dashboard numeric provenance path > the local wheel render does not expose bare demo confidence [6.75ms]

src/dash/demoCopy.test.ts:
(pass) demo dashboard copy > formats the lab note with the selected language's decimal separator [0.36ms]

src/dash/levelAxis.test.ts:
(pass) level chart time axis > spreads five ticks from the oldest sample to now [0.08ms]
(pass) level chart time axis > labels spans in seconds below three minutes and minutes above [0.19ms]

src/dash/chartLayout.test.ts:
(pass) level chart layout > matches the rendered SVG width while preserving fixed-pixel text scale [0.05ms]
(pass) level chart layout > inline layout keeps text at fixed size and bounds the height [0.03ms]

src/dash/levelSeries.test.ts:
(pass) live level series merge > sorts by timestamp and replaces duplicate timestamps with the latest sample [0.13ms]

src/dash/backendMessages.test.ts:
(pass) structured backend messages > the shared catalog has bilingual entries with exactly the declared placeholders [0.42ms]
(pass) structured backend messages > every catalog message renders without unresolved placeholders [1.61ms]
(pass) structured backend messages > formats backend numbers for the selected locale and uses localized PLM zone labels [0.45ms]
(pass) structured backend messages > rounds only the RUL no-leak-trend slope to two decimal places [0.19ms]
(pass) structured backend messages > known codes select translations while unknown codes preserve the legacy field exactly [0.03ms]
(pass) structured backend messages > local leak-demo alerts use the shared structured ladder messages [0.56ms]

src/dash/analyzerAvailability.test.ts:
(pass) analyzer availability notice > returns the exact localized generic notice without exposing diagnostics [0.08ms]
(pass) analyzer availability notice > does not classify a healthy empty store or precision-suppressed RUL as an outage [0.02ms]
(pass) analyzer availability notice > recognizes an unavailable endpoint even when health is not yet available

src/dash/rulHorizon.test.ts:
(pass) RUL threshold horizon > critical horizon takes priority when both thresholds are within the shift [0.01ms]
(pass) RUL threshold horizon > uses the warning horizon when critical is not within the shift
(pass) RUL threshold horizon > uses the normal horizon when neither threshold is within the shift
(pass) RUL threshold horizon > accepts an explicit shift length

src/dash/fleetRisk.test.ts:
(pass) fleet demo combined-risk rule > does not alert unless at least two of three proxy channels cross their assumptions [0.08ms]
(pass) fleet demo combined-risk rule > alerts at two crossed boundaries and reports the contributing channels [0.04ms]
(pass) fleet demo combined-risk rule > does not treat current as a fourth alert channel [0.01ms]
(pass) fleet demo combined-risk rule > uses the latest sample in each series for the combined rule [0.04ms]
(pass) fleet demo wheel positions > lists the same four positions for every truck and marks the GDY106 wheel separately [0.14ms]

src/dash/fleetLive/logic.test.ts:
(pass) fleet live logic > derives websocket URL and preserves a configured path [0.07ms]
(pass) fleet live logic > rejects incomplete payloads and parses nullable latency [0.17ms]
(pass) fleet live logic > classifies queue, drops, and latency thresholds [0.06ms]
(pass) fleet live logic > uses capped exponential reconnect delays [0.02ms]
(pass) fleet live logic > merges websocket and polling fields without losing metrics [0.05ms]
(pass) fleet live logic > recognizes the backend no-rows response [0.02ms]

 78 pass
 0 fail
 462 expect() calls
Ran 78 tests across 18 files. [370.00ms]
$ astro check && astro build
21:35:10 [vite] Re-optimizing dependencies because vite config has changed
21:35:10 [content] Syncing content
21:35:10 [content] Synced content
21:35:10 [types] Generated 669ms
21:35:10 [check] Getting diagnostics for Astro files in /Users/sebitabravo/Developer/oilguard/frontend...
[96msrc/ops/alerts/AlertDetailPage.tsx[0m:[93m40[0m:[93m31[0m - [93mwarning[0m[90m ts(6133): [0m'record' is declared but its value is never read.

[7m40[0m function SignalCharts({ lang, record, window, live }: { lang: Lang; record: AlertRecord; window: SignalWindow | null; live: boolean }) {
[7m  [0m [93m                              ~~~~~~[0m

[96msrc/sim/bench/BenchScene.tsx[0m:[93m130[0m:[93m38[0m - [93mwarning[0m[90m ts(6133): [0m'controls' is declared but its value is never read.

[7m130[0m     const { scene, camera, renderer, controls } = stage;
[7m   [0m [93m                                     ~~~~~~~~[0m

[96msrc/twin/fleet/fleetSim.ts[0m:[93m383[0m:[93m11[0m - [93mwarning[0m[90m ts(6133): [0m'route' is declared but its value is never read.

[7m383[0m     const { route } = this;
[7m   [0m [93m          ~~~~~~~~~[0m

[96msrc/twin/truck930e/build930E.test.ts[0m:[93m8[0m:[93m7[0m - [93mwarning[0m[90m ts(6133): [0m'RAD' is declared but its value is never read.

[7m8[0m const RAD = Math.PI / 180;
[7m [0m [93m      ~~~[0m

[96msrc/ui/Drawer.tsx[0m:[93m36[0m:[93m25[0m - [93mwarning[0m[90m ts(6385): [0m'TargetedEvent' is deprecated.

[7m36[0m   const onKey = (e: JSX.TargetedEvent<HTMLDivElement, KeyboardEvent>) => {
[7m  [0m [93m                        ~~~~~~~~~~~~~[0m

[96msrc/ui/foundation.tsx[0m:[93m382[0m:[93m73[0m - [93mwarning[0m[90m ts(6385): [0m'ButtonHTMLAttributes' is deprecated.

[7m382[0m export function Button({ children, variant = "primary", ...props }: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) { return <button {...props} className={`og-button og-button--${variant}`}>{children}</button>; }
[7m   [0m [93m                                                                        ~~~~~~~~~~~~~~~~~~~~[0m
[96msrc/ui/foundation.tsx[0m:[93m380[0m:[93m35[0m - [93mwarning[0m[90m ts(6385): [0m'InputHTMLAttributes' is deprecated.

[7m380[0m export function Slider(props: JSX.InputHTMLAttributes<HTMLInputElement>) { return <input type="range" {...props} />; }
[7m   [0m [93m                                  ~~~~~~~~~~~~~~~~~~~[0m
[96msrc/ui/foundation.tsx[0m:[93m155[0m:[93m26[0m - [93mwarning[0m[90m ts(6133): [0m'lang' is declared but its value is never read.

[7m155[0m export function Notice({ lang, children, kind = "info" }: { lang: Lang; children: ComponentChildren; kind?: "info" | "warning" | "error" | "simulation" | "stale" | "partial" | "analyzer-unavailable" }) {
[7m   [0m [93m                         ~~~~[0m
[96msrc/ui/foundation.tsx[0m:[93m44[0m:[93m33[0m - [93mwarning[0m[90m ts(6133): [0m'lang' is declared but its value is never read.

[7m44[0m export function ProvenanceTag({ lang, value = "DERIVED" }: { lang: Lang; value?: "VERIFIED" | "DERIVED" | "ASSUMPTION" }) {
[7m  [0m [93m                                ~~~~[0m
[96msrc/ui/foundation.tsx[0m:[93m18[0m:[93m31[0m - [93mwarning[0m[90m ts(6133): [0m'lang' is declared but its value is never read.

[7m18[0m export function StatusBadge({ lang, label, tone = "nominal", severity }: StatusBadgeProps) {
[7m  [0m [93m                              ~~~~[0m

Result (263 files):
- 0 errors
- 0 warnings
- 10 hints

21:35:21 [content] Syncing content
21:35:21 [content] Synced content
21:35:21 [types] Generated 377ms
21:35:21 [build] output: "static"
21:35:21 [build] mode: "static"
21:35:21 [build] directory: /Users/sebitabravo/Developer/oilguard/frontend/dist/
21:35:21 [build] Collecting build info...
21:35:21 [build] ✓ Completed in 409ms.
21:35:21 [build] Building static entrypoints...
21:35:22 [vite] ✓ built in 559ms
21:35:23 [WARN] [vite] [plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
21:35:23 [vite] ✓ built in 990ms
21:35:23 [build] Rearranging server assets...

 generating static routes
21:35:23   ├─ /alerts/detail/index.html (+13ms)
21:35:23   ├─ /alerts/rules/index.html (+3ms)
21:35:23   ├─ /alerts/index.html (+3ms)
21:35:23   ├─ /calibration/index.html (+2ms)
21:35:23   ├─ /demo/index.html (+3ms)
21:35:23   ├─ /dev/ui/index.html (+11ms)
21:35:23   ├─ /devices/index.html (+2ms)
21:35:23   ├─ /docs/index.html (+3ms)
21:35:23   ├─ /docs/architecture-telemetry.md/index.html (+3ms)
21:35:23   ├─ /docs/bench/precision.md/index.html (+1ms)
21:35:23   ├─ /docs/bench/README.md/index.html (+1ms)
21:35:23   ├─ /docs/bench/stress.md/index.html (+1ms)
21:35:23   ├─ /docs/calibration.md/index.html (+1ms)
21:35:23   ├─ /docs/demo-script.md/index.html (+1ms)
21:35:23   ├─ /docs/edge-sim.md/index.html (+1ms)
21:35:23   ├─ /docs/feasibility.md/index.html (+1ms)
21:35:23   ├─ /docs/inspection.md/index.html (+1ms)
21:35:23   ├─ /docs/models.md/index.html (+1ms)
21:35:23   ├─ /docs/progreso-tarea.md/index.html (+3ms)
21:35:23   ├─ /docs/research/twin-reference.md/index.html (+1ms)
21:35:23   ├─ /docs/t10-rul-ladder.md/index.html (+1ms)
21:35:23   ├─ /docs/t3-oil-settling.md/index.html (+1ms)
21:35:23   ├─ /docs/t4-truck-cycle.md/index.html (+1ms)
21:35:23   ├─ /docs/t5-modes-cameras.md/index.html (+1ms)
21:35:23   ├─ /docs/t7-windows.md/index.html (+1ms)
21:35:23   ├─ /docs/t9-anomaly.md/index.html (+1ms)
21:35:23   ├─ /docs/thesis-annex.md/index.html (+1ms)
21:35:23   ├─ /fleet/index.html (+16ms)
21:35:23   ├─ /lab/bench/index.html (+2ms)
21:35:23   ├─ /lab/sim/index.html (+1ms)
21:35:23   ├─ /lab/validation/index.html (+1ms)
21:35:23   ├─ /link/index.html (+1ms)
21:35:23   ├─ /login/index.html (+2ms)
21:35:23   ├─ /mine/index.html (+2ms)
21:35:23   ├─ /monitoring/index.html (+1ms)
21:35:23   ├─ /report/index.html (+1ms)
21:35:23   ├─ /rul/index.html (+1ms)
21:35:23   ├─ /wheel/history/index.html (+2ms)
21:35:23   ├─ /wheel/index.html (+2ms)
21:35:23   ├─ /index.html (+10ms)
21:35:23 ✓ Completed in 147ms.

21:35:23 [build] ✓ Completed in 1.72s.
21:35:23 [build] 40 page(s) built in 2.15s
21:35:23 [build] Complete!
```

Exit 0.

Full isolated-negative combined stdout/stderr (disposable copy; the failing assertion is expected):

```text
bun test v1.4.2 (50a8a8387)

src/dash/Dashboard.outage.test.ts:
(pass) backend outage banner state > reports an outage only for the live wheel with a failed backend [0.48ms]
(pass) backend outage banner output > renders an unmistakable alert banner in English, never the calm message [6.14ms]
(pass) backend outage banner output > renders the same alert banner localized in Spanish, never the calm message [0.16ms]
(pass) backend outage banner layout > keeps title and detail in a single coherent content node [0.37ms]
(pass) dashboard outage status path > outage without active alert shows the prominent banner and no calm message [0.38ms]
(pass) dashboard outage status path > healthy state without escalation keeps the calm notice and no outage banner [0.09ms]
(pass) dashboard stale production seam (timestamp in, notice out) > aged live timestamp resolves stale inside the component: stale box, no calm [0.34ms]
(pass) dashboard stale production seam (timestamp in, notice out) > fresh live timestamp resolves fresh inside the component: calm, no stale [0.29ms]
(pass) dashboard stale production seam (timestamp in, notice out) > outage keeps precedence through the seam: alert banner, stale suppressed [0.50ms]
(pass) dashboard stale reading status path > aged live timestamp renders the stale notice and no calm message [0.24ms]
(pass) dashboard stale reading status path > fresh live timestamp keeps the calm notice and no stale banner [1.09ms]
(pass) dashboard stale reading status path > negative: forcing the pre-A02 constant-false path hides the stale state [0.15ms]
(pass) dashboard stale reading status path > outage keeps its own banner without duplicating the stale notice [0.11ms]
(pass) stale notice layout > keeps title and detail in a single coherent content node [0.28ms]
(pass) stale notice layout > renders one stale box with status semantics, never nested in the outage lane [0.10ms]
(pass) dashboard numeric provenance path > the local wheel render does not expose bare demo confidence [12.94ms]

src/ops/wheel/WheelPanels.provenance.test.ts:
48 |       expect(level).toContain("L");
49 |       expect(level).toContain(t("fleet.source.live", lang));
50 |       expect(level).toContain(t("ui.valid", lang));
51 |       expect(sigma).toContain(formatNumber(base.sigma, lang, 1));
52 |       expect(sigma).toContain("L");
53 |       expect(sigma).toContain(t("fleet.source.demo", lang));
                         ^
error: expect(received).toContain(expected)

Expected to contain: "DEMO"
Received: "data-field=\"sigma\">Sigma 0.5 L · <span class=\"og-badge og-badge--source og-badge--source-live\">LIVE</span> <span class=\"og-chip og-chip--valid\">Valid reading</span></span><span class=\"og-wheel-card__note\" "

      at <anonymous> (/private/var/folders/bj/3qcy2bvx4n5_qbxhsbg9cww40000gn/T/oilguard-a04-negative-up_a2kgo/frontend/src/ops/wheel/WheelPanels.provenance.test.ts:53:21)
(fail) wheel numeric evidence > mixed-source level, sigma and confidence each carry their own source and validity [3.06ms]
(pass) wheel numeric evidence > backend-down demo level is not shown as a live valid reading [1.68ms]

 17 pass
 1 fail
 122 expect() calls
Ran 18 tests across 2 files. [128.00ms]
```

Exit 1 (expected regression failure).

Full honesty/i18n guard output:

```text
bun test v1.4.2 (50a8a8387)

src/honesty.test.ts:
(pass) honesty matcher > normalizes case and accents while respecting short-token boundaries [5.71ms]
(pass) frontend honesty guard > contains no unsupported claims or machine-control actions [342.59ms]

src/i18n/index.test.ts:
(pass) i18n dictionary > every key has non-empty EN and ES copy [1.43ms]
(pass) i18n dictionary > no sprint or task codes leak into UI copy [0.82ms]
(pass) i18n dictionary > Spanish dictionary copy keeps required accents [2.93ms]
(pass) i18n dictionary > Spanish dictionary copy uses decimal commas outside factual specifications [1.98ms]
(pass) i18n dictionary > the demo lab note formats every displayed number for the selected language [3.18ms]
(pass) i18n dictionary > the dashboard footnote reflects the geometry-derived pressure [0.14ms]
(pass) i18n dictionary > navigation exposes the three product sections [0.10ms]

 9 pass
 0 fail
 5629 expect() calls
Ran 9 tests across 2 files. [430.00ms]
```

Exit 0.

### A05 — DONE (functional evidence accepted; closed without commit by user authorization)

- **Authorized paths:** `frontend/src/lab/calibration/CalibrationPage.tsx`, `frontend/src/lab/calibration/logic.ts`, `frontend/src/lab/calibration/logic.test.ts`, `frontend/src/i18n/dict/platform.ts`. `frontend/src/i18n/index.ts` is read-only. Only this feature record and `docs/progreso-tarea.md` may be updated as task records.
- **Problem and acceptance:** The page fits and classifies a generated settling curve, but presents a `nominal` model result without stating that physical bench behavior was not evaluated. The visible verdict must be labeled synthetic/nominal-synthetic with a separate explicit physical-state `NOT EVALUATED`; no bare nominal pass remains. Preserve model thresholds, physics constants, and calculations.
- **Read-only map:** `CalibrationPage.tsx` may use live fused level/sigma, but always calls `sampleSettlingCurve(...)` before fitting tau/residual and classifying the result. `logic.ts` currently yields `nominal` for an in-range fitted tau. Existing tests assert that bare classifier result. UI strings in `dict/platform.ts` currently say “Model verdict” / “Nominal settling”; missing bench-fit/reference information is elsewhere and less salient. A live input is not a physical bench evaluation: the displayed curve, tau, and verdict remain generated.
- **TDD and route:** TDD is ON from the approved plan, source `approved feature plan`, exact full runner `cd frontend && bun test src`; focused runner `cd frontend && bun test src/lab/calibration/logic.test.ts`. Observe RED before implementation, then GREEN and an isolated disposable-copy negative proof. Route is delegated direct: mapping trigger fired because understanding spans four permitted files and was completed read-only; writer trigger fires because the same four files contain non-trivial implementation/test/i18n changes; use one serialized writer. The writer must load the registered `impeccable` skill and read `craft-floor.md` immediately before any UI edit.
- **Manual evidence:** Inspect the calibration verdict with the backend live and with the disposable backend down, capturing both states. UI copy stays bilingual. The broader responsive/reduced-motion matrix remains for §4/A13.
- **Boundaries:** No changes outside A05 paths except these task records. No stage/commit, RDD/review, remote action, or change to the user-owned `.codex/hooks.json`. No A06 work until A05 is closed. Engram mirror remains pending/unavailable without an authoritative session identity.
- **Implementation:** `calibrationVerdictEvidence` wraps the unchanged classifier output with `source: "synthetic-model"` and `physicalBench: "not-evaluated"` for every model verdict. `CalibrationVerdictPanel` renders that evidence beside the result; nominal/slow labels explicitly say synthetic, and the new physical-bench sentence is localized EN/ES. The page's curve generation, fit, thresholds, and physical constants are unchanged; a live fused level can feed the generated curve but does not become a physical bench result. Only the four permitted A05 files changed.
- **TDD RED:** After tests were added but before production edits, `cd frontend && bun test src/lab/calibration/logic.test.ts` returned 0 pass, 1 fail, 1 import error, exit 1 because `CalibrationVerdictPanel` did not yet exist. This is a test-first RED, though the observed failure was a missing export rather than a behavioral assertion.
- **Focused GREEN:** `cd frontend && bun test src/lab/calibration/logic.test.ts` — 5 pass, 0 fail, 39 expectations, one file, exit 0. Tests cover unchanged model classification plus synthetic/physical evidence and all four visible verdict states in both locales.
- **Full frontend tests:** `cd frontend && bun test src` — 487 pass, 0 fail, 152468 expectations across 85 files, exit 0.
- **Build:** `cd frontend && bun run build` — `astro check` 0 errors, 0 warnings, 10 hints; Astro built 40 pages; exit 0. Vite separately warned about chunks above 500 kB.
- **Honesty/i18n guard:** `cd frontend && bun test src/i18n/index.test.ts src/honesty.test.ts` — 9 pass, 0 fail, 5637 expectations across two files, exit 0.
- **Isolated negative proof:** In a disposable archive copy with the four A05 files overlaid and dependencies linked, removing only the verdict's shared synthetic-result badge while leaving tests intact made the focused test fail: 4 pass, 1 fail, 16 expectations, exit 1. The copy was removed; the live worktree was not reverted.
- **Targeted browser evidence:** A locally owned stub on 8001 served a live rest window/fused level; Astro on 5174 and headless Chrome/CDP on 9223 rendered the calibration page. Inspected 1024×800 screenshots: `/tmp/og-a05-e2e/live-en-1024.png`, `live-es-1024.png`, `down-en-1024.png`, `down-es-1024.png`. Live and backend-down states both show “Synthetic model result”/“Resultado del modelo sintético”, nominal-synthetic title, and “Physical bench: Not evaluated”/“Banco físico: No evaluado”; the source line changes LIVE→DEMO. The broader widths/reduced-motion matrix remains for A13. Owned processes stopped, the temporary Chrome profile removed, and ports 8001/5174/9223 verified clear.
- **Delivery boundary:** The user explicitly authorized formal A05 closeout without a commit because the work order prohibits commits. No stage, commit, RDD/review, or remote operation occurred. User-owned `.codex/hooks.json` untouched; Engram mirror remains pending for lack of authoritative runtime identity. A06 is the next authorized work unit.


A05 command outputs (complete combined stdout/stderr; terminal trailing spaces removed in the full-suite/build blocks for Markdown hygiene):

**Test-first RED** — `cd frontend && bun test src/lab/calibration/logic.test.ts`

```text
bun test v1.4.2 (50a8a8387)

src/lab/calibration/logic.test.ts:

# Unhandled error between tests
-------------------------------
SyntaxError: Export named 'CalibrationVerdictPanel' not found in module '/Users/sebitabravo/Developer/oilguard/frontend/src/lab/calibration/CalibrationPage.tsx'.
-------------------------------


 0 pass
 1 fail
 1 error
Ran 1 test across 1 file. [77.00ms]
```

Exit 1.

**Focused GREEN** — `cd frontend && bun test src/lab/calibration/logic.test.ts`

```text
bun test v1.4.2 (50a8a8387)

src/lab/calibration/logic.test.ts:
(pass) pause calibration logic > classifies nominal, slow and invalid settling windows [0.07ms]
(pass) pause calibration logic > samples pressure in kPa on seconds after stop with a steady asymptote [0.65ms]
(pass) pause calibration logic > fits tau from sampled relaxation without changing its seconds scale [0.47ms]
(pass) pause calibration logic > marks model classifications synthetic while physical bench evaluation stays absent [0.07ms]
(pass) pause calibration logic > renders a synthetic model verdict and physical NOT EVALUATED in both locales [3.85ms]

 5 pass
 0 fail
 39 expect() calls
Ran 5 tests across 1 file. [25.00ms]
```

Exit 0.

**Full frontend suite** — `cd frontend && bun test src`

```text
bun test v1.4.2 (50a8a8387)

src/honesty.test.ts:
(pass) honesty matcher > normalizes case and accents while respecting short-token boundaries [1.58ms]
(pass) frontend honesty guard > contains no unsupported claims or machine-control actions [394.15ms]

src/routes.test.ts:
(pass) isLegacyHash > recognizes section aliases and legacy prefixes [0.09ms]
(pass) isLegacyHash > does not redirect unknown anchors [0.02ms]
(pass) modeFromHash > canonical hashes [0.03ms]
(pass) modeFromHash > legacy aliases keep working [0.02ms]
(pass) modeFromHash > prefix aliases resolve to their section
(pass) modeFromHash > empty and unknown hashes fall back to the wheel view
(pass) pathFromHash > maps hashes to section paths [0.77ms]
(pass) pathFromHash > demo aliases enable the monitoring demo and preserve query data [0.05ms]
(pass) pathFromHash > preserves query data for regular aliases [0.01ms]

src/nav.test.ts:
(pass) navigation registry > contains every D5 route and preserves readiness flags [0.21ms]
(pass) navigation registry > groups contain only unique navigation items [0.36ms]
(pass) navigation registry > matches nested alert detail to the alerts item [0.06ms]

src/theme.test.ts:
(pass) theme tokens > keeps every hexadecimal colour inside the root token block [0.48ms]

src/demo/dataset.test.ts:
(pass) demo dataset > is deterministic for a seed [2.18ms]
(pass) demo dataset > models six trucks and rear LH/RH wheels [0.45ms]
(pass) demo dataset > keeps levels at or below nominal plus confidence band [0.34ms]
(pass) demo dataset > includes all history windows, lifecycle states and device metadata [0.95ms]
(pass) demo dataset > keeps history temperature in a duty-cycle band, warm while hauling and cooling at rest [1.26ms]
(pass) demo dataset > leaves no temperature where the level has a communication gap [0.34ms]

src/ui/drawerTabNavigation.test.ts:
(pass) drawer tab keyboard navigation > wraps arrows and supports Home and End [0.08ms]

src/ui/logic.test.ts:
(pass) shared UI logic > maps the closed severity palette [0.04ms]
(pass) shared UI logic > clamps level-bar percentages and exposes thresholds [0.07ms]
(pass) shared UI logic > builds optional device queries without corrupting existing queries [0.05ms]

src/ui/backendOrDemo.test.ts:
(pass) backend/demo state machine > moves loading to live on success [0.03ms]
(pass) backend/demo state machine > resolves a never-ending backend request as a timeout [4.11ms]
(pass) backend/demo state machine > moves loading to explicitly labelled demo on error [0.03ms]

src/ui/chartGeometry.test.ts:
(pass) chart geometry > keeps axes inside a padded frame [0.17ms]
(pass) axis ticks > generates round ascending ticks inside the domain [0.14ms]
(pass) axis ticks > handles degenerate and invalid domains [0.01ms]
(pass) axis ticks > maps values and labels to percentages of the plot area [0.06ms]
(pass) axis ticks > keeps the band on the same domain as the line [0.13ms]
(pass) synchronized chart interaction geometry > creates monotone cubic paths without changing sample order [0.60ms]
(pass) synchronized chart interaction geometry > moves an accessible cursor within the sample range [0.04ms]
(pass) chart label collision layout > stacks overlapping event labels into separate vertical lanes [0.09ms]
(pass) chart label collision layout > keeps separated event labels on the baseline [0.01ms]

src/docs/links.test.ts:
(pass) buildSlug > keeps the .md suffix and normalises separators [0.13ms]
(pass) docRoute > prefixes the docs route [0.02ms]
(pass) resolveDocLink > resolves sibling and nested documents [0.14ms]
(pass) resolveDocLink > resolves relative to the source document directory [0.02ms]
(pass) resolveDocLink > keeps the anchor [0.01ms]
(pass) resolveDocLink > marks links that leave the docs folder as repo references [0.02ms]
(pass) resolveDocLink > marks non-markdown files in docs as repo references
(pass) resolveDocLink > passes anchors and external links through [0.07ms]
(pass) docTitle > uses the first level-1 heading [0.26ms]
(pass) docTitle > skips a leading blockquote [0.04ms]
(pass) docTitle > ignores headings inside code fences [0.01ms]
(pass) docTitle > falls back to the file name [0.01ms]
(pass) rewriteDocHtml > rewrites doc links and keeps external ones [0.11ms]
(pass) rewriteDocHtml > turns repo references into plain spans [0.01ms]
(pass) rewriteDocHtml > wraps tables for horizontal scrolling
(pass) rewriteDocHtml > leaves escaped markup inside code blocks alone

src/dash/readingFreshness.test.ts:
(pass) reading freshness cutoff > matches the device-inventory staleness threshold (120 s, not physics tuning)
(pass) isReadingStale > treats the DEMO fresh-fixture age (8 s) as fresh [0.03ms]
(pass) isReadingStale > treats the DEMO stale-fixture age (180 s) as stale
(pass) isReadingStale > keeps the exact cutoff fresh and stales anything past it [0.01ms]
(pass) isReadingStale > treats a missing or unparsable timestamp as stale without inventing an age [0.02ms]
(pass) isReadingStale > treats a future timestamp as fresh
(pass) resolveReadingStale production path > reaches stale for the live wheel with an aged backend timestamp [0.03ms]
(pass) resolveReadingStale production path > stays fresh for the live wheel with a recent backend timestamp
(pass) resolveReadingStale production path > never flags the demo walk or DEMO wheels against the wall clock [0.01ms]
(pass) resolveReadingStale production path > negative: the pre-A02 constant-false path reports valid for aged data [0.04ms]

src/dash/svgPresentationAttributes.test.ts:
(pass) Preact SVG presentation attributes > uses standards-compliant dashed names throughout the TSX tree [126.10ms]

src/dash/alertSeverity.test.ts:
(pass) alert severity colors > preserves the shared N1–N4 palette [0.03ms]
(pass) alert severity colors > both dashboard consumers use the shared map instead of local copies [0.52ms]

src/dash/LevelChart.test.tsx:
(pass) LevelChart locale formatting > threshold labels use the selected language decimal separator [8.06ms]

src/dash/evaluationReason.test.ts:
(pass) unevaluated analysis reason localization > localizes every stable backend reason code [0.07ms]
(pass) unevaluated analysis reason localization > does not expose an unknown backend diagnostic [0.02ms]

src/dash/backendNotes.test.ts:
(pass) dashboard backend note localization > localizes known alert and fallback notes in Spanish [0.08ms]
(pass) dashboard backend note localization > localizes the known suppressed-RUL backend explanation without changing English [0.03ms]
(pass) dashboard backend note localization > preserves known English notes and passes unknown backend text through verbatim [0.02ms]
(pass) dashboard backend note localization > preserves prototype property names as unknown backend text [0.02ms]

src/dash/RulPanel.test.tsx:
(pass) RUL suppression explanation > formats RUL metrics with the selected language's decimal separator [2.54ms]
(pass) RUL suppression explanation > uses critical, warning, then normal colors by the eight-hour horizon with localized text [1.26ms]
(pass) RUL suppression explanation > renders the clean-baseline reason in English and Spanish [0.32ms]
(pass) RUL suppression explanation > keeps an unknown backend suppression reason verbatim [0.06ms]
(pass) RUL suppression explanation > localizes the known no-rows backend reason and preserves its English wording [0.12ms]
(pass) RUL suppression explanation > uses the structured localized reason instead of a raw backend diagnostic [0.08ms]
(pass) RUL suppression explanation > keeps analyzer import diagnostics out of the unavailable panel [0.15ms]
(pass) RUL suppression explanation > prioritizes analyzer-unavailable copy over structured notes in both languages [0.43ms]
(pass) RUL suppression explanation > renders structured RUL note and reason messages in both languages [1.06ms]

src/dash/signingBadge.test.ts:
(pass) measurement signing badge state > does not render when the backend does not provide signing status [0.26ms]
(pass) measurement signing badge state > shows the enforced healthy state with rejection count [0.05ms]
(pass) measurement signing badge state > marks enforcement-off and rejected states distinctly [0.03ms]

src/dash/Dashboard.outage.test.ts:
(pass) backend outage banner state > reports an outage only for the live wheel with a failed backend [0.04ms]
(pass) backend outage banner output > renders an unmistakable alert banner in English, never the calm message [0.40ms]
(pass) backend outage banner output > renders the same alert banner localized in Spanish, never the calm message [0.07ms]
(pass) backend outage banner layout > keeps title and detail in a single coherent content node [0.23ms]
(pass) dashboard outage status path > outage without active alert shows the prominent banner and no calm message [0.28ms]
(pass) dashboard outage status path > healthy state without escalation keeps the calm notice and no outage banner [0.08ms]
(pass) dashboard stale production seam (timestamp in, notice out) > aged live timestamp resolves stale inside the component: stale box, no calm [0.18ms]
(pass) dashboard stale production seam (timestamp in, notice out) > fresh live timestamp resolves fresh inside the component: calm, no stale [0.10ms]
(pass) dashboard stale production seam (timestamp in, notice out) > outage keeps precedence through the seam: alert banner, stale suppressed [0.09ms]
(pass) dashboard stale reading status path > aged live timestamp renders the stale notice and no calm message [0.09ms]
(pass) dashboard stale reading status path > fresh live timestamp keeps the calm notice and no stale banner [0.06ms]
(pass) dashboard stale reading status path > negative: forcing the pre-A02 constant-false path hides the stale state [0.06ms]
(pass) dashboard stale reading status path > outage keeps its own banner without duplicating the stale notice [0.06ms]
(pass) stale notice layout > keeps title and detail in a single coherent content node [0.12ms]
(pass) stale notice layout > renders one stale box with status semantics, never nested in the outage lane [0.08ms]
(pass) dashboard numeric provenance path > the local wheel render does not expose bare demo confidence [18.18ms]

src/dash/demoCopy.test.ts:
(pass) demo dashboard copy > formats the lab note with the selected language's decimal separator [0.31ms]

src/dash/levelAxis.test.ts:
(pass) level chart time axis > spreads five ticks from the oldest sample to now [0.06ms]
(pass) level chart time axis > labels spans in seconds below three minutes and minutes above [0.12ms]

src/dash/chartLayout.test.ts:
(pass) level chart layout > matches the rendered SVG width while preserving fixed-pixel text scale [0.05ms]
(pass) level chart layout > inline layout keeps text at fixed size and bounds the height [0.04ms]

src/dash/levelSeries.test.ts:
(pass) live level series merge > sorts by timestamp and replaces duplicate timestamps with the latest sample [0.17ms]

src/dash/backendMessages.test.ts:
(pass) structured backend messages > the shared catalog has bilingual entries with exactly the declared placeholders [0.29ms]
(pass) structured backend messages > every catalog message renders without unresolved placeholders [2.15ms]
(pass) structured backend messages > formats backend numbers for the selected locale and uses localized PLM zone labels [0.52ms]
(pass) structured backend messages > rounds only the RUL no-leak-trend slope to two decimal places [0.21ms]
(pass) structured backend messages > known codes select translations while unknown codes preserve the legacy field exactly [0.03ms]
(pass) structured backend messages > local leak-demo alerts use the shared structured ladder messages [0.67ms]

src/dash/analyzerAvailability.test.ts:
(pass) analyzer availability notice > returns the exact localized generic notice without exposing diagnostics [0.04ms]
(pass) analyzer availability notice > does not classify a healthy empty store or precision-suppressed RUL as an outage [0.02ms]
(pass) analyzer availability notice > recognizes an unavailable endpoint even when health is not yet available

src/dash/rulHorizon.test.ts:
(pass) RUL threshold horizon > critical horizon takes priority when both thresholds are within the shift [0.01ms]
(pass) RUL threshold horizon > uses the warning horizon when critical is not within the shift
(pass) RUL threshold horizon > uses the normal horizon when neither threshold is within the shift
(pass) RUL threshold horizon > accepts an explicit shift length

src/dash/fleetRisk.test.ts:
(pass) fleet demo combined-risk rule > does not alert unless at least two of three proxy channels cross their assumptions [0.05ms]
(pass) fleet demo combined-risk rule > alerts at two crossed boundaries and reports the contributing channels [0.02ms]
(pass) fleet demo combined-risk rule > does not treat current as a fourth alert channel
(pass) fleet demo combined-risk rule > uses the latest sample in each series for the combined rule [0.03ms]
(pass) fleet demo wheel positions > lists the same four positions for every truck and marks the GDY106 wheel separately [0.09ms]

src/twin/physics.test.ts:
(pass) gear case defaults mirror python > same parameters as the fixture [0.02ms]
(pass) geometry > zero volume gives zero head and full annulus gives the outer diameter [0.06ms]
(pass) geometry > round trip volume -> head -> volume within 1e-6 L [1.33ms]
(pass) geometry > 95 L head is decimetres [0.02ms]
(pass) python parity > head from volume [0.08ms]
(pass) python parity > volume and sensitivity from head [0.06ms]
(pass) python parity > pressure from volume and its inverse [0.19ms]
(pass) python parity > pressure from fixed mass [0.09ms]
(pass) python parity > gear train teeth, ratio and stage speeds [0.08ms]
(pass) python parity > 3000 rpm rotor gives about 92 wheel rpm [0.01ms]
(pass) rotating sensor assumptions > selects static pool, slosh, and centrifugal regimes [0.03ms]
(pass) rotating sensor assumptions > keeps researched cavity separate from static defaults [0.03ms]
(pass) rotating sensor assumptions > computes a bounded deterministic per-revolution wet fraction [0.21ms]
(pass) rotating sensor assumptions > clamps volume, sensor radius, rpm, and integration samples [0.03ms]

src/i18n/copyMigration.test.ts:
(pass) i18n copy migration > dictionary copy preserves matching honesty markers in Spanish [1.33ms]
(pass) i18n copy migration > parameterized mine captions interpolate fleet counts and the actual seed [0.08ms]
(pass) i18n copy migration > TSX components do not embed Spanish-copy ternaries [5.68ms]

src/i18n/numberDisplayGuard.test.ts:
(pass) dashboard number display formatting > uses the shared locale formatter for displayed numbers [62.99ms]

src/i18n/index.test.ts:
(pass) i18n dictionary > every key has non-empty EN and ES copy [2.22ms]
(pass) i18n dictionary > no sprint or task codes leak into UI copy [2.17ms]
(pass) i18n dictionary > Spanish dictionary copy keeps required accents [3.79ms]
(pass) i18n dictionary > Spanish dictionary copy uses decimal commas outside factual specifications [2.55ms]
(pass) i18n dictionary > the demo lab note formats every displayed number for the selected language [0.82ms]
(pass) i18n dictionary > the dashboard footnote reflects the geometry-derived pressure [0.24ms]
(pass) i18n dictionary > navigation exposes the three product sections [0.03ms]

src/i18n/queryLanguage.test.ts:
(pass) query language parsing > accepts supported language values [0.06ms]
(pass) query language parsing > ignores missing and unsupported values [0.02ms]
(pass) query language parsing > normalizes the language value case [0.01ms]

src/i18n/formatterContract.test.ts:
(pass) dictionary formatter contract > each English and Spanish translation uses the same placeholder names [1.98ms]
(pass) dictionary formatter contract > example parameters render every translated dictionary value without placeholders [2.54ms]

src/i18n/numberFormat.test.ts:
(pass) locale-aware number formatting > uses a decimal point in English and a decimal comma in Spanish [0.31ms]
(pass) locale-aware number formatting > preserves the requested fractional precision and rounds consistently [0.23ms]
(pass) locale-aware number formatting > does not introduce grouping separators into measurements [0.10ms]

src/sim/useThrottledSceneAccessibility.test.ts:
(pass) useThrottledSceneAccessibility > cancels a delayed prior timer before queuing a newer announcement [0.87ms]

src/sim/motionPreference.test.ts:
(pass) reduced-motion preference > snaps camera-position and controls-target transitions while preserving normal easing [0.39ms]
(pass) reduced-motion preference > tracks preference changes while mounted and removes the listener on dispose [0.36ms]

src/sim/signals.test.ts:
(pass) signals contract > rotor max over gear ratio is about 92 wheel rpm [0.01ms]
(pass) signals contract > capacity matches the GDY106 nominal fill [0.06ms]
(pass) signals contract > csv header keeps the pressure and ground-truth level columns [0.03ms]
(pass) signals contract > isRestWindow is true only for rest windows [0.04ms]
(pass) pipeline constants mirror sim/generate.py > hold-up and drain-back parameters [0.01ms]
(pass) pipeline constants mirror sim/generate.py > noise is sized for a 0-10 kPa class transducer [0.01ms]

src/sim/api.test.ts:
(pass) level series query > keeps existing request URLs and optionally serializes requested signals [0.15ms]

src/sim/sceneAccessibility.test.ts:
(pass) scene accessibility copy > builds localized mine scene summaries with the current truck state and cycle [0.23ms]
(pass) scene accessibility copy > builds localized wheel summaries with current oil level and mode [0.16ms]
(pass) scene accessibility copy > allows accessible scene copy updates no more than once per second [0.01ms]

src/platform/landing/logic.test.ts:
(pass) landing pure logic > URL language overrides stored language and normalizes supported codes [0.10ms]
(pass) landing pure logic > telemetry sampling is deterministic and preserves endpoints [0.20ms]

src/platform/link/logic.test.ts:
(pass) link health logic > clips outages to the selected hour and scales outage segments [0.13ms]
(pass) link health logic > derives ingest KPIs and uses fleet live-status thresholds [0.10ms]
(pass) link health logic > paginates device timelines so large fleets stay navigable [0.04ms]
(pass) link health logic > derives demo KPIs only from the supplied device and outage records [0.06ms]

src/platform/devices/logic.test.ts:
(pass) device inventory logic > derives reporting, weighted signing, rejected and stale KPIs [0.07ms]
(pass) device inventory logic > aggregates current rows and falls back to available demo row ratios [0.09ms]
(pass) device inventory logic > filters by state and case-insensitive device identifier [0.08ms]
(pass) device inventory logic > maps matching live wheel ids to dataset truck and wheel context only [0.04ms]
(pass) device inventory logic > paginates the filtered inventory without dropping the total count [0.04ms]

src/lab/bench/logic.test.ts:
(pass) viscosity proxy > is nominal at the 75 C bench reference and stays inside the 0.5 to 2.0 proxy range [0.04ms]
(pass) viscosity proxy > oil is slower to settle when it is colder [0.01ms]
(pass) hold-up > is zero at rest and reaches the 6 L assumption at maximum wheel speed [0.03ms]
(pass) bench reading > maps the fill volume to kPa through twin/physics at rest [0.11ms]
(pass) bench reading > reads lower while the wheel turns and closes the rest gate [0.03ms]
(pass) bench reading > derives the settling time constant from the viscosity proxy [0.16ms]
(pass) bench reading > clamps inputs to the slider limits so a typed value cannot leave the model range [0.08ms]
(pass) stop transient > recovers from the held-up reading to the rest asymptote over four seconds [0.40ms]
(pass) stop transient > is flat when the wheel is already at rest [0.18ms]
(pass) stop transient > colder oil settles slower [0.31ms]
(pass) protocol > lists the eight drain-and-weigh steps of docs/calibration.md [0.02ms]
(pass) protocol > tabulates expected pressure at every weighed level step of the protocol [0.14ms]

src/lab/calibration/logic.test.ts:
(pass) pause calibration logic > classifies nominal, slow and invalid settling windows [0.07ms]
(pass) pause calibration logic > samples pressure in kPa on seconds after stop with a steady asymptote [0.23ms]
(pass) pause calibration logic > fits tau from sampled relaxation without changing its seconds scale [0.34ms]
(pass) pause calibration logic > marks model classifications synthetic while physical bench evaluation stays absent [0.11ms]
(pass) pause calibration logic > renders a synthetic model verdict and physical NOT EVALUATED in both locales [1.21ms]

src/lab/fixtures/fixtures.test.ts:
(pass) lab fixtures > scenarios.json keeps every golden row, column and seed [9.99ms]
(pass) lab fixtures > validation.json truth matches the golden ground-truth level [3.57ms]
(pass) lab fixtures > validation.json estimates exist only on rest rows [0.61ms]

src/lab/sim/logic.test.ts:
(pass) scenario fixtures > exposes the five real generator scenarios with their ground-truth label [0.04ms]
(pass) scenario fixtures > loads 300 rows at 10 Hz per scenario with the golden seed [4.50ms]
(pass) scenario fixtures > rebuilds the timestamps and device id the generator wrote [2.60ms]
(pass) label counters > counts each ground-truth label over the whole scenario [0.65ms]
(pass) label counters > counts only the rows played so far when a limit is given [0.06ms]
(pass) link outage ranges > finds the contiguous buffered window of the link-outage scenario [0.24ms]
(pass) csv export > writes the generator header and fixed-decimal values, including negative zero [5.60ms]
(pass) parameters and commands > normalizes seed, duration and rate to safe integers [0.09ms]
(pass) parameters and commands > builds the real flags of sim/generate.py and edge-sim [0.06ms]
(pass) parameters and commands > the preview matches only the pinned seed, duration and rate [0.03ms]
(pass) playback and ingest > advances by the speed and loops at the end [0.13ms]
(pass) playback and ingest > relabels the device id so a lab send never touches the live wheel [0.05ms]

src/lab/validation/logic.test.ts:
(pass) error metrics > computes MAE, bias, max error and the share inside the band [0.20ms]
(pass) error metrics > counts a point exactly on the band edge as inside [0.02ms]
(pass) error metrics > reports nulls instead of zeros when there are no points or no band [0.04ms]
(pass) pairing and windows > keeps only rows that carry both a fused estimate and the truth [0.09ms]
(pass) pairing and windows > drops points whose truth is missing instead of inventing one [0.02ms]
(pass) pairing and windows > marks the first rest window as the in-sample baseline and excludes it from evaluation [0.03ms]
(pass) pairing and windows > summarises each rest window [0.17ms]
(pass) live backend series > detects whether the backend returned the generator truth [0.07ms]
(pass) synthetic fixture run > evaluates 70 out-of-sample rest rows per scenario [0.67ms]
(pass) synthetic fixture run > matches the independently computed pooled error of the offline estimator [0.56ms]
(pass) synthetic fixture run > the uncompensated sensor-drift scenario shows a positive bias [0.10ms]
(pass) synthetic fixture run > uses a two sigma band as documented in docs/calibration.md
(pass) scatter geometry > pads the domain to multiples of five and keeps it square [0.05ms]
(pass) scatter geometry > maps truth to x and the estimate to a top-based y percentage [0.10ms]
(pass) per-point band > derives the two sigma band from the sigma the backend reports [0.03ms]
(pass) per-point band > scores each pair against its own band and reports the mean half-width [0.09ms]
(pass) per-point band > leaves the share empty when no pair carries a band [0.03ms]
(pass) scatter ticks > uses whole-litre steps that divide the padded domain [0.05ms]

src/dash/fleetLive/logic.test.ts:
(pass) fleet live logic > derives websocket URL and preserves a configured path [0.11ms]
(pass) fleet live logic > rejects incomplete payloads and parses nullable latency [0.38ms]
(pass) fleet live logic > classifies queue, drops, and latency thresholds [0.06ms]
(pass) fleet live logic > uses capped exponential reconnect delays [0.03ms]
(pass) fleet live logic > merges websocket and polling fields without losing metrics [0.07ms]
(pass) fleet live logic > recognizes the backend no-rows response [0.03ms]

src/ops/rul/logic.test.ts:
(pass) RUL page contracts > converts hours to cycles and shifts using the backend constants [0.02ms]
(pass) RUL page contracts > sorts projected horizons shortest first and keeps suppressed rows last [0.04ms]
(pass) RUL page contracts > filters to wheels that have a numeric projection [0.03ms]
(pass) RUL page contracts > demo cards cover the full twelve-wheel fleet

src/ops/wheel/WheelPanels.provenance.test.ts:
(pass) wheel numeric evidence > mixed-source level, sigma and confidence each carry their own source and validity [1.07ms]
(pass) wheel numeric evidence > backend-down demo level is not shown as a live valid reading [0.57ms]

src/ops/wheel/logic.test.ts:
(pass) wheel selection > resolves a known wheel and falls back to the live RH-01 wheel [0.04ms]
(pass) wheel selection > only wheel-RH-01 is the live device [0.01ms]
(pass) wheel selection > builds encoded links to history and alerts for the selected wheel [0.02ms]
(pass) escalation ladder state > picks the highest known level and ignores unknown ones [0.05ms]
(pass) escalation ladder state > marks exactly one ladder level active, or none when nominal [0.04ms]
(pass) escalation ladder state > maps each level to its own banner copy [0.01ms]
(pass) channel fusion > derives real channel states from the latest alert [0.03ms]
(pass) channel fusion > reports no data when there is no alert or channel payload [0.01ms]
(pass) telemetry derivations > selects the latest available pressure, temperature and vibration values [0.08ms]
(pass) telemetry derivations > settling tau is 0.75 s at the 60 C reference and shrinks as oil warms [0.06ms]
(pass) telemetry derivations > classifies level validity from regime, confidence and freshness [0.10ms]
(pass) telemetry derivations > formats the last update as a UTC clock [0.04ms]
(pass) telemetry derivations > serializes raw rows as one compact JSON line each [0.04ms]
(pass) demo wheel trace > covers 60 minutes at one point per minute and ends near the wheel level [0.06ms]
(pass) demo wheel trace > alternates ordered, non-overlapping rest windows inside the span [0.05ms]
(pass) demo wheel trace > is deterministic per wheel [0.03ms]

src/ops/alerts/rules.test.ts:
(pass) rule mirror stays in sync with the Python analyzer > level.py thresholds [1.63ms]
(pass) rule mirror stays in sync with the Python analyzer > ladder.py thresholds [2.73ms]
(pass) rule mirror stays in sync with the Python analyzer > rul.py thresholds [0.90ms]
(pass) rule mirror stays in sync with the Python analyzer > derived litre levels agree with the percentages [0.04ms]

src/ops/alerts/detail.test.ts:
(pass) channelEvidence > lists the three voting channels and the veto separately, each against its threshold [0.26ms]
(pass) channelEvidence > thresholds come from the mirrored rules [0.10ms]
(pass) channelEvidence > a metric is marked as crossing when the input passes the threshold [0.04ms]
(pass) channelEvidence > missing inputs stay null instead of becoming zero [0.08ms]
(pass) signalWindow > is deterministic and ends at the trigger level [0.25ms]
(pass) signalWindow > level never rises on the way into the trigger [0.06ms]
(pass) signalWindow > has no pressure series when the input is missing [0.04ms]
(pass) liveSignalWindow > centres on the alert time and fills gaps with the previous value [0.15ms]
(pass) liveSignalWindow > returns null without usable points [0.02ms]
(pass) inspectionSteps > every level has distinct steps and N4 asks for an inspection before dispatch [0.04ms]

src/ops/alerts/thresholds.test.ts:
(pass) resolveThresholds > falls back to the mirrored constant when the backend did not answer [0.15ms]
(pass) resolveThresholds > uses the backend values when the payload is complete [0.04ms]
(pass) resolveThresholds > the payload from the documented contract equals the mirrored constant [0.03ms]
(pass) resolveThresholds > rejects a payload with a non-numeric or missing threshold [0.06ms]
(pass) thresholdRows > shows every threshold of the mirror once [0.06ms]
(pass) thresholdRows > carries live values, litres for the percentage rows and a known source file [0.05ms]
(pass) thresholdRows > labels exist in both languages [0.14ms]

src/ops/alerts/logic.test.ts:
(pass) parseAlertId > reads a plain id from the query string [0.10ms]
(pass) parseAlertId > rejects missing, empty, oversized or odd ids [0.03ms]
(pass) demo alert records > cover every dataset alert plus a deterministic history, with unique ids [0.57ms]
(pass) demo alert records > never opens in the future and routes recipients by level [0.08ms]
(pass) demo alert records > audit trail agrees with the lifecycle [0.06ms]
(pass) demo alert records > displayed channel states are what the mirrored rules compute from the inputs [0.20ms]
(pass) demo alert records > stays inside the seven-day window [0.08ms]
(pass) demo alert records > at least one record has missing inputs and is flagged partial [0.11ms]
(pass) evaluateChannel > applies the ladder thresholds [0.08ms]
(pass) evaluateChannel > the temperature veto needs drift and a pressure that is not falling [0.03ms]
(pass) evaluateChannel > reports no-data when the inputs are missing [0.01ms]
(pass) liveToRecord > maps backend channels, reason message and routing [0.21ms]
(pass) liveToRecord > keeps null inputs and marks channels as no-data when the backend sent none [0.04ms]
(pass) liveToRecord > joins array message params and falls back to the English reason for unknown codes [0.05ms]
(pass) filters, sorting and counters > filters by level, lifecycle, truck, role and text [0.20ms]
(pass) filters, sorting and counters > sorts active alerts first, worst level first, newest first [0.26ms]
(pass) filters, sorting and counters > counts active (not closed) alerts per level [0.07ms]
(pass) filters, sorting and counters > seven-day distribution counts every level and shares add up [0.13ms]
(pass) filters, sorting and counters > recurrence ranking orders wheels by alert count and skips live rows [0.25ms]
(pass) age and timestamps > uses now, minutes, hours and days [0.06ms]
(pass) age and timestamps > formats UTC timestamps [0.03ms]
(pass) local demo lifecycle > reducer allows only meaningful transitions [0.06ms]
(pass) local demo lifecycle > applies stored actions to a demo record and extends the audit trail [0.20ms]
(pass) local demo lifecycle > ignores invalid stored actions and never touches live records [0.10ms]
(pass) local demo lifecycle > parses persisted actions defensively [0.28ms]
(pass) wheel pre-filter and merging > reads the wheel query parameter defensively [0.06ms]
(pass) wheel pre-filter and merging > filters by wheel id [0.04ms]
(pass) wheel pre-filter and merging > live rows come first and win over demo rows with the same id [0.11ms]
(pass) wheel pre-filter and merging > appends a local action without mutating the stored map [0.09ms]
(pass) wheel pre-filter and merging > trend alerts carry the zone their message needs [0.08ms]

src/ops/alerts/localize.test.ts:
(pass) localizeReason > never leaves a placeholder behind in either language [3.08ms]
(pass) localizeReason > formats decimals with the language separator [0.37ms]
(pass) localizeReason > uses the backend fallback text when the code is unknown [0.07ms]
(pass) localizeReason > covers every ladder reason code with a dictionary entry [0.20ms]
(pass) labels > localize roles and lifecycle states in both languages [0.09ms]
(pass) labels > age uses the language units [0.20ms]

src/ops/history/logic.test.ts:
(pass) wheel history contracts > slices the selected deterministic history window [0.03ms]
(pass) wheel history contracts > computes level change, loss rate, alerts, and completeness [0.10ms]
(pass) wheel history contracts > history points are available for the demo wheel selected by the route
(pass) wheel history contracts > demo history follows the wheel loss rate within the available level range [0.44ms]
(pass) wheel history contracts > labels the 250 h window with hours before now [0.42ms]
(pass) wheel history contracts > labels longer windows with localized calendar dates [5.28ms]

src/ops/report/reportLocalization.test.ts:
(pass) report Spanish localization > renders role names in Spanish [0.09ms]
(pass) report Spanish localization > renders the simulated window, escalation texts and checklist in Spanish [0.08ms]
(pass) report Spanish localization > exposes minute ticks for the chart axes [0.01ms]

src/ops/report/logic.test.ts:
(pass) synthetic incident report > assembles the canonical N1 to N4 simulated walk [0.04ms]

src/ops/fleet/FleetPage.provenance.test.ts:
(pass) fleet per-field provenance > a LIVE-merged row keeps demo telemetry labeled DEMO at the field [2.23ms]
(pass) fleet per-field provenance > demo rows label every field DEMO [0.81ms]
(pass) fleet per-field provenance > live device without a level keeps level DEMO while last-comm stays LIVE [0.70ms]
(pass) fleet per-field provenance > negative: a demo temperature in a LIVE row renders unlabeled without the fix [0.66ms]
(pass) fleet per-field provenance > level LIVE does not cover demo sigma: distinct badges EN+ES [0.65ms]

src/ops/fleet/logic.test.ts:
(pass) fleet overview logic > groups demo wheels by truck and preserves both positions [0.07ms]
(pass) fleet overview logic > counts alerts and communication states [0.11ms]
(pass) fleet overview logic > filters model, state, and wheel search [0.10ms]
(pass) fleet overview logic > replaces matching demo rows with live levels and source [0.05ms]
(pass) fleet overview logic > serializes visible rows as escaped CSV [0.08ms]
(pass) fleet overview logic > builds the monitoring detail link [0.01ms]
(pass) fleet overview logic > formats ages and keeps demo telemetry within the fixed reference day [0.13ms]
(pass) fleet per-field provenance in mergeLiveDevices > demo rows mark every merged field DEMO [0.05ms]
(pass) fleet per-field provenance in mergeLiveDevices > live merge marks only level and last-comm LIVE, demo telemetry stays DEMO [0.06ms]
(pass) fleet per-field provenance in mergeLiveDevices > live device without a level keeps level DEMO while last-comm stays LIVE [0.04ms]
(pass) fleet per-field provenance in mergeLiveDevices > live-only devices mark synthesized telemetry DEMO [0.07ms]
(pass) fleet per-field provenance in mergeLiveDevices > negative: row-level LIVE alone would silently present demo telemetry as live [0.03ms]
(pass) fleet per-field provenance in mergeLiveDevices > fleetFieldSource reads the per-field provenance map [0.02ms]
(pass) fleet per-field provenance in mergeLiveDevices > live merge keeps sigma DEMO while level goes LIVE [0.03ms]
(pass) fleet per-field provenance in mergeLiveDevices > demo rows mark sigma DEMO

src/twin/pit/dustParticles.test.ts:
(pass) dust particle logic > clamps emitter and frame parameters to the simulation bounds [0.07ms]
(pass) dust particle logic > fades particles in and out, then marks expired particles invisible [0.06ms]
(pass) dust particle logic > production frame gate skips emission and particle updates while paused [0.03ms]
(pass) dust particle logic > the production pause decision is false only while paused
(pass) dust particle logic > production frame gate runs emission and particle updates while active [0.03ms]
(pass) dust particle logic > shared scene pause gate freezes wheel motion and advances it while active [0.02ms]

src/twin/pit/pitTerrain.test.ts:
(pass) pit terrain math > seats berm toe just below terrain and buries the lower vertex [0.02ms]
(pass) pit terrain math > samples the same triangulated surface used by the rendered terrain [0.07ms]
(pass) pit terrain math > clamps bench height at the surface and full pit depth [0.07ms]
(pass) pit terrain math > keeps each bench face monotonic and ramps through full depth [0.72ms]
(pass) pit terrain math > seeded terrain stays deterministic at fixed coordinates [39.03ms]

src/twin/pit/pitLayout.test.ts:
(pass) pit layout > keeps route and terrain deterministic for a seed [34.82ms]
(pass) pit layout > provides a graded ramp and full bench depth [14.29ms]

src/twin/pit/buildPit.test.ts:
(pass) pit build helpers > exposes theoretical bench levels without constructing Three.js geometry [0.04ms]

src/twin/pit/pitSpec.test.ts:
(pass) pit spec: safety rules > the safety berm is at least the rolling radius of the largest tire [0.02ms]
(pass) pit spec: safety rules > the berm base follows the 1.5:1 side slope (about 5.7 m for 1.9 m) [0.01ms]
(pass) pit spec: safety rules > a two-lane road is at least 3.5 times the widest vehicle [0.03ms]
(pass) pit spec: safety rules > the curve radius clears the turning circle of the truck [0.02ms]
(pass) pit spec: safety rules > the dump pocket is wider than the body and clears the raised body [0.03ms]
(pass) pit spec: geometry > grade converts to a chassis pitch angle: 10 % is 5.71 degrees [0.03ms]
(pass) pit spec: geometry > ramp length follows from depth and grade [0.02ms]
(pass) pit spec: geometry > bench run is the face projection plus the catch bench (modified Ritchie) [0.03ms]
(pass) pit spec: geometry > the bench height stays within the shovel cutting height [0.02ms]
(pass) pit spec: geometry > shovel passes follow from payload: 290.3 t over the dipper payload [0.01ms]
(pass) pit spec: speeds and provenance > speed ordering: loaded uphill < empty uphill < flat limits [0.02ms]
(pass) pit spec: speeds and provenance > km/h <-> m/s conversions round-trip [0.02ms]
(pass) pit spec: speeds and provenance > every parameter carries a provenance tag and a source [0.17ms]

src/twin/pit/shovel.test.ts:
(pass) shovel cycle pose > wraps negative and positive times into one repeatable cycle [0.11ms]
(pass) shovel cycle pose > opens the dipper door only during its dump window [0.03ms]

src/twin/truck930e/build930E.test.ts:
(pass) 930E model: envelope and budget > fits the brochure envelope (stairs project about a metre past the bumper) [122.81ms]
(pass) 930E model: envelope and budget > keeps the draw-call budget: meshes x2 (shadow pass) under 150 [69.78ms]
(pass) 930E model: envelope and budget > origin is the rear-axle centre: rear wheels at x=0, front axle at the wheelbase [70.76ms]
(pass) 930E model: controls > body tilt reaches the published body-up height and is clamped to 45 degrees [74.14ms]
(pass) 930E model: controls > hoist cylinders telescope: the three stages lengthen with the tilt [43.85ms]
(pass) 930E model: controls > steering follows Ackermann: the inner wheel turns more [46.62ms]
(pass) 930E model: controls > wheels integrate the commanded spin rate [47.98ms]
(pass) 930E model: controls > payload shows the heap and lowers the chassis a few centimetres, never the axle [38.66ms]
(pass) 930E model: controls > mode tint repaints only the accent material [36.82ms]
(pass) 930E model: geometry hygiene > no NaN positions and every mesh has normals [47.61ms]
(pass) 930E model: geometry hygiene > dispose is idempotent and detaches the group [64.73ms]

src/twin/truck930e/kinematics.test.ts:
(pass) body hoist kinematics > body-up height at 45 degrees falls in the published 14.0-14.8 m range [0.05ms]
(pass) body hoist kinematics > rest height matches the brochure canopy tip [0.02ms]
(pass) body hoist kinematics > tilt is clamped to 0..45 degrees [0.06ms]
(pass) body hoist kinematics > the hinge point does not move [0.04ms]
(pass) body hoist kinematics > hoist cylinder retracts to about 1.7 m and extends to a 3-stage stroke [7.47ms]
(pass) body hoist kinematics > hoist cylinder grows monotonically with the tilt and rotates toward vertical [0.11ms]
(pass) body hoist kinematics > three telescoping stages overlap so the sum equals the total length [0.04ms]
(pass) steering and suspension > Ackermann: inner wheel turns more than the outer, mirrored for right turns [0.09ms]
(pass) steering and suspension > Ackermann wheels share the turn centre on the rear axle line [2.26ms]
(pass) steering and suspension > payload compresses the struts by a few centimetres [0.06ms]

src/twin/truck930e/spec.test.ts:
(pass) 930E-4SE spec provenance > every field carries a tag, a unit and a source [1.21ms]
(pass) 930E-4SE spec provenance > field names are unique within their group and the three tags all appear [0.33ms]
(pass) 930E-4SE spec provenance > brochure chassis dimensions match the published values [0.05ms]
(pass) 930E-4SE spec provenance > course envelope is kept as a labelled alternative, not mixed with the brochure [0.04ms]
(pass) derived quantities > tire OD sits in the 3.75-3.84 m range and the rim is 63 in [0.43ms]
(pass) derived quantities > rolling circumference is consistent with the free radius [0.09ms]
(pass) derived quantities > wheel RPM at 64.5 km/h matches the GDY106 chain at 3000 rotor RPM [0.14ms]
(pass) derived quantities > dual tire spacing reproduces the width over duals and the inner gap [0.05ms]
(pass) derived quantities > front track minus the tire width gives the brochure clear gap [0.02ms]
(pass) derived quantities > overhangs and wheelbase add up to the brochure overall length [0.02ms]
(pass) derived quantities > axle height stays below the free radius by the visual sag only [0.02ms]

src/twin/render/transmissionTarget.test.ts:
(pass) transmission render target mipmap configuration > disables mipmap generation for the multisampled transmission target [0.78ms]
(pass) transmission render target mipmap configuration > leaves unrelated render targets unchanged [0.12ms]

src/twin/render/labels.test.ts:
(pass) labelClassName > defaults to the neutral pill [0.06ms]
(pass) labelClassName > composes tone, leader, interactive and extra classes in order [0.02ms]
(pass) labelClassName > omits leader and interactive when false [0.02ms]

src/twin/render/materials.test.ts:
(pass) palette > komatsu yellow is in the yellow hue band [0.16ms]
(pass) palette > oil is amber/brown, never green [0.04ms]
(pass) material library > caches instances by name [29.14ms]
(pass) material library > komatsu yellow is a clearcoated physical material [0.19ms]
(pass) material library > machined steel is fully metallic [0.11ms]
(pass) material library > oil 85W-140 transmits light with ior 1.48 [0.22ms]
(pass) material library > rubber tire is very dark and rough [0.16ms]
(pass) material library > ground textures: sRGB albedo, linear roughness, power-of-two [25.45ms]
(pass) procedural surfaces > dirt maps are deterministic [3.48ms]
(pass) procedural surfaces > dirt and rock differ [2.82ms]
(pass) procedural surfaces > albedo is opaque RGBA and roughness stays in a rough range [0.91ms]
(pass) procedural surfaces > rejects sizes that are not a power of two [0.43ms]
(pass) procedural surfaces > tread height tiles in u and v and has both lugs and grooves [0.31ms]
(pass) procedural surfaces > surfaceTextures wraps in repeat mode with the requested tiling [0.40ms]

src/twin/render/settings.test.ts:
(pass) resolveQuality > low caps the pixel ratio at 1 and disables shadows [0.09ms]
(pass) resolveQuality > high caps the pixel ratio at 2 and keeps a 2048 shadow map [0.02ms]
(pass) resolveQuality > medium uses a smaller shadow map [0.01ms]
(pass) resolveQuality > falls back to ratio 1 for invalid device pixel ratios [0.01ms]
(pass) sunDirection > is a unit vector [0.13ms]
(pass) sunDirection > elevation 90 points straight up [0.03ms]
(pass) sunDirection > azimuth 0 at the horizon points along +Z [0.03ms]
(pass) preset defaults > outdoor exposes a larger shadow box than studio [0.02ms]
(pass) preset defaults > outdoor exposure is lower to compensate the bright sky [0.01ms]

src/twin/render/labelLayout.test.ts:
(pass) clampLabelCenterX > preserves the preferred center when the label already fits [0.05ms]
(pass) clampLabelCenterX > moves a right-clipped label left without clipping its right edge [0.02ms]
(pass) clampLabelCenterX > clamps a sensor label to the least-shifted position that fits [0.02ms]

src/twin/fleet/fleetSim.test.ts:
(pass) synthetic route > is a closed loop with a reverse leg between the bay entry and the dump spot [0.15ms]
(pass) synthetic route > the loaded lane climbs at the 10 % design grade [0.03ms]
(pass) speed limits by grade and load > loaded uphill at 10 % is about 12.5 km/h and empty about 29 km/h [0.06ms]
(pass) speed limits by grade and load > flat is faster than uphill; empty downhill is retarding-limited below the flat limit [0.03ms]
(pass) speed limits by grade and load > the profile slows the truck before a curve and the reverse leg [0.63ms]
(pass) wheel and rotor speed > rotor rpm goes through the GDY106 train and returns the wheel rpm [0.05ms]
(pass) fleet cycle > a truck completes the cycle: payload goes 0 -> about 290 t -> 0 [16.26ms]
(pass) fleet cycle > payload rises in as many steps as shovel passes [4.96ms]
(pass) fleet cycle > follows the PLM III state order through a full cycle [14.26ms]
(pass) fleet cycle > only one truck loads at a time and only one dumps at a time [65.64ms]
(pass) fleet cycle > trucks never overlap on the path and keep their minimum headway [68.47ms]
(pass) fleet cycle > a queue forms at the shovel when the fleet outpaces it [10.31ms]
(pass) recalibration gating (stopped + leveled + engine-on) > recal equals stopped && leveled && engineOn on every tick of every truck [58.92ms]
(pass) recalibration gating (stopped + leveled + engine-on) > a truck stopped on the ramp is queued but NOT recal (not leveled) [2.33ms]
(pass) recalibration gating (stopped + leveled + engine-on) > a truck stopped on flat ground with the engine on is recal; with the engine off it is not [1.19ms]
(pass) determinism and identity > same seed gives the same history; a different seed changes the payloads [116.64ms]
(pass) determinism and identity > ids OG-01..OG-05 carry two wheels each and OG-03 RL is the leak demo unit [0.49ms]
(pass) determinism and identity > the dump tilts the body 0 -> 45 -> 0 degrees [4.71ms]

src/twin/fleet/fleetStore.test.ts:
(pass) fleet store > publishes snapshots at about 5 Hz, not on every frame [3.86ms]
(pass) fleet store > getSnapshot is stable between publications (same object) [0.97ms]
(pass) fleet store > time compression multiplies the sim clock; pause freezes it; step advances it anyway [1.22ms]
(pass) fleet store > selection is published and unsubscribing stops notifications [0.60ms]

src/sim/bench/oil.test.ts:
(pass) oil state labels > uses the bilingual dictionary for each threshold state [0.06ms]
(pass) oil state labels > formats the oil HUD number in English and Spanish [0.20ms]

src/sim/bench/gearRatioDisplay.test.ts:
(pass) GDY106 gear ratio display > formats the English manual total and rounded stages [0.35ms]
(pass) GDY106 gear ratio display > formats the Spanish manual total with comma decimals [0.18ms]

src/sim/bench/wheelUrl.test.ts:
(pass) wheel route handoff state > uses calibrated demo defaults when the URL has no query [0.08ms]
(pass) wheel route handoff state > restores sensor, fill, motion, cutaway, and exploded state [0.03ms]
(pass) wheel route handoff state > clamps imported oil volume and ignores non-finite values [0.02ms]
(pass) wheel route handoff state > builds a wheel detail URL carrying the selected truck and wheel [0.06ms]
(pass) wheel route handoff state > encodes identifiers in the wheel detail query [0.02ms]

src/sim/bench/settling.test.ts:
(pass) viscosity proxy labels > uses bilingual dictionary copy for each proxy range [0.05ms]

src/sim/truck/motion.test.ts:
(pass) dump tilt profile > starts and ends flat, peaks at 45 degrees mid-phase [0.06ms]
(pass) dump tilt profile > rises monotonically then falls monotonically [0.08ms]
(pass) payload per phase > empty at the start of LOAD, full from the end of LOAD through HAUL [0.08ms]
(pass) payload per phase > drains during DUMP and stays empty on WAIT [0.02ms]
(pass) steering > straight travel keeps the wheels straight [0.03ms]
(pass) steering > turns toward the yaw direction and clamps at the stop [0.02ms]

src/sim/truck/mineWorld.test.ts:
(pass) mine URL controls > normalizes the shared camera preset set, including free camera [0.03ms]
(pass) mine URL controls > defaults missing and blank seeds while preserving explicit finite values [0.11ms]
(pass) mine URL controls > accepts only finite positive scale and known camera presets [0.02ms]
(pass) mine URL controls > uses an explicit simulation time and pause flag [0.01ms]

src/sim/truck/mineSceneCopy.test.ts:
(pass) mine scene copy > localizes every interest label and preserves the ramp assumption marker [0.13ms]
(pass) mine scene copy > translates all PLM III state names for the HUD [0.09ms]
(pass) mine scene copy > localizes the selected truck HUD title and its cycle word [0.23ms]
(pass) mine scene copy > localizes the HUD movement status without changing its fact [0.05ms]

src/sim/truck/TruckSheet.test.tsx:
(pass) truck technical sheet locale formatting > renders dimensions, weights, capacity, and provenance with decimal commas in Spanish [6.05ms]
(pass) truck technical sheet locale formatting > renders the same technical values with decimal points in English [6.60ms]

 487 pass
 0 fail
 152468 expect() calls
Ran 487 tests across 85 files. [2.29s]
```

Exit 0.

**Frontend build** — `cd frontend && bun run build`

```text
$ astro check && astro build
21:42:49 [vite] Re-optimizing dependencies because vite config has changed
21:42:50 [content] Syncing content
21:42:50 [content] Synced content
21:42:50 [types] Generated 835ms
21:42:50 [check] Getting diagnostics for Astro files in /Users/sebitabravo/Developer/oilguard/frontend...
[96msrc/ops/alerts/AlertDetailPage.tsx[0m:[93m40[0m:[93m31[0m - [93mwarning[0m[90m ts(6133): [0m'record' is declared but its value is never read.

[7m40[0m function SignalCharts({ lang, record, window, live }: { lang: Lang; record: AlertRecord; window: SignalWindow | null; live: boolean }) {
[7m  [0m [93m                              ~~~~~~[0m

[96msrc/sim/bench/BenchScene.tsx[0m:[93m130[0m:[93m38[0m - [93mwarning[0m[90m ts(6133): [0m'controls' is declared but its value is never read.

[7m130[0m     const { scene, camera, renderer, controls } = stage;
[7m   [0m [93m                                     ~~~~~~~~[0m

[96msrc/twin/fleet/fleetSim.ts[0m:[93m383[0m:[93m11[0m - [93mwarning[0m[90m ts(6133): [0m'route' is declared but its value is never read.

[7m383[0m     const { route } = this;
[7m   [0m [93m          ~~~~~~~~~[0m

[96msrc/twin/truck930e/build930E.test.ts[0m:[93m8[0m:[93m7[0m - [93mwarning[0m[90m ts(6133): [0m'RAD' is declared but its value is never read.

[7m8[0m const RAD = Math.PI / 180;
[7m [0m [93m      ~~~[0m

[96msrc/ui/Drawer.tsx[0m:[93m36[0m:[93m25[0m - [93mwarning[0m[90m ts(6385): [0m'TargetedEvent' is deprecated.

[7m36[0m   const onKey = (e: JSX.TargetedEvent<HTMLDivElement, KeyboardEvent>) => {
[7m  [0m [93m                        ~~~~~~~~~~~~~[0m

[96msrc/ui/foundation.tsx[0m:[93m382[0m:[93m73[0m - [93mwarning[0m[90m ts(6385): [0m'ButtonHTMLAttributes' is deprecated.

[7m382[0m export function Button({ children, variant = "primary", ...props }: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) { return <button {...props} className={`og-button og-button--${variant}`}>{children}</button>; }
[7m   [0m [93m                                                                        ~~~~~~~~~~~~~~~~~~~~[0m
[96msrc/ui/foundation.tsx[0m:[93m380[0m:[93m35[0m - [93mwarning[0m[90m ts(6385): [0m'InputHTMLAttributes' is deprecated.

[7m380[0m export function Slider(props: JSX.InputHTMLAttributes<HTMLInputElement>) { return <input type="range" {...props} />; }
[7m   [0m [93m                                  ~~~~~~~~~~~~~~~~~~~[0m
[96msrc/ui/foundation.tsx[0m:[93m155[0m:[93m26[0m - [93mwarning[0m[90m ts(6133): [0m'lang' is declared but its value is never read.

[7m155[0m export function Notice({ lang, children, kind = "info" }: { lang: Lang; children: ComponentChildren; kind?: "info" | "warning" | "error" | "simulation" | "stale" | "partial" | "analyzer-unavailable" }) {
[7m   [0m [93m                         ~~~~[0m
[96msrc/ui/foundation.tsx[0m:[93m44[0m:[93m33[0m - [93mwarning[0m[90m ts(6133): [0m'lang' is declared but its value is never read.

[7m44[0m export function ProvenanceTag({ lang, value = "DERIVED" }: { lang: Lang; value?: "VERIFIED" | "DERIVED" | "ASSUMPTION" }) {
[7m  [0m [93m                                ~~~~[0m
[96msrc/ui/foundation.tsx[0m:[93m18[0m:[93m31[0m - [93mwarning[0m[90m ts(6133): [0m'lang' is declared but its value is never read.

[7m18[0m export function StatusBadge({ lang, label, tone = "nominal", severity }: StatusBadgeProps) {
[7m  [0m [93m                              ~~~~[0m

Result (263 files):
- 0 errors
- 0 warnings
- 10 hints

21:43:03 [content] Syncing content
21:43:03 [content] Synced content
21:43:03 [types] Generated 759ms
21:43:03 [build] output: "static"
21:43:03 [build] mode: "static"
21:43:03 [build] directory: /Users/sebitabravo/Developer/oilguard/frontend/dist/
21:43:03 [build] Collecting build info...
21:43:03 [build] ✓ Completed in 835ms.
21:43:03 [build] Building static entrypoints...
21:43:04 [vite] ✓ built in 786ms
21:43:06 [WARN] [vite] [plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
21:43:06 [vite] ✓ built in 1.40s
21:43:06 [build] Rearranging server assets...

 generating static routes
21:43:06   ├─ /alerts/detail/index.html (+16ms)
21:43:06   ├─ /alerts/rules/index.html (+4ms)
21:43:06   ├─ /alerts/index.html (+4ms)
21:43:06   ├─ /calibration/index.html (+3ms)
21:43:06   ├─ /demo/index.html (+4ms)
21:43:06   ├─ /dev/ui/index.html (+14ms)
21:43:06   ├─ /devices/index.html (+3ms)
21:43:06   ├─ /docs/index.html (+9ms)
21:43:06   ├─ /docs/architecture-telemetry.md/index.html (+5ms)
21:43:06   ├─ /docs/bench/precision.md/index.html (+2ms)
21:43:06   ├─ /docs/bench/README.md/index.html (+2ms)
21:43:06   ├─ /docs/bench/stress.md/index.html (+2ms)
21:43:06   ├─ /docs/calibration.md/index.html (+2ms)
21:43:06   ├─ /docs/demo-script.md/index.html (+2ms)
21:43:06   ├─ /docs/edge-sim.md/index.html (+2ms)
21:43:06   ├─ /docs/feasibility.md/index.html (+1ms)
21:43:06   ├─ /docs/inspection.md/index.html (+2ms)
21:43:06   ├─ /docs/models.md/index.html (+1ms)
21:43:06   ├─ /docs/progreso-tarea.md/index.html (+2ms)
21:43:06   ├─ /docs/research/twin-reference.md/index.html (+2ms)
21:43:06   ├─ /docs/t10-rul-ladder.md/index.html (+1ms)
21:43:06   ├─ /docs/t3-oil-settling.md/index.html (+2ms)
21:43:06   ├─ /docs/t4-truck-cycle.md/index.html (+1ms)
21:43:06   ├─ /docs/t5-modes-cameras.md/index.html (+1ms)
21:43:06   ├─ /docs/t7-windows.md/index.html (+1ms)
21:43:06   ├─ /docs/t9-anomaly.md/index.html (+1ms)
21:43:06   ├─ /docs/thesis-annex.md/index.html (+1ms)
21:43:06   ├─ /fleet/index.html (+23ms)
21:43:06   ├─ /lab/bench/index.html (+3ms)
21:43:06   ├─ /lab/sim/index.html (+2ms)
21:43:06   ├─ /lab/validation/index.html (+2ms)
21:43:06   ├─ /link/index.html (+5ms)
21:43:06   ├─ /login/index.html (+3ms)
21:43:06   ├─ /mine/index.html (+5ms)
21:43:06   ├─ /monitoring/index.html (+2ms)
21:43:06   ├─ /report/index.html (+2ms)
21:43:06   ├─ /rul/index.html (+2ms)
21:43:06   ├─ /wheel/history/index.html (+3ms)
21:43:06   ├─ /wheel/index.html (+2ms)
21:43:06   ├─ /index.html (+10ms)
21:43:06 ✓ Completed in 205ms.

21:43:06 [build] ✓ Completed in 2.43s.
21:43:06 [build] 40 page(s) built in 3.28s
21:43:06 [build] Complete!
```

Exit 0.

**Honesty/i18n guard** — `cd frontend && bun test src/i18n/index.test.ts src/honesty.test.ts`

```text
bun test v1.4.2 (50a8a8387)

src/honesty.test.ts:
(pass) honesty matcher > normalizes case and accents while respecting short-token boundaries [5.68ms]
(pass) frontend honesty guard > contains no unsupported claims or machine-control actions [392.96ms]

src/i18n/index.test.ts:
(pass) i18n dictionary > every key has non-empty EN and ES copy [1.45ms]
(pass) i18n dictionary > no sprint or task codes leak into UI copy [1.78ms]
(pass) i18n dictionary > Spanish dictionary copy keeps required accents [3.18ms]
(pass) i18n dictionary > Spanish dictionary copy uses decimal commas outside factual specifications [1.42ms]
(pass) i18n dictionary > the demo lab note formats every displayed number for the selected language [3.04ms]
(pass) i18n dictionary > the dashboard footnote reflects the geometry-derived pressure [0.16ms]
(pass) i18n dictionary > navigation exposes the three product sections [0.02ms]

 9 pass
 0 fail
 5637 expect() calls
Ran 9 tests across 2 files. [482.00ms]
```

Exit 0.

**Disposable-copy negative proof** — `cd <disposable-copy>/frontend && bun test src/lab/calibration/logic.test.ts`

```text
bun test v1.4.2 (50a8a8387)

src/lab/calibration/logic.test.ts:
(pass) pause calibration logic > classifies nominal, slow and invalid settling windows [0.08ms]
(pass) pause calibration logic > samples pressure in kPa on seconds after stop with a steady asymptote [0.66ms]
(pass) pause calibration logic > fits tau from sampled relaxation without changing its seconds scale [0.45ms]
(pass) pause calibration logic > marks model classifications synthetic while physical bench evaluation stays absent [0.06ms]
54 |         [0.75, 0, "motion"],
55 |         [0.75, 0, "waiting"],
56 |       ] as const) {
57 |         const evidence = calibrationVerdictEvidence(tau, residual, window);
58 |         const html = renderToString(h(CalibrationVerdictPanel, { lang, evidence, tauS: tau, residualL: residual }));
59 |         expect(html).toContain(synthetic);
                          ^
error: expect(received).toContain(expected)

Expected to contain: "Synthetic model result"
Received: "<aside class=\"calibration-page__verdict calibration-page__verdict--nominal\" aria-live=\"polite\"><div class=\"calibration-page__verdict-label\">Model verdict</div><h3>Nominal · synthetic model</h3><p>The generated curve's fitted tau falls at or below the nominal model value; this is not a physical pass.</p><p>Physical bench: Not evaluated</p><dl><div><dt>Fitted tau</dt><dd>0.75 s</dd></div><div><dt>Fit residual</dt><dd>0.001 L</dd></div></dl></aside>"

      at <anonymous> (/private/var/folders/bj/3qcy2bvx4n5_qbxhsbg9cww40000gn/T/oilguard-a05-negative-x265znca/frontend/src/lab/calibration/logic.test.ts:59:22)
(fail) pause calibration logic > renders a synthetic model verdict and physical NOT EVALUATED in both locales [5.33ms]

 4 pass
 1 fail
 16 expect() calls
Ran 5 tests across 1 file. [27.00ms]
negative_regression_exit=1
```

Exit 1.

### Work-unit landing batch — recorded 2026-10-11 (America/Santiago), nine commits on top of `8ef515f`

Fresh gates re-verified by the recorder (not copied): `cd frontend && bun test src` → 594 pass, 0 fail, 150319 expectations, 97 files, exit 0; `cd frontend && bun run build` → 44 pages, exit 0. Stats below are real `git show --stat` counts. Focused-test counts are commit-recorded (bilingual-era tree); shared files co-evolved into the Spanish-only commit, whose ES-only state is final.

- **A04 — DONE `4ed5b1a`** (5 files, +597/−542): per-field numeric provenance with source labels. Commit-recorded gates: focused WheelPanels.provenance + outage 18 pass; disposable-copy negative fails on an unlabeled demo number. Fusion note: `Dashboard.tsx` / `dict/ops.ts` co-evolved with later S01–S06 work; final ES-only state is in `8dc5f4f`; bilingual-era evidence stays in §3.1 above.
- **A05 — DONE `b7df2af`** (4 files, +543/−420): synthetic calibration verdict, physical bench explicitly not evaluated. Commit-recorded gates: focused calibration logic 5 pass, full suite 487 pass, build clean; disposable-copy negative fails without the badge. Fusion note: shared `dict/platform.ts` co-evolved with A06/S01–S06; final ES-only state is in `8dc5f4f`.
- **A06 — DONE `71e0719`** (4 files, +166/−71): pooled fixture RMSE tile (n=350, bias, MAE, fixture path) plus non-bench falsifier note; metric logic untouched. Commit-recorded gates: validation logic + rmse 23 pass; full-suite order-leak fixed via optional lang prop. Fusion note: shared validation files co-evolved with S04/S05; final ES-only state is in `8dc5f4f`.
- **S01–S06 — DONE `8dc5f4f` (BREAKING)** (122 files, +5647/−3018): Spanish-only UI, English removed. Commit-recorded gates: `bun test src` 594/0, `astro check` 0 errors, build 44 pages. Carries in-progress B02–B08 landing hunks (units pending formal pass, not claimed), post-A03 sigma-DEMO fleet follow-up, and A06 validation hunks in shared dict. Rescue: bilingual tree at `8ef515f`, no history rewrite.
- **A07+A08 — DONE `e116e53`** (2 files, +36/−29, shared commit): one identical falsifier block in `docs/calibration.md` + `docs/thesis-annex.md` (only MIN_R2 implemented; bias/RMSE NOT IMPLEMENTED); every code anchor names a real symbol, zero file:line anchors.
- **A09+A10 — DONE `dec47dc`** (2 files, +7/−5, shared commit): untraceable USD 150k removed from the submission argument (history reason preserved in PRODUCT.md); turning-circle VERIFIED 30.4m corrected to 29.7m with the reason retained.
- **A11+A12 — DONE `4f735ef`** (5 files, +479/−9, shared commit): per-case stress deltas recomputed from committed JSONs (pytest 4 pass; disposable-copy negative catches cumulative-as-delta); 33-path integrity inventory with honesty-gate no-shrink/no-exemption extension; raw zero-match stays UNRESOLVED.
- **A13+B01 — DONE `a752832`** (2 files, +313, both new, shared commit): evidence-only Front-A closure audit plus read-only landing-claims trace (mounts/pauses/ratio sourced, TRL UNRESOLVED, 7 gaps). The A13 report predates the F-01 order-leak fix; F-01 was fixed after (mock initializer + lang prop) — the fresh 594/0 suite and 44-page build above confirm post-fix green.
- **B03 evidence — landed `9e911c9`, unit formally pending** (1 file, +56, new `docs/bench/landing-performance.md`): perf budget SET, without-3D baseline MEASURED (39KB HTML / 21KB island / 0 canvas SSR). Code already in tree per the S01–S06 commit note; B02–B12 units pending formal pass.

### Herdr completion signal

Use Herdr lifecycle waits rather than fixed sleeps: for an already-running OpenCode task, wait with `herdr agent wait <pane> --until idle --until done --timeout <ms>`, then confirm with `herdr agent get` and read the final response. For newly submitted work to an idle agent, `herdr agent prompt <pane> "<task>" --wait --until idle --until done --timeout <ms>` can wait for completion. The default wait also returns on `blocked`; during A01 it returned `blocked` while a subsequent `agent get` still showed `working`, so a default wait result alone is not proof of completion. If the selected wait reports `done`, confirm that terminal state with `get` before reading the final output.

## 4. Execution order and global proof contract

All Front A tasks run before any Front B task, in numeric order A01 through A13, then B01 through B12. A09, A10, and A11 are technically independent disjoint docs and are ordered only for single-writer serialization, as stated in their rows; every other dependency in the table is technical (shared files or required prior wording/evidence). All of Front B still depends on full Front A closure via B01 on A13. OpenCode executes exactly one task at a time in Herdr `w1T:p3`; the parent reviews the full diff plus pasted proof before authorizing the next task. Disjoint tasks never run in parallel writers. Work-unit commits happen only after implementation approval is granted, one task at a time, using Conventional Commits with no attribution footer; no push, PR, or merge is planned in this plan. The active feature branch is `feat/integrity-narrative`, based on `a739728703fa110789909a8079b7d8af72e04e0e`. Current work, including user-owned `.codex/hooks.json`, is preserved exactly as found.

Global proof contract (mandatory for every implementation task): full diff read by the parent; no unjustified dependencies added; full stdout/stderr plus exit status pasted for every command; every behavior change ships a negative test that is replayed against the pre-fix code in a disposable copy; the honesty guard runs green for any user-visible claim; closure evidence for every UI task is desktop plus mobile plus reduced-motion captures in BOTH locales (per-task rows may show shorter targeted examples, but closure always carries the full matrix); backend-down testing uses only a disposable local backend started and owned by the test, records its process handle, and restores it afterward — never stops the user's unrelated service; test files live in the owning task's editable scope and assert actual behavior, never file-string snapshots; per-field provenance stays per FIELD.

## 5. Out of scope and approval blockers

Out of scope: bench or physical evaluation; touching physics or thresholds to improve numbers; new runtime gates without bench data; success cases, real sites, testimonials, forensic claims; normative compliance claims (`SIL`, `ISO 13849`, `IEC 62443` levels); named models not implemented and tested; marketing tone or landing ROI hero; generated 3D assets from external account/key/paid services; uploads to external services; refactors bundled with fixes; design-token overhauls without their own task; deleting the retired reference model without an explicit author decision; new dependencies without written approval; shared `stage.ts` rewrites unless proven necessary and parent-approved; page-architecture changes (framework-wide migrations or unrelated routes — not the narrowly proposed bilingual landing integration in B02/B10); push/PR/merge; any production edit before approval.

Execution is authorized by the user's explicit approval. Start with A01 only; proceed task by task after parent readback of the diff and observed proof. Real decision gates remain: A12 must return the literal-scan/policy conflict and exact remediation scope for explicit user approval before any wider remediation; B01 must trace physical facts and record the author's TRL posture verbatim, asking the user if that numeric decision remains unresolved. Mounting and pause-count claims are source questions, not assumptions. Keep the clean-tree condition pending owner resolution; never claim the goal complete while `.codex/hooks.json` remains dirty.

## Coverage checklist

- Source-brief section 9 condition 1 (four integrity findings closed; docs and code agree on gates): A06, A07, A08, A13.
- Source-brief section 9 condition 2 (RMSE reported with value and context): A06, A13.
- Source-brief section 9 condition 3 (backend-down says so; proven by disposable backend plus screenshot): A01, A13.
- Source-brief section 9 condition 4 (every demo datum labeled per field, live and down): A02, A03, A04, A13.
- Source-brief section 9 condition 5 (landing explains end to end; 3D rotates, every sensor selectable with measurement detail, cycle marks pauses): B04, B05, B06, B11, B12.
- Source-brief section 9 condition 6 (banned-term search across the repo including docs returns zero): A12 (inventory plus policy decision first; stays UNRESOLVED until then), A13.
- Source-brief section 9 condition 7 (functional repo, green suite, written done/not-done record; clean tree PENDING OWNER RESOLUTION, never complete while dirty): A13, B12.
- All eight beats (cover, today, gap, turn, how, difficulty, measured, today-state): B02 content, B03 host, B11/B12 verification.
- All four scenes (A cutaway, B sensors, C cycle, D oil): B04, B05, B06, B07, each in its own scene module plus exact poster SVG.
- Gear 32.62:1 source traced before demonstration: B01, B04.
- All sensor cards (pressure, temperature, vibration, current with mount/install/modification): B01, B05.
- Static posters for all four scenes plus no-WebGL/no-JS equivalents: B03 exact SVG paths, B10.
- Numeric provenance everywhere (no visible number without source): B02, B07, B11, B12.
- Resource lifecycle (one loop, hidden/out-of-view pause, dispose, DPR max 2, resize): B09 enforced from the B03 budget.
- Performance budgets (SET and without-3D baseline MEASURED at B03 before scene work; enforced at B09; no invented measurements): B03, B09.
- Four widths (390/768/1024/1440): §4 closure matrix, B11, B12.
- Both languages (EN/ES complete, no missing keys): B02, B05, B10, B11.
- No-JS and reduced-motion coverage: B02, B03, B10, B11.
- Human three-minute comprehension check (human evidence, never model self-review): B12.
- No dependency without written approval: every task acceptance plus section 5.

B09 observed: landing lifecycle tests 118/0, full frontend tests 615/0, build 44 pages, and 1440px browser capture showed 0→1 canvas with one active callback in view, then 1→0 pending callbacks after scrolling beyond its viewport margin; evidence is in `/tmp/og-goal/evidence/B09/`.

B09 follow-up observed: at device scale 3, both mounted landing renderer backing ratios were 2; two scene canvases had 0 pending RAFs outside the real viewport, and island unmount removed both with two context-loss events. Cold first paint/FCP measured 168 ms; this is not a historical pre-change baseline.

B09 correction observed: focused landing tests 119/0, full frontend tests 616/0, build 44 pages, `/Users/` grep zero matches; browser integration evidence and the clock-before-RAF regression are under `/tmp/og-goal/evidence/B09/`.
B09 ordering correction observed: event-order regression now preserves clock reset before initial/resume RAF and queues each default RAF before frame clock/render; focused tests 119/0, full suite 616/0, build 44 pages, cold FP/FCP 280 ms, in-view one RAF and out-of-view zero; evidence `/tmp/og-goal/evidence/B09/default-order-*`.

### B02–B08 — formal parent pass GREEN (2026-10-11; code already in tree via S01–S06 commit)

Parent re-ran every B-unit focused suite plus the full gates on the clean tree (only `.codex/hooks.json` restored to committed form since): B02 beats+locale 12/0, B03 scene host 12/0, B04 assembly+scene 23/0, B05 sensors+details 16/0, B06 cycle+scene 24/0, B07 oil+plot 26/0, B08 story progress 13/0; full `bun test src` 594/0 across 97 files; `bun run build` 44 pages exit 0. Counts differ from worker-time reports because S05 rewrote the suites ES-only (same behavior coverage). B02–B08 remain formally pending as units; no scope/acceptance text changed.

### Review activation outcome (2026-10-11; user consented, RDD on)

Native review activated per user consent. Full-range candidate (151 paths / 14,365 lines, medium) and docs-tail candidate (14 paths / 2,770 lines, medium) both ended terminal `lens_context_budget_exceeded` — no authority created, nothing abandoned, commits intact. Code units A04/A05/A06/Spanish-only cannot be isolated as native candidates (assess is base-to-HEAD only; moving HEAD is refused), so their verification of record is `bun test src` 594/0 + `bun run build` 44 pages + the audit. Pure-docs slices are passive-skipped by rule. User decision: accept functional gates as record; review stays enabled for future small slices. No delivery approval implied by any review outcome; push/PR/merge remain separate human decisions.

## Recovery footer

No authoritative runtime memory identity was available in this pane, so no Engram mirror or session-summary writes were made and no substitute session IDs were invented. The existing historical TDD-on note is not proof of global config; every behavior-changing task in this plan proposes RED-GREEN-REFACTOR with a negative test replayed in a disposable copy first, subject to plan approval. About 400 authored lines per task is advisory only; never delete tests, whitespace, comments, or blank lines for size, and never split or pad work to fit the heuristic. Provisional total forecast (estimate only): 2500–5000 authored lines including tests, docs, and i18n. Delivery strategy defaults to `ask-on-risk`; the user resolved the chain strategy as `feature-branch-chain` before the A02 work-unit commit (no PR boundaries or remote actions are currently authorized). Receipt-driven development is currently on by default; this plan leaves the switch unchanged and treats native candidate consent as separate. This checked-in feature record carries the approved scope; each task still requires its own observed outcome, applicable proof, parent readback, and work-unit commit.
