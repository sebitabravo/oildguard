# ODD Feature Document — oilguard-pro-twin

## Metadata

- **Project:** oilguard
- **Feature:** oilguard-pro-twin (thesis-grade digital twin upgrade)
- **Branch:** `feature/oilguard-sim` (continues; previous feature `oilguard-mining-sim` closed)
- **Status:** in progress
- **Delivery strategy:** `exception-ok` — user explicitly authorized unlimited changes ("realiza todos los cambios que quieras", goal mode, no pause). No PR is created in this feature; slicing into PRs is decided by the user at push time.
- **Mirror:** Engram topic `odd/oilguard-pro-twin/tasks` (pending sync; Engram memory tools are unavailable in this runtime)
- **TDD:** `on` from T2 onward — source: project rule (`rules/common/testing.md`: all production code carries tests; runner must be configured before code). Runners: `pytest` (Python: `sim/`, `ai/`, `backend/`) and `bun test` (frontend pure logic; zero new frontend dependencies at T2). Recorded here; T2 configures both.
- **Created:** 2026-10-09
- **Artifact language:** English

## Objective

Raise the OilGuard Mining prototype from a "boxes and labels" demo to a thesis-grade,
physically consistent digital twin that delivers what the pre-proposal
(`pre-propuesta Hack the Challenge 2026`) promises:

1. A manual-faithful, parametric **Komatsu 930E-4SE** 3D model (replaces the HD465 visual proxy).
2. A real **open-pit mine** environment (benches, spiral ramp with grade, berms, shovel, crusher) with a **fleet** running a haul cycle aligned to the 930E Payload Meter III states.
3. A high-fidelity **GDY106 motorized-wheel cutaway** (Fig. 95 GEK-91680A) with a correct two-stage planetary (32.62:1), amber 85W-140 oil pool driven by the same geometry/physics model as the signal pipeline, and sensors at their real service points.
4. A **physics core** that is internally consistent: gear-case geometry h(V), hydrostatic p(V,T), sensitivity, sensor-range spec — replacing the absurd 28 kPa @ 95 L anchor.
5. The pre-proposal **dashboard** (§4.1): fleet overview with per-wheel traffic light, wheel detail in two clicks, temperature/vibration/current series, settling indicator, combined-risk rule (§4.2).
6. **Security** slice from §8.2: per-device signed measurements verified at ingest.
7. **Engineering quality**: automated tests (pytest + bun test), CI workflow file, updated thesis docs.

## Problem (review findings, 2026-10-09)

- F1 (credibility, high): truck mesh is an HD465-7 (~55 t, mechanical drive) — not a 930E (290 t, AC electric drive with GDY106). Visible to any mining reviewer.
- F2 (design, high): pit is flat colored rectangles; no benches, ramp grade, berms, shovel, crusher; one truck; tiny scale.
- F3 (design, high): bench GDY106 is primitive boxes/cylinders; oil rendered as a green slab (85W-140 is amber/brown); no planetary stages, no tire/rim context; no section caps.
- F4 (physics, high): pipeline anchor 28 kPa @ 95 L implies a 3.2 m oil column (already flagged GAP in `sim/physics.py`, never resolved). Realistic head is decimetres → ~2–5 kPa. Level→pressure is nonlinear (circular-segment pool), not linear `KPA_PER_L`.
- F5 (scope gap vs pre-proposal §4.1/§4.2/§8.2): no fleet view / per-wheel traffic light; no temp/vib/current series; no combined-risk rule; no signed measurements.
- F6 (quality): zero automated tests; TDD disabled; no CI.
- F7 (UX): dev labels in product UI ("Bench (S1/T2)", "Stub (S0)" tab), walls of text inside the viewport panels.

## Scope

### In-scope

- T1 research pack (manual + web, sourced) → `docs/research/twin-reference.md`.
- T2 test runners + physics core (geometry, hydrostatics, gear train) in Python and a TS mirror; replace the 28 kPa anchor through `sim/generate.py` and `ai/level.py`; regression tests.
- T3 rendering foundation + app shell (tone mapping, environment light, shadows, procedural textures, clean navigation, i18n kept).
- T4 parametric 930E-4SE model (articulated body hoist 45°, steering, wheel spin from ratio, strut compression with payload).
- T5 open-pit mine + fleet + PLM-III-aligned FSM + slope-aware rest gating.
- T6 GDY106 cutaway twin (section caps, planetary animation, oil pool from h(V), slosh/settling, sensors at items 56/41/39/cable, exploded view, truck→wheel link).
- T7 fleet dashboard + wheel detail + combined-risk rule.
- T8 signed measurements (HMAC-SHA256 per device) at edge mock + backend verification.
- T9 docs/thesis annex update, CI workflow file, screenshots, demo script.

### Non-scope

- No push / PR / deploy / remote ops (user decision).
- No new frontend dependencies without explicit confirmation (use Three.js built-ins + `bun test`).
- No hardware; no claim of field accuracy; gear tooth counts and cavity dimensions not published by GE are labeled ASSUMPTION.
- No CAD-exact GE geometry (proprietary); parametric reconstruction from Fig. 95 proportions and manual dimensions.

## Constraints

- Stack: Astro 7 + Preact 10 islands + Three.js 0.169 + FastAPI + InfluxDB + MQTT + Docker.
- Physics anchors from manuals (VERIFIED): 930E-4SE 15.29 × 8.89 × 8.10 m, body-up 14.80 m, tires 53/80R63, body 211 m³ heaped / interior width 8.15 m / depth 3.2 m / loading height 7.06 m / dump angle 45°, turning circle 30.4 m, max speed 64.5 km/h, GDY106 32.62:1, 94–95 L SAE 85W-140 per wheel, rotor ≤ 3000 RPM.
- Every non-manual number is labeled VERIFIED / DERIVED / ASSUMPTION in `docs/thesis-annex.md`.
- Honest labeling stays: SYNTHETIC-PROXY until bench data exists.
- Performance: truck/pit scene ≥ 30 fps on a typical laptop (instancing, merged geometry, shadow map ≤ 2048).
- Size heuristic ~400 authored lines/task is advisory only (not a cap).

## Tasks

- [x] T1 — Research pack (route: delegated research, read-only; trigger: broad external research + 3 manuals).
- [x] T2 — Test runners + physics core + anchor replacement (route: delegated writer; trigger: 2+ non-trivial files across sim/ai/frontend).
- [x] T3 — Rendering foundation + app shell (route: delegated writer; trigger: 2+ non-trivial frontend files).
- [x] T4 — Parametric 930E-4SE model (route: delegated writer; trigger: new large 3D module).
- [x] T5 — Open-pit mine + fleet + PLM-III FSM (route: delegated writer; trigger: new 3D env + FSM across files).
- [x] T6 — GDY106 cutaway twin (route: delegated writer; trigger: new large 3D module + physics coupling).
- [x] T7 — Fleet dashboard + combined risk (route: delegated writer; trigger: dashboard + ai ladder files).
- [ ] T8 — Signed measurements (route: delegated writer; trigger: sim + backend + tests).
- [ ] T9 — Docs, CI, screenshots of `/mine`, `/wheel`, and `/monitoring`, demo script (CI uses `oven-sh/setup-bun`, frozen Bun install, frontend tests/build, and pytest; route: delegated writer; trigger: many doc files).
- [x] T10 — Rotating-sensor physics: three regimes (static pool / slosh / centrifugal rimming), per-revolution submerged-fraction feature, research cavity geometry (route: delegated writer; trigger: sim + ai + TS mirror + tests). Added 2026-10-09 after T1 finding: drain plug 56, magnetic plugs 41 and sun cover 39 are on the rotating output (LS carrier 25 → torque tube 29 → hub 14); pre-proposal claim "fixed points, no moving parts" is contradicted.

## Acceptance criteria

1. `pytest` and `bun test` pass locally; commands recorded with observed output.
2. `bun run build` (frontend/, `astro check && astro build`) passes.
3. Truck scene shows a recognizable 930E (front stairs, upper deck, cab left, canopy, dual rear tires 53/80R63, hoist cylinders) at manual scale, inside a benched pit with a graded ramp, shovel and crusher; ≥ 3 trucks cycle.
4. Bench scene shows a GDY106 section with two planetary stages animating at 32.62:1 overall, amber oil pool whose depth comes from the shared h(V) function, sensors at items 56/41/39 and the traction cable.
5. Pipeline pressure at 95 L equals ρ·g·h(95 L) from the shared geometry (no 28 kPa anchor); N1–N4 + RUL demo still walks end-to-end.
6. Dashboard: from the `/monitoring` fleet grid, wheel detail is reachable in ≤ 2 clicks via in-island state or navigation to `/wheel?...` with query state; temp/vib/current series; combined-risk alert rule tested. The Dashboard Preact island owns monitoring; shared navigation is in `BaseLayout.astro`, and language changes synchronize through the `oilguard:lang` event.
7. Backend rejects tampered/unsigned rows when signing is enforced; tests prove it.
8. Screenshots in `docs/screenshots/` re-captured from the running `/mine`, `/wheel`, and `/monitoring` pages.
9. CI uses `oven-sh/setup-bun`, `bun install --frozen-lockfile`, `bun test src`, `bun run build`, and pytest.

## Applicable checks

- `pytest -q` (repo root), `bun test src` (frontend/), `bun run build` (frontend/; includes `astro check` and `astro build`), `docker compose config --quiet`, and headless Chrome screenshots of `/mine`, `/wheel`, and `/monitoring`.

## Progress / Evidence

| Task | Commit | Route | Evidence |
|------|--------|-------|----------|
| T1 | `65c30a4` | delegated research (read-only) | `docs/research/twin-reference.md` (354 lines; VERIFIED/DERIVED/ASSUMPTION tags). Key: brochure AESS778-02 dims 15.60×8.69×7.37 m, wheelbase 6.35 m, front track 6.15 m, rear track 5.36 m, dual spacing ~1.66 m, turning circle 29.7 m (OM 30.4 m is a conversion error), 53/80R63 OD ~3.75–3.84 m; LS stage 4 planets; cavity ASSUMPTION R_o 0.50 / R_i 0.15 / L 0.70 / free 0.8 → head 0.268 m, ~2.3 kPa, 17.7 Pa/L; rotating output ⇒ rimming above ~26 km/h; PLM III 8 states; no verifiable CC0/CC-BY 930E glTF ⇒ procedural model. |
| T2 | `c4a9ba6` `58ba2e1` `2b9603d` | delegated (writer trigger: sim/ai/frontend multi-file) | `./test.sh` → pytest 61 passed, bun 16 pass (parent re-ran bun: 16 pass); `tsc --noEmit` exit 0; `ai/demo_leak.py --seconds 120` N1→N2→N3→N4 PASS; `ai/run_demo.py` T9 PASS (clean 1/228 FP unchanged); compose OK. GearCase ASSUMPTION R_OUT 0.60 / R_IN 0.22 / L 0.42 m → head 0.305 m, 2.61 kPa @95 L 60 °C, 0–10 kPa ±0.1 %FS → ±0.51 L. Shared-ring train Zr 92: HS 16/38×3 (6.750), LS 24/34×4 (4.833), 32.625 (+0.015 %). Thresholds re-derived (sigma floor 0.005 kPa, beta clip ±0.05 kPa/°C, noise 0.01/0.04 kPa). RDD: assess high (test.sh shell/exec) → review due; consent pending with user. |
| T3 | `af17ba4` `2c5405e` | delegated (writer trigger: 2+ frontend files) | `./test.sh` → pytest 61, bun 49 pass; `tsc` clean; `vite build` OK (JS 741 kB, GLB out of dist); CDP tab-switch ×37 no context leak; screenshots `docs/screenshots/t3-shell-*.png` (parent viewed mine + wheel: shell OK, scenes still placeholder → T4–T6). GLB moved to `docs/reference-models/`. Note: :5173 is held by an OrbStack container serving a stale build — use another port for dev screenshots. |
| T4 | `ce980d1` `3f4deda` | delegated (writer died at API session limit after writing all files; parent verified + committed) | parent: `npx tsc --noEmit` clean; `bun test src` 87 pass / 0 fail; pre-commit gate ran `./test.sh` green on both commits. Screenshots viewed (3/4, side, wheel, dump at t=22): recognizable 930E — stairway, deck, cab, canopy, dual rears 53/80R63, GDY106 hub, hoist cylinders telescoping at 45°. Weak: pixelated "930E" plate, flat ground ring dominates. RDD: medium, slice_budget_reached → user DECLINED this candidate. Docker :5173 now serves live source (other session's bind-mount fix, uncommitted, not ours); headless Chrome needs `--timeout` (virtual-time-budget hangs with live.js). |
| T5 | `59f97ee` `9a886e7` `4f85c56` | delegated writer (mine environment, fleet/FSM integration, and review corrections) | RED: `readMineUrl("?seed=0")` returned default seed `1`; fixed numeric parsing to preserve explicit zero. T5 polish RED: dust test failed while `dustParticles` helper was absent; pure terrain/build-pit/dust tests now cover ramp/bench heights, deterministic seeding, clamps, and particle lifecycle. Replaced inline dock restart label with localized PLM-III state wording. The black line was traced to berm stations being joined across a skipped path interval (not a shadow); the final fix preserves visible safety berms and prevents triangles from bridging that gap. GREEN: final `bun test src` → 147 pass / 0 fail; `bun run build` → Astro check/build passed (0 errors; 4 existing hints and large-chunk warning). Original screenshot `/tmp/og-shots/t5-mine.png` shows the line; final `/tmp/og-shots/t5-mine-fixed.png` was captured and inspected on live `:5173`, with berms visible and the line gone. Current `curl http://localhost:5173/mine` confirmed the Docker server returns the TruckView island; the earlier stale-server assumption was incorrect for this session. `pytest -q` was not needed for the frontend-only T5 fixes. RDD unavailable: assess returned high/unassessable due to untracked inventory; STATUS requested `external.select_intended_untracked`, for which this runtime had no capture operation. Stopped before START; old lineage untouched. |
| T10 | `b966ec9` `55d4597` | delegated writer (Python simulation/AI, TS mirror, tests) | RED: Python tests failed collection while the research-cavity constant was absent; Bun failed while `rotatingSensorRegime` was absent. Integration RED: two Python tests failed because generated regime/fraction fields were absent. GREEN: focused hydrostatics 4 passed; focused generator/AI tests 2 passed; TS signal-schema tests 6 passed. The model adds static-pool/slosh/rimming regimes, an assumed research cavity (0.50/0.15/0.70 m), per-revolution wet fraction, generated signal metadata, and AI propagation while moving samples remain gated and static rest scoring is unchanged. CSV schema and TS signal types were synchronized. Assumptions are explicitly synthetic and not calibrated sensor dynamics. Final T10 checks: `pytest -q` → 67 passed, 3 deprecation warnings; `bun test src` → 145 pass / 0 fail; `bun run build` → 0 errors, 4 hints, 4 routes built (existing large-chunk warning). Parent re-ran `pytest -q`: 67 passed, 0 failed, 3 deprecation warnings. RDD unavailable: assess returned high/unassessable (`review_due=true`, `high_risk`) because untracked inventory changed; STATUS again returned `collect/intended_untracked_selection_required` with `external.select_intended_untracked`, unavailable in this runtime. Stopped before START; old lineage untouched. |
| T6 | `33805fb` `b245f9e` `12ed8b6` | delegated writer (GDY106 section twin + truck-to-wheel handoff; trigger: new 3D assembly and physics coupling across scene, route state, and mine navigation) | TDD RED: new `wheelUrl.test.ts` exposed missing-query `Number(null) === 0` incorrectly overriding the 66.5 L demo default; GREEN fixed null handling. Added query-restored sensor/fill/mode/cutaway/exploded state, a `/mine` → `/wheel?...` handoff, pressure-derived oil-pool segment from shared `headFromVolume`, two animated planetary sets driven by `stageSpeeds` (6.75:1 × 4.83:1 = 32.63:1), and bilingual exploded/cutaway controls; existing markers identify items 56/41/39/36 and traction cable. `pytest -q` → 67 passed, 3 existing deprecation warnings. `frontend/ bun test src` → 150 passed, 0 failed. `frontend/ bun run build` → Astro check/build passed, 0 errors, 4 existing hints and existing chunk-size warning. Headless Chrome (`--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1600,1000 --timeout=12000`) screenshots captured and inspected: `/tmp/og-shots/t6-wheel-en.png`, `/tmp/og-shots/t6-wheel-es.png`. Impeccable detector → `[]`. RDD: medium; `review_due=false` (`under_budget`) at 184 changed lines from last reviewed boundary `976f277`; no START/review required. Prior approved/acknowledged review boundaries: `efdaa1d..4f85c56` (lineage `review-990d0aa803acbb3d`) and `4f85c56..976f277` (lineage `review-c40289db1053c19b`). Advisory follow-ups intentionally left out of scope: R3-001 `TruckScene.tsx:54` omits `cam=free`; R3-002 `mineWorld.ts:29` maps a missing/blank seed to zero rather than default one; tail review notes the `PRODUCT.md:44` stationary-service-point claim conflicts with task evidence that items 56/41/39 rotate. |
| T7 | `b9f05fa` `d9df9ec` `f0e1747` | delegated writer (risk/query pure logic, bilingual dashboard/theme, backend-note localization) | RED: focused Bun tests first failed because `fleetRisk` and `buildWheelDetailHref` were absent; backend-note test RED later failed because `backendNotes` was absent. GREEN: focused risk/query tests 9/9 and backend-note tests 2/2. `/monitoring` shows 12 explicitly synthetic/demo wheel rows with four-sample temperature, vibration, and current series; the pure rule flags only when ≥2 assumed channels cross oil ≤47.5 L, temperature ≥90 °C, vibration ≥7 mm/s. Current is displayed but is not a trigger. This demo rule is separate from calibrated backend N1–N4 leak analysis; no live per-wheel feed or calibrated accuracy is claimed. One-click detail links preserve `truck` and `wheel` query state to `/wheel`, where the selected fleet identity is shown; dashboard colors use semantic `theme.css` tokens and all added copy is bilingual. The frontend maps only the three known backend-owned no-data notes/source strings through i18n; unknown backend text remains verbatim, and backend/Python code is untouched. Final `bun test src` → 160 pass / 0 fail; `bun run build` → Astro check/build passed, 0 errors, 4 existing hints and existing chunk-size warning. Headless screenshots inspected: `/tmp/og-shots/t7-monitoring-en.png` (12 rows, 12 detail links, 2 demo alerts), refreshed `/tmp/og-shots/t7-monitoring-es.png` (backend alert/fallback/source notes translated; the three English source strings absent), and `/tmp/og-shots/t7-wheel-es.png` (selected OG-03 · RH). Impeccable detector ran once on changed UI targets → `[]`; not rerun for the copy correction. Parent final checks after the copy fix: `bun test src` → 160 pass / 0 fail; `bun run build` → Astro check/build passed with 0 errors and 4 hints (existing chunk-size warning); `pytest -q` → 67 passed, 3 existing deprecation warnings. Parent inspected all three screenshots after the final ES copy fix. Initial code-range assessment `6ef66d4..d9df9ec`: medium, 10 paths/396 authored lines, `review_due=false` (`under_budget`). T7 range `6ef66d4..4f3a5ac` was approved and acknowledged by lineage `review-3ef7b5e0c470a53b` (one reliability reviewer, no findings). Correction `f0e1747` assessment from `4f3a5ac`: medium, 4 paths/51 lines, `review_due=false` (`under_budget`); no new review transaction. |

### Advisory findings closed after T6

- Lineage `review-990d0aa803acbb3d`, R3-001: mine URL accepted `cam=free` but scene preset normalization rejected it; fixed by `a3ce796`.
- Lineage `review-990d0aa803acbb3d`, R3-002: absent/blank seed defaulted to zero while explicit zero must remain valid; fixed by `3ae19fa`.
- Lineage `review-c40289db1053c19b`, PRODUCT R3-001: the stationary service-point claim contradicted T10 evidence for rotating items 56/41/39; corrected by `ca6839e`.
- Spanish UI copy/test audit follow-up: restored requested Spanish orthography and added the accent regression test in `6ef66d4`; localized backend-provided dashboard alert/fallback/source notes in `f0e1747`.

Housekeeping: `f4aa44c` ignore `.playwright-mcp/` `.atl/`; stale unreferenced screenshots moved to `/tmp/oilguard-old-screens` (not deleted).

Screenshot procedure (all visual tasks): headless Chrome

`--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1600,1000 --timeout=12000 (virtual-time-budget hangs since live.js; run in background, one instance at a time) --screenshot=<png> <url>`

against the Astro dev server on :5173, using `/mine`, `/wheel`, and `/monitoring` URLs.

RDD outcomes: T2 slice c4a9ba6 declined; T2+T3 range lens_context_budget_exceeded; T4 declined. T5 correction and T10 commits were initially assessed, but STATUS stalled on unavailable `external.select_intended_untracked` collection; no START occurred, and the old lineage remained untouched. After housekeeping, the original T5/T10 range `efdaa1d..976f277` first stopped with `lens_context_budget_exceeded` before authority (`mutation_outcome:not_started`), then was reviewed in two smaller candidates: `efdaa1d..4f85c56` approved and acknowledged (`review-990d0aa803acbb3d`; advisory findings R3-001 and R3-002), and `4f85c56..976f277` approved and acknowledged (`review-c40289db1053c19b`; advisory finding R3-001 in `PRODUCT.md:44`). T6 was medium/under-budget from `976f277`. The T7 range `6ef66d4..4f3a5ac` was approved and acknowledged (`review-3ef7b5e0c470a53b`); later T7 correction/docs commits remain assessed medium/under-budget from the current `4f3a5ac` boundary. The next work must assess against `4f3a5ac` and follow the returned transition if due.

## Next step

T5 polish, T10 rotating-sensor physics, T6 GDY106 cutaway twin, and T7 fleet dashboard + combined risk are complete; next T8 (signed measurements) → T9. Continue assessing committed work against `4f3a5ac`; the T7 correction/docs slice remains under the medium review budget.
