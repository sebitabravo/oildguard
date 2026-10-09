# ODD Feature Document — oilguard-pro-twin

## Metadata

- **Project:** oilguard
- **Feature:** oilguard-pro-twin (thesis-grade digital twin upgrade)
- **Branch:** `feature/oilguard-sim` (continues; previous feature `oilguard-mining-sim` closed)
- **Status:** in progress
- **Delivery strategy:** `exception-ok` — user explicitly authorized unlimited changes ("realiza todos los cambios que quieras", goal mode, no pause). No PR is created in this feature; slicing into PRs is decided by the user at push time.
- **Mirror:** Engram topic `odd/oilguard-pro-twin/tasks`
- **TDD:** `on` from T2 onward — source: project rule (`rules/common/testing.md`: all production code carries tests; runner must be configured before code). Runners: `pytest` (Python: `sim/`, `ai/`, `backend/`) and `bun test` (frontend pure logic, zero new npm deps). Recorded here; T2 configures both.
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
- No new npm dependencies without explicit confirmation (use three.js built-ins + `bun test`).
- No hardware; no claim of field accuracy; gear tooth counts and cavity dimensions not published by GE are labeled ASSUMPTION.
- No CAD-exact GE geometry (proprietary); parametric reconstruction from Fig. 95 proportions and manual dimensions.

## Constraints

- Stack unchanged: React + Vite + Three.js 0.169 + FastAPI + InfluxDB + MQTT + Docker.
- Physics anchors from manuals (VERIFIED): 930E-4SE 15.29 × 8.89 × 8.10 m, body-up 14.80 m, tires 53/80R63, body 211 m³ heaped / interior width 8.15 m / depth 3.2 m / loading height 7.06 m / dump angle 45°, turning circle 30.4 m, max speed 64.5 km/h, GDY106 32.62:1, 94–95 L SAE 85W-140 per wheel, rotor ≤ 3000 RPM.
- Every non-manual number is labeled VERIFIED / DERIVED / ASSUMPTION in `docs/thesis-annex.md`.
- Honest labeling stays: SYNTHETIC-PROXY until bench data exists.
- Performance: truck/pit scene ≥ 30 fps on a typical laptop (instancing, merged geometry, shadow map ≤ 2048).
- Size heuristic ~400 authored lines/task is advisory only (not a cap).

## Tasks

- [x] T1 — Research pack (route: delegated research, read-only; trigger: broad external research + 3 manuals).
- [x] T2 — Test runners + physics core + anchor replacement (route: delegated writer; trigger: 2+ non-trivial files across sim/ai/frontend).
- [x] T3 — Rendering foundation + app shell (route: delegated writer; trigger: 2+ non-trivial frontend files).
- [ ] T4 — Parametric 930E-4SE model (route: delegated writer; trigger: new large 3D module).
- [ ] T5 — Open-pit mine + fleet + PLM-III FSM (route: delegated writer; trigger: new 3D env + FSM across files).
- [ ] T6 — GDY106 cutaway twin (route: delegated writer; trigger: new large 3D module + physics coupling).
- [ ] T7 — Fleet dashboard + combined risk (route: delegated writer; trigger: dashboard + ai ladder files).
- [ ] T8 — Signed measurements (route: delegated writer; trigger: sim + backend + tests).
- [ ] T9 — Docs, CI, screenshots, demo script (route: delegated writer; trigger: many doc files).
- [ ] T10 — Rotating-sensor physics: three regimes (static pool / slosh / centrifugal rimming), per-revolution submerged-fraction feature, research cavity geometry (route: delegated writer; trigger: sim + ai + TS mirror + tests). Added 2026-10-09 after T1 finding: drain plug 56, magnetic plugs 41 and sun cover 39 are on the rotating output (LS carrier 25 → torque tube 29 → hub 14); pre-proposal claim "fixed points, no moving parts" is contradicted.

## Acceptance criteria

1. `pytest` and `bun test` pass locally; commands recorded with observed output.
2. `npx tsc --noEmit -p tsconfig.json` (frontend/) and `npx vite build` pass.
3. Truck scene shows a recognizable 930E (front stairs, upper deck, cab left, canopy, dual rear tires 53/80R63, hoist cylinders) at manual scale, inside a benched pit with a graded ramp, shovel and crusher; ≥ 3 trucks cycle.
4. Bench scene shows a GDY106 section with two planetary stages animating at 32.62:1 overall, amber oil pool whose depth comes from the shared h(V) function, sensors at items 56/41/39 and the traction cable.
5. Pipeline pressure at 95 L equals ρ·g·h(95 L) from the shared geometry (no 28 kPa anchor); N1–N4 + RUL demo still walks end-to-end.
6. Dashboard: fleet grid with per-wheel traffic light → wheel detail in ≤ 2 clicks; temp/vib/current series; combined-risk alert rule tested.
7. Backend rejects tampered/unsigned rows when signing is enforced; tests prove it.
8. Screenshots in `docs/screenshots/` re-captured from the running app.

## Applicable checks

- `pytest -q` (repo root), `bun test` (frontend/), `npx tsc --noEmit -p tsconfig.json`, `npx vite build` (frontend/), `docker compose config --quiet`, headless Chrome screenshots of each tab.

## Progress / Evidence

| Task | Commit | Route | Evidence |
|------|--------|-------|----------|
| T2 | `c4a9ba6` `58ba2e1` `2b9603d` | delegated (writer trigger: sim/ai/frontend multi-file) | `./test.sh` → pytest 61 passed, bun 16 pass (parent re-ran bun: 16 pass); `tsc --noEmit` exit 0; `ai/demo_leak.py --seconds 120` N1→N2→N3→N4 PASS; `ai/run_demo.py` T9 PASS (clean 1/228 FP unchanged); compose OK. GearCase ASSUMPTION R_OUT 0.60 / R_IN 0.22 / L 0.42 m → head 0.305 m, 2.61 kPa @95 L 60 °C, 0–10 kPa ±0.1 %FS → ±0.51 L. Shared-ring train Zr 92: HS 16/38×3 (6.750), LS 24/34×4 (4.833), 32.625 (+0.015 %). Thresholds re-derived (sigma floor 0.005 kPa, beta clip ±0.05 kPa/°C, noise 0.01/0.04 kPa). RDD: assess high (test.sh shell/exec) → review due; consent pending with user. |

Housekeeping: `f4aa44c` ignore `.playwright-mcp/` `.atl/`; stale unreferenced screenshots moved to `/tmp/oilguard-old-screens` (not deleted).

Screenshot procedure (all visual tasks): headless Chrome
`--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1600,1000 --virtual-time-budget=8000 --screenshot=<png> <url>`
against the Vite dev server on :5173.

| T1 | (docs commit below) | delegated research (read-only) | `docs/research/twin-reference.md` (354 lines; VERIFIED/DERIVED/ASSUMPTION tags). Key: brochure AESS778-02 dims 15.60×8.69×7.37 m, wheelbase 6.35 m, front track 6.15 m, rear track 5.36 m, dual spacing ~1.66 m, turning circle 29.7 m (OM 30.4 m is a conversion error), 53/80R63 OD ~3.75–3.84 m; LS stage 4 planets; cavity ASSUMPTION R_o 0.50 / R_i 0.15 / L 0.70 / free 0.8 → head 0.268 m, ~2.3 kPa, 17.7 Pa/L; rotating output ⇒ rimming above ~26 km/h; PLM III 8 states; no verifiable CC0/CC-BY 930E glTF ⇒ procedural model. |
| T3 | `af17ba4` `2c5405e` | delegated (writer trigger: 2+ frontend files) | `./test.sh` → pytest 61, bun 49 pass; `tsc` clean; `vite build` OK (JS 741 kB, GLB out of dist); CDP tab-switch ×37 no context leak; screenshots `docs/screenshots/t3-shell-*.png` (parent viewed mine + wheel: shell OK, scenes still placeholder → T4–T6). GLB moved to `docs/reference-models/`. Note: :5173 is held by an OrbStack container serving a stale build — use another port for dev screenshots. |

## Next step

RDD review for T2+T3 range; then T4 (930E) → T5 (pit + fleet) → T10 (rotating physics) → T6 (GDY106) → T7 → T8 → T9.
