# Landing claims — read-only evidence report (B01)

B01 delivers a source trace only. No geometry, mount, pause, or TRL value is decided here: proven claims point at their source, unproven claims stay marked unproven, and every gap names the decision owner. No production, test, or documentation source was edited for this report.

## Quick path

1. Read the four trace tables below (§1–§4) before writing any landing claim or scene geometry.
2. Treat every `UNPROVEN` / `UNRESOLVED` cell as a hard stop for B02–B07 copy and geometry.
3. See §5 for the explicit gap list and §6 for the reviewer checklist.

## 1. Mounting points (sensor service points)

| Claim | Status | Source |
|---|---|---|
| Pressure tap = oil drain pipe plug item 56 at 6 o'clock | Traced, service point only | `frontend/src/sim/bench/BenchScene.tsx:24-26`; `docs/thesis-annex.md:207-208`; `docs/research/twin-reference.md:226` (drain plug at largest radius, 6 o'clock, from Fig. 95) |
| Temperature point = magnetic pipe plug item 41 | Traced, service point only | `frontend/src/sim/bench/BenchScene.tsx:24-26`; `docs/thesis-annex.md:208-209`; `docs/research/twin-reference.md:147` (four low-speed planets with plugs 1–8; level check via 6 o'clock plug, GDY lines 372-374) |
| Vibration point = sun inspection cover items 39/36 | Traced, service point only | `frontend/src/sim/bench/BenchScene.tsx:25-26`; `docs/thesis-annex.md:208-209`; `frontend/src/sim/bench/sensors.ts:32-38` (item `"39/36"`) |
| Current input = Hall clamp on traction power cable | Traced, reference signal | `frontend/src/sim/bench/BenchScene.tsx:26`; `docs/thesis-annex.md:209-210`; `frontend/src/sim/bench/sensors.ts:40-46` (item `"cable"`) |
| Items 56/41/39 are on the rotating output (LS carrier → torque tube → hub); they are service-point locations, NOT stationary references | Traced correction | `docs/thesis-annex.md:51-55` (T10 correction of the pre-proposal "fixed points" phrase) |
| Scene anchor coordinates in `BENCH_SENSORS` (pressure `[-1.4, 1.28, 0.42]`, temperature `[0.45, 1.4, 0.36]`, vibration `[-2.14, 2.3, 0.34]`, current `[1.0, 2.34, 0.5]`) | UNPROVEN as physical mounts — scene anchors only | `frontend/src/sim/bench/sensors.ts:14-47`; cutaway is "NOT CAD-exact" (`frontend/src/sim/bench/BenchScene.tsx:18-19`; `docs/thesis-annex.md:37` P17) |
| Landing mount table (Threaded port / Surface contact / Surface contact / Existing signal, `DESIGN INPUT · ASSUMPTION`, "Positions are conceptual; confirm against the physical assembly before installation") | UNPROVEN — disclosed design input, not a sourced fact | `frontend/src/platform/landing/Landing.tsx:110`; `frontend/src/i18n/dict/platform.ts:180-184` |
| Sampling/reading practice at item 56 (12 in hose, 250 h) and item 41 paste/flake reading | Traced procedure text | `docs/inspection.md:20-25`; `docs/research/twin-reference.md:147` |
| Modified-cover oil transfer duct path (splash → outer cavity → cover → sun pinion interior → retainer/washer) | Traced to manual text, unmeasured | `docs/thesis-annex.md:210-212` |
| Whether the GDY106 case is vented; whether the hub-bearing cavity shares the 95 L sump | UNRESOLVED | `docs/research/twin-reference.md:226, 349` (gap §7.6) |
| Hoist hinge location, body mounting points | UNRESOLVED | `docs/research/twin-reference.md:350` (gap §7.8) |

## 2. Pause count (haul-cycle stationary pauses)

| Claim | Status | Source |
|---|---|---|
| Sim FSM has four phases: LOAD 6 s (stopped), HAUL 12 s (moving), DUMP 6 s (stopped), WAIT 5 s (moving empty return); 29 s loop | Traced | `frontend/src/sim/truck/cycle.ts:1-31`; `docs/t4-truck-cycle.md:5-8` |
| Only LOAD and DUMP are stationary (`isRecalState`); WAIT is a moving state (`isMovingState` = HAUL/WAIT) | Traced — exactly two pauses | `frontend/src/sim/truck/cycle.ts:54-65`; `docs/t4-truck-cycle.md:26-29` (RECAL badge follows measured stillness, lights at LOAD/DUMP) |
| Landing scenes may use only the LOAD/DUMP pauses; no third or fourth pause exists | Constraint preserved, not invented | B06 scope in `odd/tasks/integrity-narrative.md` (cycle.ts READ ONLY: "only LOAD/DUMP stationary; no invented pauses") |
| Payload Meter III manual domain has 8 states (tare_zone, vacio, cargando, maniobrando, final_zone, acarreando, vaciando, after_dump) with constants 10 s, 5 km/h, 20 %, 50 %, 10 s, 10 % swing, 4–6 s detection, 160 m, 1 min | Traced to OM extract, distinct from the sim FSM | `docs/research/twin-reference.md:271-307` (§4, OM lines 6249-6323) |
| Manual gaps: no explicit entry rule for `acarreando` or `vacio`; `after_dump`→ paths ambiguous | UNRESOLVED in the manual reading | `docs/research/twin-reference.md:301-305` |
| Sim 4-state pauses ≠ manual 8-state supervisory states; the two must never be conflated in landing copy | Analytical guard, no source change | This report; sources above |

## 3. Gear-source claims (32.62:1 reduction)

| Claim | Status | Source |
|---|---|---|
| GDY106 two-stage planetary reduction 32.62:1, 64.5 km/h top speed | VERIFIED (manual) | `docs/thesis-annex.md:22` (P2: Komatsu 930E-5 spec sheet + brochure PDF URLs); `docs/research/twin-reference.md:144` (CRS lines 106-109, 465; BRO) |
| `TARGET_RATIO = 32.62` VERIFIED; tooth counts illustrative ASSUMPTION within 0.5 % | Traced | `sim/geartrain.py:10-13, 23-24, 119-124` (shared-ring-92 choice: HS 16/38/3, LS 24/34/4; error 0.015 %) |
| TypeScript mirror `GEAR_RATIO = 32.62`, `GDY106_TRAIN`, `stageRatio`/`trainRatio` | Traced, same assumption | `frontend/src/twin/physics.ts:7-8, 162-170` |
| Displayed stages 6.750:1 × 4.833:1 ≈ 32.62:1 (manual-validated overall; stages rounded to three decimals); exact illustrative product 32.625:1 | Traced | `docs/thesis-annex.md:37` (P17); `frontend/src/sim/bench/gearRatioDisplay.ts:1-17`; `tests/fixtures/physics_parity.json:404` (ratio 32.62500000000001) |
| Research-stage options (e.g. option A total 32.667 +0.14 %; option B 32.622 +0.007 %) are exploration, not the frozen choice | Traced, not adopted | `docs/research/twin-reference.md:206-222` ("the frozen choice lives in `sim/geartrain.py` with tests") |
| Rotor 3000 rpm → wheel ≈ 92 rpm arithmetic | DERIVED | `docs/thesis-annex.md:23` (P3); `sim/physics.py:GEAR_RATIO`, `sim/physics.py:WHEEL_RPM_AT_MAX` |
| Tooth counts, high-speed planet count, GDY106 outer dimensions/mass, oil level mark | UNRESOLVED — no accessible source | `docs/research/twin-reference.md:148, 341-343` (gap §7.1); `docs/thesis-annex.md:35` (P15 ASSUMPTION) |

## 4. TRL posture

| Item | Posture |
|---|---|
| Author TRL numeric decision | **UNRESOLVED — no author TRL decision exists in any repository source.** A full-text search for `TRL`, `readiness level`, and `nivel de madurez` returns only the three requirement sentences in `odd/tasks/integrity-narrative.md` (scope line 59, B01 row 93, gate line 1661). No doc, test, dictionary, or code file states a TRL number. |
| Required handling | Per the plan gate (line 1661), the numeric TRL decision belongs to the author/user. Until that decision is recorded verbatim, landing copy must not carry any TRL number. This report invents none. |
| Related normative boundary | SIL / ISO 13849 / IEC 62443 claims are out of scope without evidence (`odd/tasks/integrity-narrative.md` §5). |

## 5. Gaps returned to the parent (out-of-scope changes, not made)

1. **TRL number** — needs the author decision recorded verbatim (UNRESOLVED).
2. **Surveyed mount data** — coordinates, thread/torque specs, and install procedure for items 56/41/39/cable; the bench needs measured values before B05 cards can claim more than service-point identity.
3. **Case venting and sump sharing** — affects whether a gauge/differential pressure sensor is even the right instrument (`docs/research/twin-reference.md:313`, §7.6).
4. **Sensor datasheets** — a true 0–10 kPa / 125 °C / 4–20 mA part and a ≥ 5 kHz-bandwidth accelerometer were not obtained; ADXL355 figures are search-snippet only (`docs/research/twin-reference.md:317-323, 348`).
5. **Primary manual PDFs** — CRS/OM/GDY extracts and Fig. 95 crops live in author-held scratch files outside the repo (`docs/research/twin-reference.md:352`); P1/P5/P6 cite paywalled vendor PDFs held by the thesis author.
6. **PLM III entry-rule ambiguities** — simulator FSM mapping for `acarreando`/`vacio` entry (report §2, row 5).
7. **Switchback radius, bench height, crusher pocket** — no primary citation; design assumptions only (`docs/research/twin-reference.md:262-267, 347`).

## Checklist

- [ ] Every landing claim in B02 copy traces to one row above with status VERIFIED / Traced — never to an UNPROVEN or UNRESOLVED cell.
- [ ] B04 demonstrates 32.62:1 only from the §3 VERIFIED overall value; tooth counts stay labeled illustrative (P15).
- [ ] B05 sensor cards use service-point identity only; mount/install/modification detail beyond §1 stays UNPROVEN until bench data lands.
- [ ] B06 uses exactly the two §2 pauses (LOAD/DUMP); WAIT stays a moving return leg.
- [ ] No TRL number appears anywhere until the author decision is recorded verbatim in this report's §4 successor.
- [ ] No file besides this report was created or modified by B01.

## Next step

B02 (eight semantic bilingual beats) is pending and has not started. It is unblocked on evidence but still requires the author's TRL decision if any beat needs a maturity claim, and surveyed mount data if any beat needs more than conceptual sensor positions.
