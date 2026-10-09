# ODD Feature Document — oilguard-mining-sim

## Metadata

- **Project:** oilguard
- **Feature:** oilguard-mining-sim (OilGuard Mining — Hack the Challenge 2026)
- **Branch:** `feature/oilguard-sim`
- **Status:** done (S0–S7 complete, T1–T13 landed; closeout commit `c836741` — final amended id, see `git log`)
- **Delivery strategy:** `ask-on-risk` (default)
- **Mirror:** pending (Engram tool unavailable, local file is source of truth)
- **Skill resolution:** `none` (no skill registry found in empty repo; only unrelated opencode-config skill. Proceed without project-specific standards.)
- **Bootstrap commit:** `f5edeb1f2ee7d7189d387f1a4197bacb50d010b4` (work-unit: `chore(odd): bootstrap oilguard-mining-sim feature doc`; final id after id-record amend — see `git log` as source of truth)
- **Authoring language:** English (technical artifact contract)
- **Created:** 2026-10-09

## Objective

Build a professional, demonstrable OilGuard Mining prototype slice for Komatsu 930E/980E motorized wheels (GDY106):

1. Two interactive 3D simulators (web profesional):
   - (A) Bench / test-rig + GDY106 wheel internals (oil volume, settling transient, sensor points).
   - (B) 930E truck in open-pit haul cycle (load / haul / dump / wait, moving vs rest modes).
2. A continuous oil-level estimation story via IoT signal fusion (pressure + temp + vibration + operational vars), recalibrated during natural haul-cycle pauses, with auditable alerts and RUL.
3. A backend + dashboard slice (FastAPI + InfluxDB + MQTT mock + Docker + Git) sufficient to run a convincing pro demo and to evaluate bench feasibility.

Success = a reviewer can run the stack locally, drive both 3D sims, see fused level + confidence + N1–N4 alerts + RUL, and read a calibration/feasibility report that honestly answers "was the idea winnable?".

## Problem

- There is no continuous oil-level device for Komatsu 930E/980E motorized wheels (GDY106 final drives).
- Inspections every 250 h leave a blind spot; between inspections, slow leaks / degradation go unseen.
- Consequence: catastrophic traction-motor failures, unplanned downtime, high cost, safety risk.
- Existing practice relies on periodic manual checks (drain plug / magnetic plug inspection), not trendable data.

## Why (Value Proposition)

- Continuous estimation closes the 250 h blind spot without drilling the housing (no-drill mount points only).
- Recalibration during natural pauses (loading / dumping / waiting, truck stopped + leveled + engine on) exploits already-existing stillness — no operational change required.
- Settling-transient shape doubles as a viscosity proxy, adding diagnostic value beyond level.
- Laddered, auditable alerts (N1–N4) + RUL in hours / haul-cycles / shifts give maintenance a plannable signal instead of a binary alarm.
- Honest bench calibration (drain-and-weigh) decides whether fusion-with-confidence is real or must pivot to anomaly-only + precise rest readings.

## Scope

### In-scope

- S0: Repo bootstrap — React + Vite + Three.js + FastAPI + InfluxDB + MQTT + Docker + Git scaffolding, `.gitignore`, compose, README run instructions.
- S1: 3D bench/wheel sim (A) — test-rig geometry, GDY106 internals (simplified sun/pinion/rotor Volumes), oil-volume visualization, sensor markers, settling-transient animation.
- S2: 3D truck/faena sim (B) — simplified 930E truck, open-pit segment (load / haul / dump / wait zones), haul-cycle state machine, moving vs rest mode coloring, camera presets.
- S3: Signal fusion core — synthetic generator (10 Hz pressure/temp, 1 kHz vibration decimated on edge, operational vars), accelerometer-rule move/rest detector (no ML), settling-transient extractor / viscosity proxy.
- S4: Backend slice — Python + FastAPI ingestion/query API, MQTT/TLS prototype path (mocked broker for local demo; LoRaWAN noted as future), store-and-forward narrative (ESP32-S3 edge + Raspberry Pi gateway + InfluxDB), Docker Compose.
- S5: AI slice — statistical-baseline or Isolation Forest anomaly, level regression (only after bench correlation proof), trend-extrapolated RUL with confidence, N1 trend / N2 confirmed leak (2-of-3 channels) / N3 shift-window / N4 critical loss logic.
- S6: Dashboard/UX — pro demo dashboard (React; Grafana noted as reference/alternative), level + confidence band, alerts timeline, RUL panel, sim-linked mode indicator, demo script.
- S7: Validation/calibration — bench drain-and-weigh procedure, precision/recall-style feasibility report answering "was idea winnable?", pivot decision record (fusion vs anomaly-only).

### Non-scope (explicitly out)

- No physical hardware build (no ESP32-S3 firmware flashing, no Pi field deployment, no drilling or T-adapter installation on a real wheel).
- No real LoRaWAN network integration (documented as future path only; MQTT/TLS prototype suffices).
- No production hardening: authN/Z, multi-tenant, HA InfluxDB, OTA, cert rotation, pit-wide fleet management.
- No ML-based mode detection (rules only by decision); no black-box alerting (all alerts auditable).
- No simulator photorealism / CAD-exact GDY106 geometry; simplified but physically-plausible proportions are enough.
- No remote ops in this bootstrap: no push, no PR, no deploy. Stay local.

## Constraints

- **Stack (DECIDED, non-negotiable):** React + Vite + Three.js + FastAPI + InfluxDB + MQTT + Docker + Git. Web Profesional framing.
- **Two 3D sims required:** (A) bench/test-rig + wheel internals; (B) 930E in open-pit haul cycle. Both web-embedded.
- **Physics anchors (do not contradict without evidence):**
  - Oil: 95 L SAE 85W-140 per wheel motor.
  - Rotor up to 3000 RPM; wheel ~92 RPM via 32.62:1 reduction.
  - Sampling: 10 Hz pressure/temp + 1 kHz vibration on edge (ESP32-S3 class), decimated/features forwarded.
  - Mode detect via accelerometer rules (no ML).
  - Store-and-forward: edge ESP32-S3 → gateway Raspberry Pi + InfluxDB → backend Python + FastAPI → dashboard (Grafana reference).
  - Recalibration only when: truck stopped + leveled + engine on (loading/dumping/waiting windows).
  - Alert thresholds: warning < 50%, critical < 30%, plus abrupt pressure-drop trigger.
  - Mount points (no drilling): pressure at drain plug via T-adapter; temp thermocouple K at magnetic plug; vibration triaxial MEMS on sun-pinion cover with epoxy; Hall current clamp. Environment 120 °C, EMI shielding required (document, not built).
- **AI constraints:** statistical baseline or Isolation Forest for anomaly; regression for level only once bench proves correlation; trend extrapolation for RUL; RUL emitted only on valid lubrication condition, otherwise fallback to anomaly detection if precision insufficient. All alerts auditable (threshold + inputs + window logged).
- **TDD:** disabled / unknown (no test runner detected in empty repo). No invented test command. Use ordinary functional checks (file exists, readable, `docker compose config`, `vite build`-level smoke only when tooling exists).
- **Size heuristic (advisory only):** ~400 authored changed lines per ODD task as planning heuristic (adds + deletes, generated files excluded); prefer smallest coherent behavior with checks + docs. NOT a cap, acceptance criterion, stop condition, forced split, or RDD trigger. If a correct solution exceeds it, briefly explain why and continue without size-only rework. Never delete spaces/comments, omit checks, minify, or split artificially. Budget reads accumulated branch diff, not per-task in isolation.

## Key Assumption Under Test (must be recorded and resolved in S7)

> **Level-from-pressure-fusion with confidence band is UNPROVEN until bench drain-and-weigh calibration.**
>
> **Outcome (S7 closeout, recorded): PARTIAL.** Rest-gating → residual →
> level → RUL → N1–N4 logic proven on synthetic-proxy data with labeled
> accelerated rates (T7/T9/T10); field accuracy (0.5 %/h rate, 28 kPa at
> 95 L anchor, bench correlation) PENDING — no physical bench ran. Pivot
> ADOPTED and implemented: anomaly-only + precise rest readings now, fusion
> promoted only on bench RMSE (`docs/calibration.md` verdict, `docs/feasibility.md`).

- Bench must demonstrate repeatable correlation between fused signal (pressure + temp + vibration + operational vars, rest-window gated) and weighed oil volume, with quantified error/confidence.
- **Consequence if false:** pivot to anomaly-only (trend/deviation alarming) + precise rest-window readings. Record pivot explicitly in feasibility report; do not silently keep fusion claims.

## Delivery Strategy

- **Strategy:** `ask-on-risk` (default).
- Autonomous within authorized scope while risk is low and checks pass.
- Ask the user before: changing stack, drilling/physical-hardware commitments, expanding scope beyond sim + backend slice + dashboard, pushing/PR/remote ops, or weakening auditability.
- Each task lands as a reviewable work-unit commit on `feature/oilguard-sim`; evidence = commit id recorded in task row.

## Forecast (lines, authored heuristic)

Running count starts at 0. Generated files (node_modules, dist, lockfiles, .git) excluded. Numbers are planning forecasts, not caps.

| Task | Slice | Forecast (authored Δ) | Running total |
|------|-------|----------------------|---------------|
| T1 | S0 bootstrap scaffolding | 350 | 350 |
| T2 | S1 bench rig scene | 400 | 750 |
| T3 | S1 wheel internals + oil/settling | 450 | 1200 |
| T4 | S2 truck + pit + cycle FSM | 450 | 1650 |
| T5 | S2 modes/camera/UX polish | 300 | 1950 |
| T6 | S3 synthetic signals + store-forward mock | 400 | 2350 |
| T7 | S3 move/rest + settling/viscosity | 350 | 2700 |
| T8 | S4 FastAPI + MQTT mock + InfluxDB/Docker | 400 | 3100 |
| T9 | S5 anomaly (baseline/IF) | 350 | 3450 |
| T10 | S5 regression + RUL + N1–N4 | 400 | 3850 |
| T11 | S6 dashboard + demo scenario | 400 | 4250 |
| T12 | S7 calibration procedure + feasibility report | 300 | 4550 |
| T13 | S7 demo script + closeout + docs | 200 | 4750 |
| **Total forecast** | — | **~4750 authored lines** | — |

If any task correctly exceeds ~400, keep a one-line why in its evidence note and continue.

## TDD Block

```yaml
tdd:
  mode: disabled
  source: none-detected
  runner: TBD
  note: Empty repo at bootstrap; no test runner detected. Do NOT invent a test command. Do NOT invoke sdd-init.
  checks_used_instead:
    - file exists + readable
    - markdown/JSON/YAML well-formed (visual inspection)
    - docker compose config validates (once compose exists)
    - vite build / tsc smoke (once frontend exists; record actual command then)
    - fastapi import / openapi smoke (once backend exists; record actual command then)
```

## Authorized Scope (for this bootstrap + downstream)

- **This bootstrap (writer agent):** create ONLY this ODD feature document + `git init` + first commit on `feature/oilguard-sim`. Do NOT implement simulators yet. Do NOT push, PR, or remote ops. Stay local.
- **Downstream implementation (later agents/slices):** S0–S7 tasks below, on the same feature branch, local commits only unless user explicitly authorizes remote ops.
- **Never without explicit authorization:** push, PR creation, deploy, hardware procurement/installation, stack change, scope expansion beyond this doc.

## Global Acceptance Criteria (feature-level)

1. `odd/tasks/oilguard-mining-sim.md` exists, is readable, and contains all sections required by the bootstrap task.
2. Branch `feature/oilguard-sim` exists; bootstrap work-unit commit `chore(odd): bootstrap oilguard-mining-sim feature doc` present with ONLY doc + `.gitignore`.
3. Both 3D sims (A bench/wheel, B truck/faena) run from the documented local command and show the required behaviors (oil/settling/sensors; load/haul/dump/wait + moving/rest).
4. Backend slice ingests mocked MQTT, persists to InfluxDB (or documented substitute), serves FastAPI queries used by the dashboard.
5. N1–N4 ladder + RUL (hours/haul-cycles/shifts + confidence, lubrication-gated) demonstrable on synthetic leak scenario with auditable alert records.
6. S7 feasibility report answers fusion-vs-pivot with bench evidence (or synthetic-proxy evidence clearly labeled if no physical bench available) and records the assumption outcome.
7. No invented test commands; no remote ops without authorization; size-heuristic overruns explained, not hidden.

## Applicable Checks (per task; use what exists at that time)

- `C1` file-exists-and-readable: target paths exist and open.
- `C2` structure-smoke: markdown/YAML/JSON well-formed; frontend/backend entrypoints present as applicable.
- `C3` compose/config: `docker compose config` passes (once compose exists).
- `C4` build-smoke: actual build command as implemented (record it; do not invent before it exists).
- `C5` scenario-smoke: documented demo scenario runs end-to-end (sim → signals → backend → dashboard → alert) with screenshots/log excerpt in evidence.
- Checks are ordinary functional checks, not a test suite, until a runner is adopted and recorded here.

## Route Declaration Convention (per task)

Each task declares `route: inline | delegated` plus trigger evidence:

- `inline` — small, coherent authoring directly in the working agent (default for docs, scaffolding, wiring).
- `delegated` — handoff to a specialist sub-agent when trigger evidence is met (e.g., >~400-line 3D scene, backend/API surface, AI/RUL logic, dashboard UX). Trigger evidence must cite the concrete signal (file size, new domain, unmet expertise) — not size alone.
- Route may change mid-task if evidence changes; record the change in the task evidence note.

---

## Sprint S0 — Bootstrap

### T1 — S0 scaffolding (frontend + backend + docker + docs skeleton)

- **Goal:** Minimal runnable skeleton: Vite+React+Three.js frontend stub, FastAPI stub, InfluxDB + MQTT mock via Docker Compose, README run path, `.gitignore`.
- **Done criteria:**
  - `frontend/`, `backend/`, `docker-compose.yml`, `README.md` exist and are readable.
  - `docker compose config` passes.
  - README documents local run (no remote steps).
- **Checks:** C1, C2, C3.
- **Evidence:** commit id `bb9e594d8b00785c5bee3e924cf19ac35a2a0262` (recorded post-commit; final id after id-record amend — see `git log` as source of truth).
- **Route:** `delegated` (writer trigger: 4+ files across frontend/backend/docker/docs domains).

## Sprint S1 — 3D Bench / Wheel Sim (Sim A)

### T2 — Bench / test-rig 3D scene

- **Goal:** Test-rig frame + simplified wheel/motor housing in Three.js, orbit controls, sensor-point markers, labeled annotations.
- **Done criteria:**
  - Scene loads from documented command; rig + housing recognizable; markers for pressure (drain-plug T), temp (magnetic plug), vibration (sun-pinion cover), Hall clamp.
  - No-drill narrative annotated in-scene or side panel.
- **Checks:** C1, C2, C4, C5 (visual smoke + screenshot).
- **Evidence:** commit id `TBD-T2` (+ screenshot path).
- **Route:** `delegated` — trigger evidence: dedicated 3D/Three.js domain + expected ~400-line scene file; inline authoring would risk quality.

### T3 — GDY106 internals + oil volume + settling transient

- **Goal:** Simplified internals (sun/pinion/rotor volumes), oil-level visualization (95 L reference, <50% warning / <30% critical coloring), settling-transient animation as viscosity proxy, rest-gated "recalibration" indicator.
- **Done criteria:**
  - Oil level slider/driven value visibly changes fill + color thresholds.
  - Settling animation plays on move→rest transition with shape parameter exposed (viscosity proxy stub).
  - Sensor points from T2 remain visible in cutaway.
- **Checks:** C1, C4, C5.
- **Evidence:** commit id `TBD-T3`.
- **Route:** `delegated` — trigger evidence: physics-viz coupling + animation state machine; specialist 3D + signal collaboration.

## Sprint S2 — 3D Truck / Faena Sim (Sim B)

### T4 — 930E truck + open-pit + haul-cycle FSM

- **Goal:** Simplified 930E truck, open-pit segment with load / haul / dump / wait zones, haul-cycle state machine driving truck position + wheel RPM narrative (rotor 3000 RPM / wheel ~92 RPM reference displayed).
- **Done criteria:**
  - Cycle auto-loops through load→haul→dump→wait with zone highlighting and state readout.
  - Truck stops + levels in load/dump/wait (recalibration windows flagged).
- **Checks:** C1, C4, C5.
- **Evidence:** commit id `TBD-T4`.
- **Route:** `delegated` — trigger evidence: second large Three.js scene + FSM domain; parallelizable with S1.

### T5 — Moving vs rest modes + camera/UX polish

- **Goal:** Moving/rest mode coloring + HUD, camera presets (cab / side / wheel close-up), pause/step controls, perf-acceptable frame rate on typical laptop.
- **Done criteria:**
  - Mode indicator syncs with FSM (moving in haul, rest in load/dump/wait when stopped+leveled+engine-on).
  - Camera presets + pause/step work; no console-blocking errors.
- **Checks:** C1, C4, C5.
- **Evidence:** commit id `TBD-T5`.
- **Route:** `inline` (UX polish on top of T4; delegate back to T4 agent only if scene rework required — trigger: T4 API change).

## Sprint S3 — Signal Fusion + Move/Rest + Settling

### T6 — Synthetic signal generator + store-and-forward mock

- **Goal:** Python (or TS-shared) generator: 10 Hz pressure/temp + 1 kHz vibration (features/decimated for transport) + operational vars (RPM, slope, engine-on, zone/FSM state); store-and-forward mock (edge buffer → gateway → InfluxDB narrative,Droppable link simulation).
- **Done criteria:**
  - Generator emits timestamped series with documented schema; leak/drain scenario scriptable (slow leak + abrupt drop).
  - Outage buffering demonstrated (messages queued then flushed).
- **Checks:** C1, C2, C5.
- **Evidence:** commit id `TBD-T6`.
- **Route:** `delegated` — trigger evidence: signal-processing domain + schema decision affecting S4/S5; needs specialist review.

### T7 — Move/rest detector (rules) + settling-transient / viscosity proxy

- **Goal:** Accelerometer-rule detector (no ML): stopped + leveled + engine-on → rest/recalibration window; moving otherwise. Settling-transient extractor producing viscosity-proxy feature.
- **Done criteria:**
  - Detector output matches FSM zones on synthetic data (haul=moving, load/dump/wait stopped+leveled=rest) with logged windows.
  - Settling feature varies monotonically with stub viscosity parameter (direction documented even if scale is synthetic).
- **Checks:** C1, C5 (window log excerpt).
- **Evidence:** commit id `TBD-T7`.
- **Route:** `inline` if T6 agent available for continuity, else `delegated` — trigger evidence: same signal domain as T6; prefer same author.

## Sprint S4 — Backend FastAPI + InfluxDB + MQTT Mock

### T8 — Ingestion + query API + Docker wiring

- **Goal:** FastAPI ingestion (MQTT mock subscriber) → InfluxDB writes; query endpoints for level/confidence/windows/alerts/RUL stubs; `docker compose up` runs broker-mock + InfluxDB + backend.
- **Done criteria:**
  - Synthetic generator → MQTT mock → backend → InfluxDB → query round-trip works locally.
  - OpenAPI/docs endpoint reachable; dashboard can consume queries (contract documented even before S6).
- **Checks:** C1, C2, C3, C5.
- **Evidence:** commit id `TBD-T8`.
- **Route:** `delegated` — trigger evidence: backend/API + Docker/Influx domain distinct from 3D; needs Python/FastAPI specialist.

## Sprint S5 — AI Anomalies / Regression / RUL + N1–N4

### T9 — Anomaly detection (statistical baseline / Isolation Forest)

- **Goal:** Baseline (z-score/residual) + optional Isolation Forest on rest-gated features; auditable anomaly records (inputs + window + score + threshold).
- **Done criteria:**
  - Slow-leak and abrupt-drop scenarios flagged; no-flag on clean baseline run (documented FP note).
  - Every flag carries auditable payload.
- **Checks:** C1, C5 (scenario log excerpts).
- **Evidence:** commit id `TBD-T9`.
- **Route:** `delegated` — trigger evidence: ML/stats domain; threshold + evaluation judgment required.

### T10 — Level regression + RUL + N1–N4 ladder

- **Goal:** Level regression (enabled only with bench-correlation proof or clearly-labeled synthetic proxy); RUL extrapolation in hours / haul-cycles / shifts with confidence, lubrication-gated; N1 trend / N2 confirmed leak (2-of-3 channels) / N3 shift-window / N4 critical loss with <50%/<30% + abrupt-drop wiring.
- **Done criteria:**
  - Synthetic leak demo walks N1→N4 with RUL countdown + confidence; regression path labeled `proven` vs `synthetic-proxy`.
  - Fallback noted: if precision insufficient, RUL suppressed and anomaly-only surfaced.
- **Checks:** C1, C5.
- **Evidence:** commit id `TBD-T10`.
- **Route:** `delegated` — trigger evidence: same AI/RUL domain as T9; prefer same author for ladder consistency.

## Sprint S6 — Dashboard / UX Pro Demo

### T11 — Pro dashboard + linked sim + demo scenario

- **Goal:** React dashboard (Grafana referenced as alternative): level + confidence band, rest-window markers, N1–N4 timeline, RUL panel, mode indicator linked to sims; one-click demo scenario (clean → slow leak → abrupt drop → N4).
- **Done criteria:**
  - Dashboard consumes S4 API; demo scenario runs end-to-end with screenshots; hackathon-judge path < 5 min from `compose up` to visible alert.
- **Checks:** C1, C4, C5.
- **Evidence:** commit id `TBD-T11` (+ screenshots).
- **Route:** `delegated` — trigger evidence: UX/dashboard domain + demo choreography; benefits from fresh reviewer eyes.

## Sprint S7 — Validation / Calibration + Feasibility Report

### T12 — Bench drain-and-weigh procedure + calibration analysis

- **Goal:** Documented bench procedure (drain-and-weigh steps, volumes, rest-gating, repeats), correlation analysis template (fused signal vs weighed volume, error/confidence), honest result: fusion proven / partial / refuted on available evidence (synthetic-proxy clearly labeled if no physical bench ran).
- **Done criteria:**
  - `docs/calibration.md` (or `s7/`) with procedure + results table + error/confidence statement + pivot recommendation.
- **Checks:** C1, C2, C5 (procedure review, not hardware).
- **Evidence:** commit id `TBD-T12`.
- **Route:** `inline` (docs + analysis; delegate only if statistical analysis disputed — trigger: reviewer challenge on error methodology).

### T13 — Feasibility report (was idea winnable?) + demo script + closeout

- **Goal:** One-page verdict + demo script + branch closeout notes: was the fusion idea winnable? What pivots (anomaly-only + precise rest readings)? What would field pilot need (120 °C, EMI, T-adapter, epoxy MEMS, Hall clamp, LoRaWAN future)?
- **Done criteria:**
  - `docs/feasibility.md` answers winnable yes/partially/no with evidence links; `docs/demo-script.md` enables <5-min judged run; assumption outcome recorded (fusion proven vs pivot).
  - This ODD doc updated with final commit ids + running line count.
- **Checks:** C1, C2.
- **Evidence:** commit id `TBD-T13`.
- **Route:** `inline` (synthesis; no new domain).

---

## Evidence Log (fill as tasks land)

| Task | Commit | Notes (incl. size-heuristic overrun why, if any) |
|------|--------|--------------------------------------------------|
| Bootstrap (this doc) | `f5edeb1f2ee7d7189d387f1a4197bacb50d010b4` (pre-id-record; final amended id — see `git log`) | Initial ODD doc + .gitignore only. Running: 0 authored impl lines. |
| T1 | `bb9e594d8b00785c5bee3e924cf19ac35a2a0262` (pre-id-record; final amended id — see `git log`) | Done: frontend Vite+React+Three.js stub, FastAPI stub (/health, POST /ingest, GET /level, /alerts, /rul STUB payloads), pinned compose (influxdb 2.7.6, mosquitto 2.0.18), README local run. Route: delegated (writer trigger: 4+ files across frontend/backend/docker/docs domains). Checks: C1/C2 pass, C3 `docker compose config` pass, `python3 -m py_compile backend/main.py` pass, FastAPI TestClient smoke pass (all stub routes + /openapi.json 200). Running: 350 (forecast; actual ~420 new lines — overrun why: 15-file multi-domain S0 scaffold kept as one coherent work-unit; heuristic advisory only). `.gitignore` preserved as-is (node/python/dist/influx already covered). |
| T2 | `f209ff1d4fc5aaf2fcb8f2b70850cb3b2cd7c5f0` (pre-id-record; final amended id — see `git log`) | Done: steel-frame rig + simplified GDY106 housing (barrel/ribs/gearbox/sun-pinion cover/flange/shaft/cable), OrbitControls, ambient+directional, grid; 4 markers (red pressure T-adapter, orange temp mag-plug, cyan vibration pinion-cover, violet Hall clamp) as emissive spheres + HTML overlay labels + clickable side-panel list with no-drill mounts; App Stub<->Bench tabs (S0 stub intact, default Bench); side panel no-drill narrative + 120C/EMI documented-not-built note. Route: delegated (3D domain + ~400-line scene). Checks: C1/C2 pass, C4 local `tsc --noEmit -p frontend/tsconfig.json` pass, C3 `docker compose config` pass, C5 real headless-Chrome screenshot `docs/screenshots/t2-bench.png` (dev-server render, not manual). Running: 750 (forecast; actual ~644 authored lines — overrun why: single coherent 3D-scene work-unit kept together for reviewability; heuristic advisory only). |
| T3 | `1883a37` (pre-id-record; final amended id — see `git log`) | Done: cutaway GDY106 internals (sun gear + 3 planetary pinions + ring hint + rotor barrel, low-poly, low-metalness PBR as T2) + 95 L oil slab (slider-driven, green ≥50% / amber 30–50% / red <30%, liters + % chip + readout) + damped-sine settling wobble on move→rest (~2.0–3.6 s via viscosityProxy 0.5–2.0 slider, ms + label readout) + rest-gated RECALIBRATING badge (grey standby when moving); T2 markers/labels intact; BenchView Oil/Viscosity sliders + Move/Rest toggle + Cutaway checkbox; Stub tab untouched. Route: delegated (physics-viz + animation state machine). Checks: C1/C2 pass, C4 local `npx tsc --noEmit -p tsconfig.json` (frontend/) pass — note `npx -y tsc` from root resolves the wrong registry package, use the repo-local TypeScript; C3 `docker compose config` pass, C5 real headless-Chrome screenshot `docs/screenshots/t3-oil-settling.png` + `docs/t3-oil-settling.md` note. Running: 1200 (forecast; actual ~609 authored lines Δ — overrun why: internals + oil + settling + controls kept as one coherent viz work-unit; heuristic advisory only). |
| T4 | `3d18537c1f1ad0a55d38427881e86e522f7cfd2e` (pre-id-record; final amended id — see `git log`) | Done: simplified 930E (chassis/cab/tiltable bed/6 cylinder wheels, rear-axle GDY106 pair amber) + open-pit loop (LOAD/HAUL/DUMP/WAIT pads + labels + terraces + loader/crusher props, low-metalness PBR as S1) + haul-cycle FSM auto-loop 6/12/6/5 s (29 s) with state readout, zone highlight, waypoint lerp, ore load/dump, pause/restart; RECAL badge follows measured stillness (LOAD/DUMP on, HAUL/WAIT gated — WAIT doubles as the empty return lane, documented in `docs/t4-truck-cycle.md`); rotor 3000 RPM / wheel 92 RPM as text narrative, spin illustrative; App Truck tab (Stub/Bench/Truck, `#truck` deep-link; prior tabs intact). Route: delegated (second large Three.js scene + FSM domain, parallelizable with S1). Checks: C1/C2 pass, C4 local `npx tsc --noEmit -p tsconfig.json` (frontend/) pass — `-p frontend/tsconfig.json` does not resolve from frontend/, T3 quirk confirmed; C3 `docker compose config` pass, C5 real headless-Chrome screenshot `docs/screenshots/t4-truck-cycle.png` (dev-server render, LOAD + RECAL badge visible). Running: 1650 (forecast; actual ~946 authored lines Δ, png excluded — overrun why: single coherent second-3D-scene + FSM work-unit kept together for reviewability; heuristic advisory only). |
| T5 | `340ab99` (pre-id-record; final amended id — see `git log`) | Done: moving (blue, HAUL + WAIT return) / rest (green, LOAD / DUMP) mode tint on truck (cab emissive + ground ring) + HUD MOVING/REST badge + 930E tag, same live stillness signal as RECAL badge (`isMovingState`/`isRecalState`, FSM untouched); camera presets Pit/Cab/Side/Wheel with exp-lerp pos+target (Pit static, others track truck; manual orbit releases to free); Pause + Step +1s (disabled unless paused); bench Pressure/Temp label overlap fixed via ±vertical nudge; `docs/t5-modes-cameras.md` note (WAIT honestly moving — differs from T5 feature-doc line on purpose, documented). Route: inline (polish on T4 API, no rework). Checks: C1/C2 pass, C4 `npx tsc --noEmit -p tsconfig.json` (frontend/) pass, C3 `docker compose config` pass, C5 real headless-Chrome screenshots `docs/screenshots/t5-modes-cameras.png` (LOAD + REST + RECAL + presets visible) + bench re-render check (labels separated, no page JS errors — only benign headless-Mac/SwiftShader GL noise). Running: 1950 (forecast; actual ~287 authored lines Δ, png excluded — under advisory, no overrun note needed). |
| T6 | `ebd8a11` (pre-id-record; final amended id — see `git log`) | Done: `sim/generate.py` 10 Hz pressure-temp plus operational vars (rotor-wheel via 32.62:1, engine-on, FSM zone from `cycle.ts` 6-12-6-5 loop, slope, level truth) plus 1 kHz vibration decimated on-edge to RMS-kurtosis per 100 ms (raw never written); scenarios clean, slow-leak 0.5pct-h spec-true, abrupt-drop 15 L step, sensor-drift ramp, link-outage flagged; label plus link_down ground truth. `sim/SCHEMA.md` fields-rates-units plus leak params plus example rows plus real slow-leak and buffer-proof log excerpts. `sim/store_forward.py` FIFO edge buffer drop-then-flush with queued-flushed-sent counts and PASS proof. `frontend/src/sim/signals.ts` TS mirror (FsmState equals HaulState, ScenarioName, SignalRow, header, rate and physics constants) for T7-T8. Route: delegated (signal-processing domain plus schema decision affecting S4-S5, specialist review). Checks: C1-C2 pass, C5 slow-leak 30 s demo plus link-outage 200-row buffer proof PASS, `py_compile` pass, frontend `tsc --noEmit` plus `vite build` pass, `docker compose config` pass, clean 5 s smoke 51 lines. Running: 2350 (forecast; actual ~569 authored lines Δ — overrun why: generator plus buffer plus schema doc plus TS contract kept as one coherent signal-domain work-unit for T7-T8 reviewability; heuristic advisory only). |
| T7 | `15233eb` (pre-id-record; final amended id — see `git log`) | Done: `sim/detect.py` rules (speed<0.5 synthetic wheel scale + \|slope\|<2 + engine-on, 3 s confirm, immediate exit; live stillness only, zone = audit label) + `sim/settling.py` grid-search tau on env² (floor from tail, linear space, raw-fit honestly non-detects) + `sim/run_t7.py` tying both + `docs/t7-windows.md` + TS `RestWindow`/`isRestWindow`/`DETECTOR_*` mirror in `signals.ts`. Route: inline (same signal domain as T6; continuity). Checks: C1/C2 pass, C5 clean 120 s (26 windows, steady_state=1.000, WAIT moving CORRECT) + clean 5-min zone×state proof (HAUL/WAIT 100% moving, rest only in LOAD/DUMP) + monotonicity means 1652/1878/3995 ms at proxy 0.5/1.0/2.0, `py_compile` pass, frontend `tsc --noEmit` pass, `docker compose config` pass. Running: 2700 (forecast; actual ~605 authored lines Δ — overrun why: two estimator bias fixes (quadrature-gate selection bias, log/Jensen bias) + joint-fit hallucination fix kept as one coherent extractor work-unit with FIT_METHOD note; heuristic advisory only). |
| T8 | `da95870` (pre-id-record; final amended id — see `git log`) | Done: POST /ingest SignalRow batch → memory store + best-effort InfluxDB (fallback-memory logged, never silent), GET /level (latest + confidence stub 0.0), GET /windows (recal grouping; full detector `sim/detect.py`), GET /alerts + /rul honest NOT_IMPLEMENTED_YET to T10, GET /health + /docs; `backend/ingest_mqtt.py` bridge (topic oilguard/signals, backoff retries, `--publish-csv` demo); compose healthchecks (influx ping, mosquitto_pub, urllib) + backend env wired + VITE_BACKEND_URL; `backend/API.md` contract + curl round-trip; `frontend/src/sim/api.ts` typed client (no UI change). Route: delegated (backend/API + Docker/Influx domain). Checks: C1/C2 pass, C3 `docker compose config` pass, C5 TestClient smoke 5 real T6 rows POST 200 → /level 200 seq=4 + /windows count=1 + stubs honest + /openapi.json 200, decode unit + frontend `tsc --noEmit` pass. Running: 3100 (forecast; actual ~916 authored lines Δ — overrun why: ingestion + bridge + compose + contract + client types kept as one coherent S4 work-unit; heuristic advisory only). |
| T9 | `dd255e0c518f69596c66fcd14efd8908def4436e` (pre-id-record; final amended id — see `git log`) | Done: `ai/anomaly.py` z-score on rest-gated temp-compensated pressure residual (\|z\|>3.0, baseline=first rest window, sigma floor 0.10) + opt-in `--iforest` (sklearn-missing fallback logged, never silent) → auditable `ai/flags.jsonl` (135-line abrupt-drop TP example: ts/score/threshold/inputs/window_id/scenario); `ai/run_demo.py` full demo PASS (clean 1/228 FP = expected Gaussian tail, documented; LAB-ACCELERATED slow-leak 30 %/h x60 262/620 TP from t=51 s; abrupt-drop 135/228 TP, z≈−31) + single-file `--in/--windows` mode; `ai/requirements.txt` separate (backend light, `backend/` untouched, /alerts stays NOT_IMPLEMENTED_YET until T10); `docs/t9-anomaly.md` with spec-true 300 s invisibility proof (4 mixed-sign noise flags, truth z≈0.08) + FP note + T10 contract. Route: delegated (ML/stats domain, threshold + evaluation judgment). Checks: C1/C2 pass, C5 real demo excerpts, `py_compile` pass, `docker compose config` pass. Running: 3450 (forecast; actual ~703 authored lines Δ, flags.jsonl data excluded — overrun why: scorer + demo runner + full anomaly doc with real-run excerpts kept as one coherent ML work-unit; heuristic advisory only). |
| T10 | `d852919` (pre-id-record; final amended id — see `git log`) | Done: `ai/level.py` rest-gated temp-compensated pressure→level regression (self-recalibrating baseline anchor, confidence from baseline precision, every output labeled `synthetic-proxy` — NOT proven until S7 bench) + `ai/rul.py` least-squares trend → hours/cycles/shifts with lubrication/precision gate (n≥10, σ_L≤2 L, slope<0, R²≥0.3, else suppressed anomaly-only, never silent) + `ai/ladder.py` N1 trend/N2 2-of-3 {pressure,level,vib} with temp-drift exclusion veto/N3 RUL<8 h shift/N4 abrupt-drop or <30%, all alerts auditable (thresholds+inputs+window+baseline) + `ai/demo_leak.py` clean→LAB-ACCELERATED slow-leak (auto ~4 L/run, rate+factor labeled)→abrupt-drop→N4 walk + `docs/t10-rul-ladder.md` with real excerpts; backend GET /alerts + /rul wired off stubs (status ok, fallback notes kept: empty store / suppressed RUL / missing-ai never 500), image ships `ai/` (compose backend context=root + `COPY ai ./ai`), `GET /level` echo untouched for T11; TestClient smoke POST 1800-row stitched timeline → escalation N1→N2→N3→N4 + RUL served. Route: delegated (AI/RUL domain, same trigger as T9; ladder-consistency specialist logic). Checks: C1/C2 pass, C5 demo PASS + smoke PASS + fallbacks verified (empty/clean/suppressed), `py_compile` pass, `docker compose config` pass. Running: 3850 (forecast; actual ~1110 authored lines Δ — overrun why: regression + RUL + ladder + demo + doc + backend wiring kept as one coherent AI work-unit for T11 dashboard reviewability; heuristic advisory only). |
| T11 | `2e0a4918e13db3c7b37b2722a0fd4aa1c4200231` (pre-id-record; final amended id — see `git log`) | Done: `frontend/src/dash/` Dashboard (SVG level + ±σ band, rest-window shading, ladder-offset N1–N4 dots, RUL ok/suppressed panel, FSM-clock mode indicator + backend window count, LIVE/DEMO badge), S4 API via api.ts (new T10 Alerts/Rul types; CORS already open, no backend change), one-click clean → LAB-ACCELERATED slow-leak → abrupt-drop → N4 demo driving Bench 3D fill via demoBus event + `#dash-demo` autostart, `docs/demo-script.md` <5-min judge path, real headless-Chrome screenshot `docs/screenshots/t11-dashboard.png` (dev-server, slow-leak N1/N2/N3 + LAB label). App Dash tab (Stub/Bench/Truck/Dash). Route: delegated (UX/dashboard + demo-choreography domain, fresh reviewer eyes per feature doc). Checks: C1/C2 pass, C4 `npx tsc --noEmit -p tsconfig.json` (frontend/) pass, C3 `docker compose config` pass, C5 screenshot real. Running: 4250 (forecast; actual ~1014 authored lines Δ, png excluded — overrun why: chart + RUL + demo runner + link bus + judge script kept as one coherent S6 work-unit; heuristic advisory only). |
| T12 | `c836741` (final amended id — see `git log`) | Done: `docs/calibration.md` bench drain-and-weigh procedure (95 L SAE 85W-140 steps 95→90→80→70→47.5→28.5, 20 min stabilization, rest-gate stopped+leveled+engine-on 3 s, 3 repeats) + correlation template (weighed vs fused, err/RMSE/conf) + honest PARTIAL verdict (synthetic-proxy logic proven, field-rate + bench correlation PENDING, anomaly-only viable NOW — no field-accuracy claim). Route: inline (docs + analysis). Checks: C1/C2 pass, C3 `docker compose config` pass. Running: 4550 (forecast; actual ~200 authored lines Δ — docs-only work-unit; heuristic advisory only). |
| T13 | `c836741` (final amended id — see `git log`) | Done: `docs/feasibility.md` one-page verdict YES winnable as staged bet (anomaly+rest NOW, fusion AFTER bench; links T7/T9/T10) + pivot decision recorded (fusion-as-day-one-claim REJECTED, anomaly-only ADOPTED) + pilot needs (120 °C, EMI, T-adapter, epoxy MEMS, Hall clamp, LoRaWAN future, 250 h blind-spot ≈ USD 150k ref) + `docs/demo-script.md` polish (Stub→Bench→Truck→Dash tab tour, judge path ~4 min) + this closeout (status done, assumption PARTIAL recorded). Route: inline (synthesis). Checks: C1/C2 pass. Running: 4750 forecast final (actual ~150 authored lines Δ — docs-only; heuristic advisory only). |

## Closeout (T12+T13, final)

- Closeout commit: `c836741` (`docs(s7): calibration feasibility closeout`; final amended id — see `git log`).
- Final running: 4750 forecast (T1–T13); this work-unit actual 172 insertions / 6 deletions across 4 files (docs-only: 2 new docs + demo-script polish + this doc update).
- `git log --oneline -15` and `git diff --stat` at closeout: see commit body
  (recorded post-commit; `git log` is source of truth).
- Verification at closeout: branch `feature/oilguard-sim`;
  `docker compose config --quiet && echo COMPOSE_OK` → COMPOSE_OK;
  `ls docs/*.md` → calibration.md, demo-script.md, feasibility.md,
  t3/t4/t5/t7/t9/t10 notes.
- Assumption outcome: fusion PARTIAL (see Key Assumption Under Test);
  no push/PR/remote (local only). Plan closed.

## Risks / Watchlist

1. Fusion-unproven → schedule S7 early reads on synthetic data; keep anomaly-only path viable from T9 onward.
2. Two 3D sims can balloon scope → simplified geometry mandate; no CAD-exactness.
3. Vibration 1 kHz realism → edge-feature narrative suffices; do not stream raw 1 kHz to backend in demo.
4. InfluxDB/MQTT local weight → mock broker acceptable; document LoRaWAN as future, do not implement.
5. Demo fragility → S6 one-click scenario + pinned versions in compose.

## References (pre-proposal, approved context)

- Problem/solution/fusion narrative, haul-cycle pauses, settling-transient viscosity proxy.
- Thresholds: warning <50%, critical <30%, abrupt pressure drop; N1–N4 ladder; RUL hours/cycles/shifts, lubrication-gated.
- Mount points no-drill; 120 °C / EMI; ESP32-S3 + Pi + InfluxDB + FastAPI + Grafana; MQTT/TLS prototype, LoRaWAN future.
- Stack decided: React + Vite + Three.js + FastAPI + InfluxDB + MQTT + Docker + Git.
