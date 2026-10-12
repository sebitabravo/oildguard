# T13 — Feasibility verdict: was the idea winnable? (S7 closeout)

Validated scope: **930E/GDY106 (32.62:1) ONLY** — the 980E-5 (GDY108-C,
35.02:1) stays future work without validation.

**Verdict: YES — winnable as a staged bet.** Ship anomaly + precise rest
readings NOW; promote fusion AFTER the bench drain-and-weigh
(`docs/calibration.md`). No field-accuracy claim is made in this slice.

## Why yes (evidence-linked)

- Rest windows are real and free: the T7 rules detector (stopped + leveled +
  engine-on, 3 s confirm) matches the haul-cycle FSM at steady-state 1.000 —
  rest strictly in LOAD/DUMP, HAUL/WAIT 100% moving
  (`docs/t7-windows.md`). Recalibration exploits existing stillness, no
  operational change.
- Anomaly logic works and stays honest: T9 flags LAB-accelerated slow-leak
  (262/620 from t=51 s) and abrupt-drop (z≈−31) with 1/228 clean FP as
  expected tail; spec-true 0.5 %/h proven invisible in short windows
  (z≈0.08) so the demo labels its acceleration (x60) instead of faking rate
  (`docs/t9-anomaly.md`).
- RUL + N1–N4 ladder is demonstrable end-to-end: clean suppresses to
  anomaly-only; LAB leak (x257, labeled) walks N1→N2→N3→N4 with RUL countdown
  in hours/cycles/shifts; backend smoke serves the same escalation
  (`docs/t10-rul-ladder.md`, `docs/demo-script.md`).
- What is NOT proven: fused pressure→level field accuracy (gear-case geometry
  h(L), temp beta, vibration confirmation, 0.5 %/h detectability horizon).
  Status PARTIAL per `docs/calibration.md` — bench correlation PENDING.
  The pressure model is SYNTHETIC-PROXY (ASSUMED gear-case geometry,
  ≈ 2.6 kPa at 95 L; the former 28 kPa gain implied an absurd ~3.2 m head —
  see `sim/geometry.py` and `docs/thesis-annex.md` §2).

## Pivot decision (recorded)

| Option | Decision | Rationale |
|--------|----------|-----------|
| Fusion with confidence as day-one claim | REJECTED | Bench correlation pending; claiming it would be dishonest |
| Anomaly-only + precise rest readings now, fusion after bench | ADOPTED | Already implemented: RUL gates (n≥10, σ_L≤2 L, slope<0, R²≥0.3) suppress to anomaly-only; N1/N2/N4 fire on residuals; temp-drift veto caps at N1 |

Assumption outcome (from feature doc S7): *level-from-pressure-fusion with
confidence is UNPROVEN until bench* → resolved as **PARTIAL**: logic proven
on synthetic-proxy, field accuracy pending bench. Pivot path live, not silent.

## Field pilot needs (not built)

No-drill mounts: pressure T-adapter at drain plug; thermocouple K at magnetic
plug; triaxial MEMS epoxied on sun-pinion cover; Hall current clamp.
Gearcase temperature limit: 120 °C + EMI shielding is a design requirement,
not a sourced gearcase limit. The 930E Operation and Maintenance Manual's
hydraulic-reservoir warning (p. 76) does not establish a wheel-gearcase
temperature limit. Network:
MQTT/TLS prototype now, LoRaWAN future; store-and-forward edge (ESP32-S3) →
gateway (Pi + InfluxDB) → FastAPI → dashboard already mocked
(`sim/SCHEMA.md`, `backend/API.md`).

## Economics (reference, not a quote)

No cost figure is claimed here. Inspections every 250 h leave a blind spot
where a slow leak can progress to traction-motor failure, and the staged
pilot is justified operationally: early warning during existing LOAD/DUMP
rest windows without claiming fused field accuracy. The previously cited
unplanned-downtime amount is excluded from this argument because it could
not be traced to a verifiable source. Validate locally; bench first, then
one-truck pilot on LOAD/DUMP rest windows.

Closeout: stack runs locally (`docker compose up` → judge path < 5 min),
evidence rows T1–T13 in the feature doc, branch `feature/oilguard-sim` local
only (no push/PR/remote).
