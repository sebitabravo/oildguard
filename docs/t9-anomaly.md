# T9 — Anomaly detection baseline / Isolation Forest (S5)

Statistical baseline (z-score on the rest-gated, temp-compensated
pressure residual) + opt-in IsolationForest. Code: `ai/anomaly.py`,
demo: `ai/run_demo.py`, flags: `ai/flags.jsonl`.
ML extras live in `ai/requirements.txt` so the backend image stays light
(`backend/requirements.txt` unchanged).

## Method

For each sample inside a T7 `rest` window (`sim/detect.py` output):

- `T_REF` = mean temperature of the baseline window,
  `beta` = least-squares slope of pressure on temperature there
  (0 when temperature variance is negligible, clipped to ±0.5),
- residual `r = p_obs − beta·(T_obs − T_REF)`,
- score `z = (r − mu) / sigma` (mu/sigma from the baseline window,
  sigma floored at 0.10 kPa, below the T6 rest noise of 0.15 kPa).

Flag when `|z| > 3.0` (configurable `--z-threshold`). Baseline = the
FIRST rest window in time order (the natural recalibration reference);
if it holds < 10 samples the baseline extends to the first 30 rest
samples — the choice is logged and stored in every flag. Moving samples
are gated out (counted, never flagged).

`--iforest` adds an IsolationForest second opinion on
`[residual, vib_rms_g, temperature_c]` fitted on the same baseline
samples (OR logic; per-flag `method` records which fired). Without
scikit-learn the run logs `WARN iforest fallback: sklearn-missing` and
scores with the baseline only.

## Run it

```bash
# full demo: clean + accelerated slow-leak + abrupt-drop
python3 ai/run_demo.py

# single-file mode (T9 verification step)
python3 sim/generate.py --scenario clean --seconds 120 --out /tmp/t9-clean.csv
python3 sim/run_t7.py --in /tmp/t9-clean.csv --out /tmp/t7-windows.csv
python3 ai/run_demo.py --in /tmp/t9-clean.csv --windows /tmp/t7-windows.csv

# scorer directly (+ optional IsolationForest)
python3 ai/anomaly.py --in /tmp/t9-clean.csv --windows /tmp/t7-windows.csv --out ai/flags.jsonl
python3 ai/anomaly.py --in IN.csv --windows WIN.csv --out OUT.jsonl --iforest  # needs ai/requirements.txt
```

## Lab-rate honesty note (per T6 risk)

At the spec-true 0.5 %/h a 30 s demo drops ≈ 0.004 L (≈ 0.004 kPa,
z ≈ 0.03) — invisible by design. The slow-leak demo below uses a
**LAB-ACCELERATED rate of 30 %/h (x60 vs the 0.5 %/h spec)** over
300 s, labeled everywhere it appears. It proves the detector logic,
not the field rate. Proof of invisibility at the true rate:

```text
$ python3 sim/generate.py --scenario slow-leak --seconds 300 --out /tmp/t9-spec-true.csv
scenario=slow-leak rows=3000 rate_hz=10 seconds=300.0 out=/tmp/t9-spec-true.csv
$ python3 ai/anomaly.py --in /tmp/t9-spec-true.csv --windows /tmp/t9-spec-windows.csv --out /tmp/t9-spec-flags.jsonl
rows=3000 rest=651 scored=620 gated_out=2349 train=31 flags=4
baseline first-rest-window id=1 n=31 mu=28.003kPa sigma=0.137kPa beta=0.0529kPa/C Tref=75.05C z_thr=3.0
  FLAG seq=614 t_s=61.4 z=-3.307 w=13 zone=LOAD scenario=slow-leak method=zscore
  FLAG seq=1370 t_s=137.0 z=3.281 w=28 zone=DUMP scenario=slow-leak method=zscore
  FLAG seq=2639 t_s=263.9 z=-3.408 w=55 zone=LOAD scenario=slow-leak method=zscore
  FLAG seq=2849 t_s=284.9 z=3.282 w=58 zone=DUMP scenario=slow-leak method=zscore
```

Truth drop over 300 s at 0.5 %/h is 0.039 L → 0.012 kPa (z ≈ 0.08):
the 4 flags have mixed signs with no trend — noise floor (≈ 620 ×
0.27 % ≈ 1.7 expected at |z| > 3), not a leak. An hour-scale run
(4 h at 0.5 %/h ≈ 1.9 L → 0.56 kPa → z ≈ 4) would flag; the
accelerated demo below is the practical equivalent.

## Demo log excerpts (real runs, 2026-10-09, seed 7)

```text
$ python3 ai/run_demo.py
T9_ANOMALY_DEMO z_thr=3.0 iforest=False
SPEC leak rate: 0.5 %/h (field truth; invisible in short demos)
--- clean (expect: no-flag)
    sig=/tmp/t9-clean.csv rows=1200 windows=26 rest=9 scored=228 flags=1
    baseline first-rest-window id=1 n=31 mu=28.003 sigma=0.137 beta=0.0527
    FLAG seq=614 t_s=61.4 z=-3.287 w=13 zone=LOAD scenario=normal
    NOTE: clean run flagged 1 (see FP note in docs/t9-anomaly.md)
--- slow-leak (expect: must-flag) [LAB-ACCELERATED leak 30.0 %/h x60 vs spec 0.5 %/h]
    sig=/tmp/t9-slow-leak.csv rows=3000 windows=63 rest=21 scored=620 flags=262
    baseline first-rest-window id=1 n=31 mu=27.997 sigma=0.136 beta=0.0523
    FLAG seq=510 t_s=51.0 z=-3.239 w=10 zone=DUMP scenario=slow-leak
    FLAG seq=614 t_s=61.4 z=-4.268 w=13 zone=LOAD scenario=slow-leak
    ... +257 more (see /tmp/t9-slow-leak-flags.jsonl)
--- abrupt-drop (expect: must-flag)
    sig=/tmp/t9-abrupt-drop.csv rows=1200 windows=26 rest=9 scored=228 flags=135
    baseline first-rest-window id=1 n=31 mu=28.003 sigma=0.137 beta=0.0527
    FLAG seq=609 t_s=60.9 z=-30.924 w=13 zone=LOAD scenario=abrupt-drop
    FLAG seq=610 t_s=61.0 z=-32.905 w=13 zone=LOAD scenario=abrupt-drop
    ... +130 more (see /tmp/t9-abrupt-drop-flags.jsonl)
SUMMARY precision-style (rest-gated samples; label = generator truth):
  clean        scored= 228 flags=   1 expect=no-flag
  slow-leak    scored= 620 flags= 262 expect=must-flag
  abrupt-drop  scored= 228 flags= 135 expect=must-flag
T9_DEMO_DONE PASS
```

```text
$ python3 ai/anomaly.py --in /tmp/t9-clean.csv --windows /tmp/t7-windows.csv --out ai/flags.jsonl --iforest
WARN iforest fallback: sklearn-missing; scoring with z-score baseline only
rows=1200 rest=259 scored=228 gated_out=941 train=31 flags=1
baseline first-rest-window id=1 n=31 mu=28.003kPa sigma=0.137kPa beta=0.0527kPa/C Tref=75.05C z_thr=3.0
iforest requested=True status=sklearn-missing
  FLAG seq=614 t_s=61.4 z=-3.287 w=13 zone=LOAD scenario=normal method=zscore
```

Precision-style reading (rest-gated samples; generator `label` = truth,
audit only): clean 1/228 flagged (FP, see note); slow-leak
LAB-ACCELERATED 262/620 flagged from t = 51 s (coherent negative
trend = TP); abrupt-drop 135/228 flagged from the first rest window
after the 15 L step (z ≈ −31, TP). The committed `ai/flags.jsonl`
(135 lines) is the abrupt-drop run — a true-positive example.

## FP note

The clean 120 s run flags 1 of 228 scored rest samples (z = −3.29).
That is the expected Gaussian tail at |z| > 3 (≈ 0.27 % two-sided;
228 × 0.27 % ≈ 0.6 expected) — not a detector bug. Raising the
threshold to 3.5 would suppress it but delay leak onset detection;
T10 keeps 3.0 and lets the N1–N4 ladder (persistence / 2-of-3-channel
confirmation) absorb single-sample FPs instead of hiding them in the
threshold.

## Auditable flag payload (one line of `ai/flags.jsonl`)

```json
{"ts": "2026-10-09T06:36:21.392351+00:00", "t_s": 60.9, "seq": 609,
 "device_id": "wheel-RH-01", "scenario": "abrupt-drop", "window_id": 13, "zone": "LOAD",
 "score": -30.924, "threshold": 3.0, "method": "zscore",
 "if_score": null, "iforest_status": "not-requested",
 "inputs": {"pressure_kpa": 23.775, "temperature_c": 74.95, "vib_rms_g": 0.32,
  "vib_kurtosis": 5.353, "residual_kpa": 23.7801, "baseline_mu_kpa": 28.003,
  "baseline_sigma_kpa": 0.1366, "temp_beta_kpa_per_c": 0.05274, "temp_ref_c": 75.047,
  "baseline_window_id": "1", "baseline_n": 31,
  "baseline_source": "first-rest-window id=1 n=31"},
 "reason": "|z|=30.92>3.0 (pressure-drop, rest-gated)"}
```

Every flag carries threshold + all inputs + baseline provenance +
window id + scenario label: nothing to trust blindly.

## Backend wiring (minimal, honest)

`GET /alerts` and `GET /rul` stay `NOT_IMPLEMENTED_YET` until T10 —
no code changed in `backend/`. T9 flags are file-based
(`ai/flags.jsonl`); the N1–N4 ladder + API wiring land in T10, which
will read this exact payload format. No silent alert path exists
before then.

## T10 contract

`ai/flags.jsonl` lines are the T10 input: `score`/`threshold` feed N1
trend persistence, `inputs.pressure_kpa` + `vib_kurtosis` feed the N2
2-of-3-channel confirmation, `window_id`/`zone` feed the N3
shift-window grouping. Regression/RUL must stay labeled
`synthetic-proxy` until S7 bench proof (same rule as T6/T7).
