# T10 — Level regression + RUL + N1–N4 ladder (S5)

Code: `ai/level.py`, `ai/rul.py`, `ai/ladder.py`, demo `ai/demo_leak.py`.
Backend: `GET /alerts` + `GET /rul` wired off the T9/T8 stubs (honest
fallbacks kept). Model label everywhere: **`synthetic-proxy` — NOT
proven until the S7 bench drain-and-weigh calibration.**

## Method

**Level regression** (`ai/level.py`): same rest-gated,
temperature-compensated residual as T9 (baseline = first rest window,
σ floored at 0.005 kPa), mapped through the nonlinear gear-case geometry:
`level = V(p_95L(T_ref) + residual − mu)` (`sim/physics.py:volume_from_pressure_kpa`). Anchoring on
the baseline mean makes each run self-recalibrating — the first rest
window reads 95 L by construction and only deviations move the estimate.
Cost, stated openly: a leak already present in the baseline reads high.
Moving samples are gated out (counted, never estimated). Confidence is a
baseline-precision property (`1 − σ_L/5`, typical T6 rest noise ≈ 0.46 L
→ ≈ 0.91), not per-sample luck.

**RUL** (`ai/rul.py`): least-squares slope of scored rest-gated level
estimates vs time → hours to warning (50%) and critical (30%), plus
haul-cycles (29 s loop) and 8 h shifts. **Lubrication/precision-gated:**
suppressed (hours null, `anomaly_only: true`, reason surfaced) when
n < 10 scored samples, baseline σ_L > 2.0 L, slope ≥ 0, or R² < 0.30.
Abrupt steps invalidate linear extrapolation — N4 fires instead of
rescaling RUL.

**Ladder** (`ai/ladder.py`): N1 trend/persistence entry (one window) →
N2 confirmed (2-of-3 channels {pressure-drop, level-trend, vib-impact},
same or consecutive windows) → N3 shift-window (RUL-to-warning < 8 h) →
N4 critical (level < 30%, window-to-window drop > 5 L, or extreme
z < −10 with kurtosis spike). Temperature is the **exclusion** channel:
temp drift with non-falling pressure is the T6 sensor-drift signature,
so it vetoes N2 (caps at N1 + anomaly-only) instead of confirming —
confirming on a temp rise would false-confirm drift as leak. S7 bench
may promote temp with real heat-transfer evidence. Every alert carries
thresholds + inputs + window + baseline provenance + the
`synthetic-proxy` label.

## Lab-rate honesty note

At the spec-true 0.5 %/h a 120 s demo drops ≈ 0.008 L — invisible by
design. The slow-leak stage auto-accelerates to drop ~4 L over the run
(120 s → **128.5 %/h, x257 vs spec**, labeled in every line it appears).
It proves the regression/RUL/ladder logic, not the field rate. The
invisibility proof at the true rate stands in `docs/t9-anomaly.md`.

## Demo log excerpts (real runs, 2026-10-09, seed 7)

```text
$ python3 ai/demo_leak.py --seconds 120
T10_RUL_LADDER_DEMO seed=7 seconds=120.0
SPEC leak rate: 0.5 %/h (field truth; invisible in short demos)
--- clean (expect: no-alert)
    rows=1200 rest=259 scored=228 sigma_L=0.4633 L conf=0.907 model=synthetic-proxy
    RUL SUPPRESSED: trend too weak (R2=0.002 < 0.3); anomaly-only
    (no alerts)
--- slow-leak (expect: N1+N2+N3) [LAB-ACCELERATED leak 128.5 %/h x257 vs spec 0.5 %/h; ~4.0 L over 120 s]
    rows=1200 rest=259 scored=228 sigma_L=0.4609 L conf=0.908 model=synthetic-proxy
    RUL slope=-124.7953 L/h R2=0.822 to-warning=0.35 h to-critical=0.5 h cycles=62.2 shifts=0.06 conf=0.822
    N1 N1-w02 t_s=52.9 zone=DUMP lvl=93.4321 L (98.35%) z_med=-3.402 :: N1 trend (persistence entry)
    N2 N2-w02 t_s=52.9 zone=DUMP lvl=93.4321 L (98.35%) z_med=-3.402 :: N2 confirmed leak: 2-of-3 channels same window 2
    N3 N3-w02 t_s=52.9 zone=DUMP lvl=93.4321 L (98.35%) z_med=-3.402 :: N3 shift-window: RUL-to-warning 0.35 h < 8.0 h shift
    RUL countdown (cumulative, LAB-ACCELERATED rate):
      t_s=  33.2 lvl= 93.90 L R2=0.05 -> no extrapolatable trend yet
      t_s=  52.6 lvl= 92.70 L R2=0.48 -> warn in   0.35 h (43 cycles, 0.04 shifts)
      t_s= 119.6 lvl= 90.67 L R2=0.82 -> warn in   0.35 h (43 cycles, 0.04 shifts)
--- abrupt-drop (expect: N4)
    RUL slope=-734.3637 L/h R2=0.713 to-warning=0.04 h to-critical=0.07 h cycles=8.7 shifts=0.01 conf=0.713
    N1 N1-w03 t_s=63.9 zone=LOAD lvl=79.9717 L (84.18%) z_med=-32.437 :: N1 trend (persistence entry)
    N2 N2-w03 t_s=63.9 zone=LOAD lvl=79.9717 L (84.18%) z_med=-32.437 :: N2 confirmed leak: 3-of-3 channels same window 3
    N3 N3-w03 t_s=63.9 zone=LOAD lvl=79.9717 L (84.18%) z_med=-32.437 :: N3 shift-window
    N4 N4-w03 t_s=63.9 zone=LOAD lvl=79.9717 L (84.18%) z_med=-32.437 :: N4 critical: abrupt window-to-window drop 95.0->80.0 L (>5.0 L)
WALK clean->slow-leak->abrupt-drop: N1->N2->N3->N4
T10_DEMO_DONE PASS
```

Backend smoke (TestClient, one store: 120 s LAB-accelerated slow-leak +
stitched abrupt-drop tail with shifted t_s/seq — audit labels show the
stitch; production path is continuous ingest):

```text
POST /ingest 200 1800 rows store= 1800
GET /alerts ok escalation= ['N1', 'N2', 'N3', 'N4']
  N1 N1-w02 t_s=52.9 lvl=93.3418 L z=-3.2115 :: N1 trend (persistence entry)
  N2 N2-w02 t_s=52.9 lvl=93.3418 L z=-3.2115 :: N2 confirmed leak: 2-of-3 channels same window 2
  N3 N3-w02 t_s=52.9 lvl=93.3418 L z=-3.2115 :: N3 shift-window: RUL-to-warning 0.11 h < 8.0 h shift
  N4 N4-w08 t_s=183.9 lvl=80.0694 L z=-28.917 :: N4 critical: abrupt window-to-window drop 91.1->80.1 L (>5.0 L)
GET /rul {'hours': 0.18, 'hours_to_warning': 0.11, 'haul_cycles': 22.1, 'shifts': 0.02, 'confidence': 0.927, 'status': 'ok'}
SMOKE PASS: store walk N1->N4 + RUL countdown served
```

Fallbacks (kept honest, verified): empty store → `alerts: []` + "no
rows ingested yet" note; clean-only store → no alerts + RUL
`suppressed` ("no leak trend … anomaly-only"); image without `ai/`
→ fallback note naming the rebuild instead of a 500.

## Backend wiring

`GET /alerts` → `status: ok`, `data: {alerts, escalation, ladder,
level, rul_status, model, note, fallback}`. `GET /rul` → `status: ok`,
`data: {hours, hours_to_warning, hours_to_critical, haul_cycles, shifts,
confidence, ...}` or the suppressed variant (nulls + reason +
`anomaly_only: true`). Both evaluate the memory store grouped by
`recal_window` runs (same contract as `GET /windows`). The image now
ships `ai/` (compose backend context = repo root; `COPY ai ./ai`) so
the import resolves under `compose up`; if it ever doesn't, the
endpoints return the fallback note, never a 500. `GET /level` keeps its
T8 echo + confidence stub (fused confidence rides the T10 payloads
above; T11 reads RUL/alerts directly).

## Auditable alert payload (abridged)

```json
{"alert_id": "N4-w03", "level": "N4", "severity": "critical", "t_s": 63.9,
 "window_id": 3, "zone": "LOAD",
 "channels": {"pressure_drop": true, "level_trend": true, "vib_impact": true,
              "temp_drift_veto": false},
 "inputs": {"z_med": -32.437, "level_med_L": 79.9717, "level_med_pct": 84.18,
            "kurt_max": 5.353, "trend_slope_L_per_h": -734.36,
            "rul_hours_to_warning": 0.04, "rul_status": "ok"},
 "thresholds": {"z_thr": 3.0, "warn_pct": 50.0, "crit_pct": 30.0,
                "abrupt_step_L": 5.0, "shift_h": 8.0},
 "baseline": "first-rest-window n=31", "model": "synthetic-proxy",
 "reason": "N4 critical: abrupt window-to-window drop 95.0->80.0 L (>5.0 L)"}
```

## S7 pointer

Fusion stays `synthetic-proxy` until bench drain-and-weigh proves the
pressure→level correlation with quantified error. If refuted, the pivot
is already staged: RUL suppresses to anomaly-only and N1/N2/N4 keep
firing on residuals — the anomaly-only product survives without the
fusion claim.
