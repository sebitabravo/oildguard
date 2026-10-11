# T12 — Bench drain-and-weigh calibration procedure + result (S7)

Status: procedure documented, correlation template provided, **no physical bench ran in this slice**.
Fusion verdict on available evidence: **PARTIAL** — synthetic-proxy logic proven, field-rate + bench correlation PENDING.
Anomaly-only + precise rest readings viable NOW. Do NOT read this doc as proven field accuracy.

Physics anchors (non-negotiable, 930E/GDY106 32.62:1 scope ONLY — 980E-5
GDY108-C 35.02:1 stays future work without validation): 95 L SAE 85W-140
per GDY106 wheel motor; the pipeline pressure `rho(T)·g·h(V)` (≈ 2.6 kPa
at 95 L, ASSUMED gear-case geometry in `sim/geometry.py`) is SYNTHETIC-PROXY
until this bench measures the true h(L) (the former 28 kPa gain implied an
absurd ~3.2 m head; see `docs/thesis-annex.md` §2); warning < 50% (47.5 L), critical < 30%
(28.5 L); rest-gating stopped + leveled + engine-on.

## 1. Procedure (drain-and-weigh)

Bench: GDY106 wheel-motor housing (or equivalent volume rig) on level stand,
no-drill mounts only — pressure at drain plug via T-adapter, temp
thermocouple K at magnetic plug, triaxial MEMS on sun-pinion cover (epoxy),
Hall current clamp. Environment note: 120 °C + EMI shielding required for
field; bench at operating temp ≈ 75 °C (T6 reference).

Steps:

1. Fill to 95.0 L (weighed, ±0.1 L scale). Record ambient + oil temp.
2. Stabilize **20 min** after every fill/drain step (85W-140 degassing +
   thermal equilibration + settling; timer logged, no readings before it lapses).
3. Confirm rest gate before every reading: stopped (speed < 0.5 m/s) +
   |slope| < 2 deg + engine-on equivalent (circulation on, no rotation),
   held 3 s per `sim/detect.py` rule. Log window id + reason.
4. Record 60 s of 10 Hz pressure/temp + vibration features per level step
   (≥ 600 samples; rest-gated subset scored).
5. Drain-and-weigh in steps: 95 → 90 → 80 → 70 → 47.5 (50% warn) → 28.5
   (30% crit). Weigh drained oil each step; reconciled volume = truth.
6. Repeats: **3 full runs** (drain-down + refill-up at least once to catch
   hysteresis); each level step ≥ 3 rest windows.
7. Repeat step 2–4 after refill to 95 L (baseline-anchor check: first rest
   window anchors 95 L by construction in `ai/level.py` — a leak present at
   baseline reads high, so baseline provenance is recorded every run).
8. Sensor-drift control: one run with temp ramp at constant 95 L (T6
   sensor-drift signature) to confirm the temp-exclusion veto, not a leak flag.

## 2. Correlation template (fused signal vs weighed volume)

One row per rest window. Fill on bench day; this slice leaves truth columns
empty (no physical bench ran).

| run | window_id | weighed_L | fused_L (`ai/level.py`) | err_L (fused − weighed) | err_pct | pressure_kpa (med) | temp_C (med) | vib_rms/kurt | baseline_src | gate_pass |
|-----|-----------|-----------|-------------------------|-------------------------|---------|--------------------|--------------|--------------|--------------|-----------|
| 1   | —         | —         | —                       | —                       | —       | —                  | —            | —            | —            | —         |
| …   | —         | —         | —                       | —                       | —       | —                  | —            | —            | —            | —         |

Analysis per level step: mean err (bias), RMSE, ±2σ band; scatter fused vs
weighed with y=x + confidence band; report `sigma_L` (baseline precision,
typical synthetic ≈ 0.46 L → conf ≈ 0.91) alongside bench RMSE. Bench
criteria (not runtime gates): bias < 1 L at 95 L, RMSE < 2 L across
95→28.5 L, R² ≥ 0.3 on the leak trend (only the R² criterion matches the
implemented `ai/rul.py` gate).
If unmet → pivot stands (see §3), no threshold tuning to hide it.

Falsifier status: NOT EVALUATED on physical bench data; synthetic diagnostic reported separately. Of the three disputed statistical gates, only MIN_R2 is implemented; bias and RMSE gates are NOT IMPLEMENTED, not passed. Other real runtime gates elsewhere may still be cited.

## 3. Honest result on available evidence (no bench ran)

| Claim | Evidence | Status |
|-------|----------|--------|
| Rest-gated detector works on synthetic haul cycle | `docs/t7-windows.md`: clean 300 s, steady-state FSM agreement 1.000; rest strictly in LOAD/DUMP, HAUL/WAIT 100% moving | PROVEN (synthetic) |
| Anomaly flags leaks, clean stays quiet | `docs/t9-anomaly.md`: clean 1/228 FP (expected Gaussian tail); LAB-accelerated slow-leak 262/620 TP from t=51 s; abrupt-drop 135/228, z≈−31 | PROVEN (synthetic-proxy logic) |
| Spec-true 0.5 %/h invisible in short demos | T9: 300 s at 0.5 %/h → 0.039 L → z≈0.08, 4 mixed-sign noise flags only | PROVEN (invisibility by design) |
| Regression/RUL/ladder walk N1→N4 | `docs/t10-rul-ladder.md`: clean suppressed anomaly-only; LAB 128.5 %/h walk N1→N2→N3→N4 with RUL countdown; backend smoke escalation N1–N4 | PROVEN (synthetic-proxy logic) |
| Settling tau tracks viscosity direction | T7: mean tau 1652/1878/3995 ms at proxy 0.5/1.0/2.0 (monotonic; absolute ms synthetic) | PROVEN direction only |
| Fused pressure→level accurate in field | No weighed oil, no field rate, no 120 °C/EMI run | **PENDING — NOT CLAIMED** |

Verdict: **fusion PARTIAL.** The pipeline from rest-gating → residual →
level → RUL → N1–N4 is proven as logic on synthetic-proxy data with all
rates labeled (x60 T9, x257 T10). Field accuracy (rate 0.5 %/h, anchor
gear-case geometry h(L), temp beta, vibration channels) is UNPROVEN until this
procedure runs with weighed oil. The staged pivot is already implemented:
RUL suppresses to anomaly-only when n<10, σ_L>2 L, slope≥0, or R²<0.3, and
N1/N2/N4 keep firing on residuals (`docs/t10-rul-ladder.md` S7 pointer).

Recommendation: run the §1 bench before any field-accuracy claim; ship
anomaly-only + precise rest readings first, promote fusion only on bench RMSE.
