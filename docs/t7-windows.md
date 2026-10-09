# T7 — Move/rest detector + settling/viscosity extractor (S3)

Rules only, no ML. `sim/detect.py` consumes live stillness (derived speed,
slope, engine flag) — never the FSM zone name. `sim/settling.py` fits a
damped-sine tau from the pressure RMS envelope on each move→rest edge and
emits `settling_ms` + a `dilute / normal / degraded` proxy label.
`sim/run_t7.py` ties both; the TS mirror (`RestWindow`, `isRestWindow`,
threshold constants) lives in `frontend/src/sim/signals.ts` for the T11 HUD.

## Run it

```bash
python3 sim/generate.py --scenario clean --seconds 120 --out /tmp/t7-clean.csv
python3 sim/run_t7.py --in /tmp/t7-clean.csv --out /tmp/t7-windows.csv
# windows -> /tmp/t7-windows.csv, settling -> /tmp/t7-windows-settling.csv
```

## Rule

Rest = speed < 0.5 m/s + |slope| < 2 deg + engine-on, held 3 s
(30 samples at 10 Hz). Moving = everything else: rest entry is confirmed
late (window opens ~3 s after the truck stops), rest exit is immediate.
Speed is derived as `wheel_rpm * 0.05` — a documented synthetic scale
(T6 emits no speed column); stopped idle (~0.19 m/s) clears the gate with
margin while haul rumble (~4.4 m/s) never does. T8+ may swap in
GPS/odometry without changing the rule.

## Window log excerpt (clean 120 s, real run)

```text
in=/tmp/t7-clean.csv out=/tmp/t7-windows.csv samples=1200 windows=26 rest=9 moving=17
FSM_AGREEMENT raw=0.782 steady_state=1.000 (steady excludes 3 s entry transient; WAIT=moving is CORRECT per T4/T5)
  w0 moving    0.0..2.8    zone=LOAD reason=entry-transient (<3s stillness, unconfirmed)
  w1 rest      2.9..5.9    zone=LOAD reason=speed<0.5+leveled+engine-on 3s
  w2 moving    6.0..17.9   zone=HAUL reason=slope>=2degx69+speed>=0.5x51
  w3 moving   18.0..20.8   zone=DUMP reason=entry-transient (<3s stillness, unconfirmed)
  w4 rest     20.9..23.9   zone=DUMP reason=speed<0.5+leveled+engine-on 3s
```

## FSM match proof (clean 5 min / 300 s, real run)

```text
samples=3000 windows=63 rest=21 moving=42
FSM_AGREEMENT raw=0.797 steady_state=1.000
zone x state: LOAD moving=11 rest=11 | HAUL moving=11 rest=0
              DUMP moving=10 rest=10 | WAIT moving=10 rest=0
```

Rest windows fall strictly inside LOAD/DUMP; HAUL/WAIT are 100 % moving.
The `moving` rows inside LOAD/DUMP are the 3 s entry transients
(stillness not yet confirmed — by design, excluded from steady_state).
The `zone` column is a majority-vote audit label; the rule never reads it.

## Honesty notes

- WAIT is honestly moving: it doubles as the empty return drive (T4/T5
  decision). Claiming rest on a rolling truck would be the dishonest
  option; the detector reports WAIT windows as moving with reason
  `speed>=0.5`.
- The raw 0.78–0.80 agreement is the confirmation delay, not error:
  each 6 s stop contributes ~3 s of unconfirmed entry transient.
- Settling scale is synthetic until S7 bench data: T6 emits no transient,
  so `--viscosity-proxy` (default 1.0 = nominal 85W-140) superimposes the
  T3 damped-sine stub, then fits tau back. Every settling row records its
  `injected_proxy` (0 = raw fit). With `--viscosity-proxy 0` on T6 data
  all edges honestly non-detect (tau = 0, low amplitude).
- Fit: RMS envelope in 0.5 s bins (= 5 samples at 10 Hz, ≈ 1 wobble
  period so phase ripple averages out), floor F fixed from the span tail,
  grid-search tau on `env² = A²·exp(-2t/tau) + F²` in linear space (no
  log/Jensen bias, no head-gate selection bias). Demo stops are only 3 s
  after confirmation, so per-edge tau jitters ±30–50 % — means are the
  signal. T9+ consumers must gate on `r_squared` + `amplitude_kpa`, never
  the label alone.

## Settling monotonicity (clean 120 s, 9 edges, real run)

| injected proxy | mean tau_s | mean settling_ms | detected |
|---|---|---|---|
| 0.5 (dilute stub) | 0.547 | 1652 | 8/9 |
| 1.0 (nominal stub) | 0.614 | 1878 | 8/9 |
| 2.0 (degraded stub) | 1.381 | 3995 | 8/9 |

Direction holds (higher proxy → larger tau → slower settling); absolute
ms is synthetic. The 9th edge misses because the file ends mid-window
(span < 2 s) — an honest truncation, not a fit failure. dilute/nominal
separation is modest on 3 s demo spans; degraded separates clearly.

## T11 contract

`RestWindow` rows (CSV or the TS interface) carry `state`, `start/end_t_s`,
`zone` (audit only) and `reason`. The HUD needs one call: `isRestWindow(w)`.
Thresholds are exported as `DETECTOR_*` constants mirrored from
`sim/detect.py`. Settling rows carry `settling_ms`, `viscosity_label`,
`amplitude_kpa`, `r_squared`, `injected_proxy` for the oil-condition panel.
