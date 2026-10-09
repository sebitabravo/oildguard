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
| P9 | Demo pressure anchor 28 kPa @ 95 L | Pipeline constant | **SYNTHETIC-PROXY** (field-anchor pending h(L) bench) | `sim/generate.py:38`, `ai/level.py:48`; flagged at every surface — see §2 |
| P10 | 20-min stabilization per level step | Bench procedure step | ASSUMPTION (placeholder) | `docs/calibration.md` §1 — timer logged; bench may shorten/lengthen with degassing evidence |
| P11 | 980E-5 / GDY108-C 35.02:1 | Any 980E number | FUTURE WORK, no validation | User decision (binding); `sim/physics.py:FUTURE_RATIO_GDY108C` is an unvalidated constant, never consumed |
| P12 | Warning < 50% (47.5 L), critical < 30% (28.5 L) | Alert thresholds | VERIFIED (project spec, auditable) | `ai/level.py:50-51`, `ai/rul.py:36-37` |

## 2. Hydrostatic correction (why P9 is SYNTHETIC-PROXY)

Literature hydrostatics with the VERIFIED density prior:

```text
p = rho · g · h        rho ≈ 901 kg/m³, g = 9.81 m/s²
28 kPa @ 95 L  ⇒  h = 28000 / (901 × 9.81) ≈ 3.2 m   — ABSURD inside a wheel motor
realistic 0.3–0.5 m head  ⇒  ≈ 2.6–4.4 kPa
```

Reproduce: `python3 sim/physics.py` prints `absurdity_check()` (see
`sim/physics.py:absurdity_check`). A 3.2 m oil head cannot exist in a
decimetre-scale housing, so 28 kPa cannot be a hydrostatic head — it is a
pipeline gain kept running for the N1–N4 demo, relabeled
`SYNTHETIC-PROXY (field-anchor pending h(L) bench)` at every surface:

- code comments: `sim/generate.py` header, `ai/level.py` header/note;
- Dashboard: footnote under the level chart (one line);
- docs: `docs/calibration.md` anchors, `docs/feasibility.md` verdict, this annex.

Gains were deliberately NOT silently rescaled: rescaling without weighed oil
would trade a labeled proxy for an unlabeled one and break the N1–N4 demo
evidence (T9/T10/T11). The bench (§4 of `docs/calibration.md` template) must
measure the true `h(L)` mapping; only then does fusion get a field anchor.

## 3. Sensor-range spec (document-not-built; thesis annex level)

| Channel | Demo assumption | GAP finding | Thesis spec (no purchase) |
|---------|----------------|-------------|---------------------------|
| Pressure | 0–1000 kPa FS cell (T2 narrative) | FS dwarfs the §2 signal (2.6–4.4 kPa realistic head): Bosch ±1.2% FS = **±12 kPa error > signal** | Low-range 0–50 or 0–100 kPa cell for the level channel; keep a high-range cell only for abrupt-drop transient capture |
| Temperature | Type-K at magnetic plug | Type-K tolerances (±2.2 °C / ±0.75%) are fine for compensation but must be budgeted in `sigma_L` | Tolerance budget row in bench report; probe calibration certificate cited |
| Vibration | ADXL345/LIS3DH class MEMS | Bandwidth adequate for RMS/kurtosis features, but **85 °C max < 120 °C environment** | High-temp variant required for field; bench at ≈75 °C stays within rated range |
| Current | Split-core Hall clamp | Feasible, non-invasive | No change; operational-var context only |
| Edge compute | ESP32-S3 sampling over I2C/SPI + esp-dsp FFT note | Feasible; **no firmware written (non-scope)** | Thesis cites ESP32-S force; bench uses lab DAQ, not the MCU |
| Transport | MQTT plaintext mock | GAP vs production: TLS per-device (+40–50 KB heap, +37% CPU worst case) | Thesis annex states the TLS budget; demo keeps the plaintext mock labeled |
| API/auth | CORS `*` + hardcoded token | GAP, design-level only | Thesis states per-device credentials + locked CORS as pilot requirements |
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
   CORS/credentials, high-temp MEMS variant) — design-level, no purchase.
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
