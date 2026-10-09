# ODD Feature Document — oilguard-mining-sim

## Metadata

- **Project:** oilguard
- **Feature:** oilguard-mining-sim (OilGuard Mining — Hack the Challenge 2026)
- **Branch:** `feature/oilguard-sim`
- **Status:** planning / bootstrap (no implementation yet)
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
| T3 | TBD-T3 | — |
| T4 | TBD-T4 | — |
| T5 | TBD-T5 | — |
| T6 | TBD-T6 | — |
| T7 | TBD-T7 | — |
| T8 | TBD-T8 | — |
| T9 | TBD-T9 | — |
| T10 | TBD-T10 | — |
| T11 | TBD-T11 | — |
| T12 | TBD-T12 | — |
| T13 | TBD-T13 | — |

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
