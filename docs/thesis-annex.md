# Thesis annex — 930E/GDY106 physics + sensor hardening (S7 follow-up)

Scope (binding): every validated claim in this annex covers the **Komatsu
930E with GDY106 final drive (32.62:1) ONLY**. The Komatsu 980E-5 uses the
**GDY108-C final drive (35.02:1)** and stays **future work without
validation** — no 980E number in this repo is validated.

Status marks used below: **VERIFIED** (checked against a cited source),
**ASSUMPTION** (explicit placeholder the bench must replace), **GAP**
(documented-not-built: spec'd for the thesis, not implemented/purchased).

No bench data is invented in this annex: every table cell is either a cited
value, an explicit assumption, or an empty bench slot.

## 1. Parameter table (930E/GDY106)

| # | Parameter | Value | Status | Source |
|---|-----------|-------|--------|--------|
| P1 | Oil capacity per wheel motor | 95 L SAE 85W-140 | VERIFIED | Komatsu 930E shop-manual set (vendor PDF, held by thesis author; paywalled — see §6). Code anchor: `sim/generate.py:37`, `ai/level.py:47`, `sim/physics.py:28` |
| P2 | Final drive | GDY106, 32.62:1 | VERIFIED | Komatsu 930E-5 spec sheet: "Motorized wheels: GDY106-B … Ratio: 32.62:1" — https://www.komatsu.com/en-us/products/equipment/trucks/electric-drive-mining-trucks/930e-5 and brochure PDF https://www.komatsu.com/content/dam/komatsu/sales-and-marketing-documents/brochures/trucks/930e/930e-5-aess921-01-ev1.pdf |
| P3 | Rotor → wheel arithmetic | 3000 rpm / 32.62 ≈ 91.97 ≈ 92 rpm | VERIFIED (arithmetic) | `sim/physics.py:wheel_rpm` + smoke; demo narrative `frontend/src/sim/truck/TruckScene.tsx:710` |
| P4 | 930E max travel speed | 64.5 km/h (40 mph) | VERIFIED | Same Komatsu 930E-5 spec sources as P2 |
| P5 | Oil density 85W-140 | 890–912 kg/m³ @15 °C | VERIFIED | 85W-140 PDS set (vendor data sheets, held by thesis author; paywalled — see §6). Prior midpoint 901 kg/m³ in `sim/physics.py:33` |
| P6 | Viscosity 85W-140 | 350–420 cSt @40 °C; 26–28.6 cSt @100 °C; VI 95–103 | VERIFIED | Same PDS set as P5; J306 limits (85W ≤150 000 cP @−12 °C; 140 grade 24.0–41.0 cSt @100 °C) contain the PDS band |
| P7 | Density thermal prior β = 7e-4 /°C | Linear `rho(T)` prior | ASSUMPTION | `sim/physics.py:oil_density_kg_m3` — typical mineral-gear-oil order of magnitude; bench fits true β from weighed runs |
| P8 | Viscosity-vs-T curve form | Log-linear interpolation, 40 °C ↔ 100 °C midpoints | ASSUMPTION | `sim/physics.py:viscosity_mid_cst` — placeholder; bench fits Walther/Vogel from settling-tau vs temperature |
| P9 | Pressure anchor `p = rho(T)·g·h(V)` from the gear-case geometry (P13) | 95 L → h ≈ 0.305 m → 2.65 / 2.61 / 2.57 kPa at 40 / 60 / 80 °C; replaces the former 28 kPa @ 95 L gain | **DERIVED** (P5 VERIFIED density, P7 ASSUMED β, P13 ASSUMED cavity); SYNTHETIC-PROXY until the bench measures h(L) | `sim/physics.py:pressure_kpa_from_volume`, `sim/generate.py`, `ai/level.py`; numbers in §2 |
| P10 | 20-min stabilization per level step | Bench procedure step | ASSUMPTION (placeholder) | `docs/calibration.md` §1 — timer logged; bench may shorten/lengthen with degassing evidence |
| P11 | 980E-5 / GDY108-C 35.02:1 | Any 980E number | FUTURE WORK, no validation | User decision (binding); `sim/physics.py:FUTURE_RATIO_GDY108C` is an unvalidated constant, never consumed |
| P12 | Warning < 50% (47.5 L), critical < 30% (28.5 L) | Alert thresholds | VERIFIED (project spec, auditable) | `ai/level.py:50-51`, `ai/rul.py:36-37` |
| P13 | Gear-case oil cavity: horizontal annulus, R_OUT = 0.60 m, R_IN = 0.22 m, L = 0.42 m (411 L full) | Pool geometry h(V) | ASSUMPTION (GE does not publish the cavity; sized so 95 L gives a decimetre head) | `sim/geometry.py:GearCase`, mirrored in `frontend/src/twin/physics.ts`; one edit replaces it when the bench gives h(L) |
| P14 | Hold-up while the wheel turns: `V_holdup = 6 L · wheel_rpm / 91.97`; drain-back `tau = 0.75 s · viscosity_proxy` | Settling transient (pre-proposal §3.1) | ASSUMPTION (shape + parameters); bench fits them from weighed runs | `sim/generate.py:V_HOLDUP_MAX_L`, `SETTLE_TAU0_S` |
| P15 | Planetary tooth counts (shared ring Zr = 92; HS 16/38/3 planets, LS 24/34/4 planets) | Two-stage train 32.625:1 | ASSUMPTION (illustrative; GE does not publish tooth counts). Stage ratio `1 + Zr/Zs` is DERIVED | `sim/geartrain.py:GDY106_TRAIN` |

## 2. Hydrostatic anchor (geometry-derived, replaces the 28 kPa gain)

History (kept as a record, `sim/physics.py:absurdity_check`): the first demo
pipeline used a linear gain of 28 kPa at 95 L. With the VERIFIED density
prior that is a 3.2 m oil column inside a wheel motor — physically absurd:

```text
p = rho · g · h        rho ≈ 901 kg/m³, g = 9.81 m/s²
28 kPa @ 95 L  ⇒  h = 28000 / (901 × 9.81) ≈ 3.2 m   — ABSURD
```

The pipeline now derives pressure from the oil volume through the pool
geometry (P13): the pool is a circular segment of the outer radius minus the
submerged part of the concentric hub, so level → pressure is **nonlinear**.
Reproduce with `python3 -m pytest -q tests/test_geometry.py tests/test_hydrostatics.py`
or the snippet at the end of this section.

| Quantity (defaults P13, rho(T) prior P7) | Value | Status |
|---|---|---|
| Head at 95 L | 0.305 m | DERIVED |
| Head at 47.5 L / 28.5 L (warning / critical) | 0.188 m / 0.132 m | DERIVED |
| Pressure at 95 L, 40 / 60 / 80 °C | 2.648 / 2.610 / 2.572 kPa | DERIVED |
| Pressure at 47.5 L and 28.5 L, 60 °C | 1.607 kPa / 1.132 kPa | DERIVED |
| `dV/dh` at 95 L (free-surface width × L) | 0.439 L/mm | DERIVED |
| `dp/dV` at 95 L / 47.5 L / 28.5 L, 60 °C | 0.0195 / 0.0234 / 0.0271 kPa/L | DERIVED |
| Fixed 80 kg of oil, 40 → 100 °C | 2.555 → 2.523 kPa (−1.3 %) | DERIVED |

Resolution is worst at the top of the range: the free surface widens with
height, so each litre moves the column least where the gear case is full.

Temperature: a fixed **mass** occupies `V(T) = m / rho(T)`. In a
vertical-walled tank `p = m·g/A` would be temperature-invariant; in the
annulus it is not (−1.3 % over 40 → 100 °C above), which is the physical
reason the temperature compensation of the level channel exists
(`ai/anomaly.py` fits the empirical coefficient; the true `rho(T)` slope is
≈ −0.002 kPa/°C at 95 L).

Required transducer (DERIVED from `sim/physics.py:sensor_resolution_l`,
60 °C, uncertainty in litres):

| Cell | 95 L | 47.5 L | 28.5 L |
|---|---|---|---|
| 0–10 kPa, ±0.1 %FS | ±0.51 L | ±0.43 L | ±0.37 L |
| 0–10 kPa, ±0.25 %FS | ±1.28 L | ±1.07 L | ±0.92 L |
| 0–50 kPa, ±0.25 %FS | ±6.4 L | ±5.4 L | ±4.6 L |
| 0–1000 kPa, ±1.2 %FS (T2 narrative cell) | ±615 L | ±513 L | ±442 L |

The level channel needs a **0–5 to 0–10 kPa** cell with ≤ ±0.25 %FS to keep
the §4 gates (bias < 1 L) reachable; the demo pipeline models 0.1 %FS of a
0–10 kPa cell (white noise 0.01 kPa at rest, 0.04 kPa while moving). A 0–10
kPa cell also covers the brim (full annulus 10.4 kPa at 40 °C), but nominal
operation stays below 3 kPa.

Settling model (P14, ASSUMPTION): while the wheel turns, gears and walls lift
`V_holdup = 6 L · wheel_rpm / 91.97` out of the static pool (≈ 0.11 kPa less
pressure at full speed, observable as the moving-vs-rest offset); at stop the
oil drains back as `V_holdup · exp(−t/tau)` with `tau = 0.75 s · viscosity_proxy`
(nominal proxy 1.0 matches the stub `tau = 0.3·v + 0.45`). `sim/settling.py`
still recovers a tau that increases monotonically with the proxy
(`tests/test_generate.py::test_settling_tau_still_increases_with_viscosity_proxy`).
The rest detector confirms rest 3 s after stopping, so for nominal oil the
transient has decayed to < 2 % before level scoring starts.

Gear train (P15, ASSUMPTION; Fig. 95 shows one ring gear, item 24, so both
stages share Zr). Overall ratio `(1 + Zr/Zs_HS) · (1 + Zr/Zs_LS)`:

| Stage | Zs | Zp | Zr | Planets | Stage ratio |
|---|---|---|---|---|---|
| HS (shaft → HS carrier) | 16 | 38 | 92 | 3 | 6.750 |
| LS (LS sun item 33 → LS carrier item 25) | 24 | 34 | 92 | 4 | 4.833 |
| Total | | | | | 32.625 (error +0.015 % vs 32.62) |

Constraints enforced by `sim/geartrain.py:search_tooth_counts`: `Zr = Zs + 2·Zp`,
`(Zs + Zr)/N` integer, `Zs ≥ 13`, no planet-to-planet interference, total ratio
within 0.5 %. Shared-ring solutions exist (32 within 0.5 % for Zr = 40–140, N ∈ {3, 4});
the table row is the smallest ring with < 0.02 % error. 3000 rpm at the rotor
gives 91.95 rpm at the wheel (VERIFIED arithmetic 91.97).

```python
from sim.geometry import head_from_volume, dV_dh
from sim import physics
h = head_from_volume(95.0)
print(h, dV_dh(h), physics.pressure_kpa_from_volume(95.0, 60.0))
# 0.3049 m, 0.4388 L/mm, 2.610 kPa
```

## 3. Sensor-range spec (document-not-built; thesis annex level)

| Channel | Demo assumption | GAP finding | Thesis spec (no purchase) |
|---------|----------------|-------------|---------------------------|
| Pressure | 0–1000 kPa FS cell (T2 narrative) | FS dwarfs the §2 signal (≈ 1.1–2.7 kPa over 28.5–95 L): ±1.2 %FS = ±12 kPa error > signal (±615 L) | Low-range **0–5 / 0–10 kPa** cell, ≤ ±0.25 %FS (±0.5–1.3 L at 95 L, §2 table) for the level channel; keep a high-range cell only for abrupt-drop transient capture |
| Temperature | Type-K at magnetic plug | Type-K tolerances (±2.2 °C / ±0.75%) are fine for compensation but must be budgeted in `sigma_L` | Tolerance budget row in bench report; probe calibration certificate cited |
| Vibration | ADXL345/LIS3DH class MEMS | Bandwidth adequate for RMS/kurtosis features, but **85 °C max < 120 °C environment** | High-temp variant required for field; bench at ≈75 °C stays within rated range |
| Current | Split-core Hall clamp | Feasible, non-invasive | No change; operational-var context only |
| Edge compute | ESP32-S3 sampling over I2C/SPI + esp-dsp FFT note | Feasible; **no firmware written (non-scope)** | Thesis cites ESP32-S force; bench uses lab DAQ, not the MCU |
| Transport | MQTT plaintext mock | GAP vs production: TLS per-device (+40–50 KB heap, +37% CPU worst case) | Thesis annex states the TLS budget; demo keeps the plaintext mock labeled |
| Measurement integrity | Per-row HMAC-SHA256 in the synthetic edge mock; backend verifies before memory/Influx storage | VERIFIED (prototype implementation and tests); shared-key integrity/origin check only, not confidentiality. No firmware integration, secure key provisioning/storage/rotation, or persistent replay history; sub-precision changes may canonicalize identically | Keep prototype claim limited to signed-row integrity; production key lifecycle and transport security remain gaps |
| API/auth | `POST /ingest` has no HTTP caller authentication; CORS `*` remains local-demo configuration | GAP: row signatures do not authenticate HTTP clients or provide role controls | Pilot requires caller credentials, locked CORS, and role-based access |
| Cycle timing | FSM 29 s loop | 40× time-compressed demo vs real ≈20 min cycle | Documented in demo script; WAIT-as-moving is an explicit justified deviation (rest strictly LOAD/DUMP) |

## 4. Falsifier (kept from S7 — fusion refuted iff)

Fusion is REFUTED and the anomaly-only pivot stands iff, on weighed bench
data (`docs/calibration.md` §2 template), any of:

- bias ≥ 1 L at 95 L, or
- RMSE ≥ 2 L across 95 → 28.5 L, or
- leak-trend R² < 0.3 (same gate `ai/rul.py` enforces: `MIN_R2 = 0.30`).

These are the exact gates already implemented (`ai/rul.py:40-42`,
`ai/level.py:53`); the bench does not renegotiate them, it measures them.

## 5. Top-5 hardening list (thesis build order)

1. Run the drain-and-weigh bench (`docs/calibration.md` §1) and fill the §2
   template — replaces P9 proxy with measured `h(L)` + RMSE.
2. Fit β (P7) and the viscosity curve (P8) from weighed runs; re-anchor
   `sim/physics.py` priors with fitted values + confidence.
3. Spec the low-range pressure cell (§3) in the thesis annex; budget Type-K
   tolerance into `sigma_L`.
4. Close the GAP rows that affect the pilot safety case first (TLS budget,
   secure per-device key provisioning/storage/rotation, HTTP CORS/credentials,
   role-based access, high-temp MEMS variant) — design-level, no purchase.
5. Apply the §4 falsifier to bench data and record fusion proven / refuted;
   keep anomaly-only live either way.

## 6. Freshness / paywall notes

- Komatsu P2/P4 values re-checked against the public 930E-5 spec page and
  brochure PDF (October 2026; URLs in table). Public pages change without
  notice — re-verify at thesis build time and record the access date.
- P1/P5/P6 rest on paywalled vendor documents (shop manual, lubricant PDS
  set) held by the thesis author; no bench value in this repo depends on
  their exact wording, only the ranges cited. If a reviewer cannot access
  them, P2/P4 (public) plus the bench's own weighed data suffice to
  reproduce every claim.
- J306 grade limits are SAE-standard text; confirm against the edition cited
  in the thesis bibliography.

## 7. Manual sources + reconciled fluids table (fidelity update)

Manual names (user-supplied, authoritative over prior placeholders):

- GDY106 Fig.95 GEK-91680A longitudinal section: internals chain alternator AC
  motor → drive shaft → high-speed carrier → sun pinion GE1288 → low-speed
  carrier/planetaries → torque tube → wheel hub on inboard/outboard tapered
  roller bearings → tires; wet brakes + spring parking brake. Sensor items:
  pressure T at oil drain pipe plug item 56 (6 o'clock; TD930E-P recessed-tube
  improvement removes the 120 mm protrusion strike hazard), temperature at
  magnetic pipe plug item 41, vibration at sun inspection cover items 39/36,
  Hall clamp on traction power cable. Modified-cover oil transfer duct:
  low-gear splash → outer cavity → inside cover → through sun pinion interior
  → retainer/inner washer (arrow-to-pin alignment).
- 930E-4SE operation/maintenance set (dims/weights/fluids/powertrain/brakes/cab):
  15.29 × 8.89 × 8.10 m, body-up 14.80 m; empty 215308 kg (F104460/R110848),
  loaded 505611 kg (F165958/R339653), payload 290303 kg / 211 m³, max 320 T
  (10% 320–348 T allowed, never above 348 T); QSK78 3500 HP @1900 (3429
  flywheel; SSDA variant note); GTA-39 AC→DC→AC inverters/condensers; blower
  453 m³/min; cabinet PCS/PLM/AID/VHMS/IM; MT AC induction; retard grids 5400
  short/3300 cont hp 0.7 s; axle box + Hydrair II F12.92/R9.40 ±6.5°; brakes
  (service <8 km/h all wheels, rear lock low-pressure, spring parking rear
  stopped-only, emergency auto); cab (RSC turtle/rabbit + yellow switch,
  override, e-stop, hoist HOLD/FLOAT, VHMS snapshot+blue, red link, blue
  engine service, PLM fields); red-STOP vs amber-caution matrix; VHMS
  read-only. Inspection Steps 1–11 per `docs/inspection.md`.

Reconciled fluids (variants differ by compartment definition + usable vs nominal):

| Fluid | Variant A | Variant B | Adopted |
|-------|-----------|-----------|---------|
| Fuel | 5299 L (INCAEX) | 4542 L usable (OM) | 5299 nominal, 4542 usable footnote |
| Hydraulic | 1324 L | 1325 L | 1324/1325 footnote |
| Engine sump | 340 L QSK78 | 280 L SSDA16V160 | variant note |
| Propulsion gears | 94 L each | 76 L wheel gearbox (OM) | adopt 94 with OM compartment note |

Closeout pointer: S7 assumption outcome stays PARTIAL (logic proven on
synthetic-proxy, field accuracy pending bench); this annex is the bench-ready
anchor, not bench evidence.

## 7b. S2 truck scene: HD465 visual-proxy mesh (provenance + proxy note)

- The S2 3D truck view renders `frontend/public/models/komatsu_hd-465-7eo.glb`
  (≈20 MB, glTF 2.0, Sketchfab export by `drcrazzie`, embedded license string
  CC-BY-4.0 with source URL — reuse outside this repo NOT-CLEARED until the
  source page/terms are independently verified; full record in
  `docs/models.md`). The mesh is a **Komatsu HD465-7EO (~55 t class)** used as
  a **scale-adapted visual proxy**: longest horizontal extent scaled to the
  6.0-unit scene envelope that stands in for the 930E 15.29 m length
  (expected factor ≈ 0.64; runtime-measured value wins and is console-logged).
- **It is not a 930E and is never presented as one.** All spec content shown
  with the mesh — 15.29 × 8.89 × 8.10 m, body-up 14.80 m, weights, fluids
  (§7 table above), QSK78/GTA-39 powertrain, GDY106, 32.62:1, rotor ≈3000 RPM
  / wheel ≈92 RPM — is the 930E-4SE fidelity pack (`cycle.ts`, display-only),
  restated by the bilingual footnote in `TruckView.tsx` and the in-scene badge.
- Methodological consequence: the mesh carries **no measurement claim**. Bed
  articulation, wheel spin, and material tint are disabled/not-applied on the
  rigid proxy (documented fallbacks: level chassis, static wheels, overlay
  axle ring + light-shift tint); the FSM, zone highlights, RECAL gating, and
  camera presets are unchanged. No thesis figure may crop out the proxy
  footnote when reproducing this view.
