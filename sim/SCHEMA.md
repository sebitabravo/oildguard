# T6 Signal Schema (S3 — synthetic signals + store-forward mock)

Source of truth for CSV fields, rates, units, and scenario params.
Generator: `sim/generate.py`. Buffer mock: `sim/store_forward.py`.
TS mirror for T7/T8: `frontend/src/sim/signals.ts`.

## Rates

| Stream | Rate | Transport |
|---|---|---|
| Pressure / temperature + operational vars | 10 Hz (1 row / 100 ms) | CSV row, MQTT/InfluxDB in T8 |
| Vibration raw (triaxial MEMS, synthetic 1 kHz) | 1000 Hz on edge | NEVER transported |
| Vibration features (RMS + kurtosis per 100 ms) | 10 Hz (`vib_rms_g`, `vib_kurtosis`) | CSV row, forwarded |

Each 100 ms window synthesizes 100 samples of 1 kHz accel internally,
computes RMS + Pearson kurtosis (normal ≈ 3), then discards the raw
samples. Only the two features leave the edge.

## FSM alignment (mirrors `frontend/src/sim/truck/cycle.ts`)

Loop 29 s: LOAD 6 s → HAUL 12 s → DUMP 6 s → WAIT 5 s, then repeat.
`moving` = HAUL/WAIT (`isMovingState`). `recal_window` = LOAD/DUMP
stopped + leveled + engine-on (`isRecalState`). `engine_on` is always 1
in the demo loop. WAIT is the empty return drive (moving, recal gated).

## Fields

| Field | Unit | Notes |
|---|---|---|
| `t_iso` | ISO-8601 UTC | sample timestamp |
| `t_s` | s | elapsed, 0.1 steps |
| `seq` | — | row index, proofs restore order by this |
| `device_id` | — | e.g. `wheel-RH-01` |
| `fsm_state` | — | LOAD \| HAUL \| DUMP \| WAIT |
| `moving` | 0/1 | 1 in HAUL/WAIT |
| `recal_window` | 0/1 | 1 in LOAD/DUMP |
| `engine_on` | 0/1 | always 1 |
| `slope_deg` | deg | stopped ≈ 0 ± 0.3; moving synthetic grade |
| `rotor_rpm` | rpm | moving ≈ 2850 ± 80 (max 3000); stopped idle ≈ 120 |
| `wheel_rpm` | rpm | rotor / 32.62 (≈ 92 at full speed) |
| `rotating_sensor_regime` | — | `static_pool`, `slosh`, or `centrifugal_rimming`, classified by assumed Froude cutoffs; synthetic research feature, not calibrated sensor dynamics |
| `submerged_fraction_per_revolution` | fraction [0, 1] | Estimated wet fraction for an output-mounted sensor over one revolution, using the assumed research cavity and sensor radius; not a field measurement |
| `pressure_kpa` | kPa | observed bottom pressure `rho(T)·g·h(V)` from the gear-case geometry (`sim/geometry.py`): ≈ 2.6 at 95 L, nonlinear in level; range 0–5 kPa (0–10 kPa class transducer, noise 0.01 kPa at rest / 0.04 moving); moving rows read ≈ 0.11 kPa lower (hold-up) and recover after a stop with tau = 0.75 s · viscosity proxy |
| `temperature_c` | °C | observed; operating ≈ 75 + 0.8 moving |
| `vib_rms_g` | g | rest ≈ 0.35, moving ≈ 1.2 + impact transients |
| `vib_kurtosis` | — | ≈ 3 baseline; +2.5 for 1 s at abrupt-drop instant |
| `level_liters` | L | GROUND TRUTH (capacity 95) |
| `level_pct` | % | 100 × level / 95 |
| `link_down` | 0/1 | 1 = link down, row buffered not sent |
| `label` | — | normal \| slow-leak \| abrupt-drop \| sensor-drift \| link-outage-buffered |

HTTP mapping: `POST /ingest` accepts the complete `SignalRow` schema above.
The backend preserves both T10 fields, `rotating_sensor_regime` and
`submerged_fraction_per_revolution`, through HTTP and MQTT ingestion.

## Signed CSV rows

The default unsigned CSV keeps the header above unchanged. With
`sim/generate.py --sign`, the final two columns are `sig_v` and `sig`:
`sig_v` is `ogs1`; `sig` is the lowercase hexadecimal HMAC-SHA256 digest.
The signing key is read only from the local `OILGUARD_DEVICE_KEY` environment
variable and must never be committed.

The signature covers every schema field in header order, including ground-truth
columns, but excludes `sig_v` and `sig`. Version `ogs1` canonicalizes a compact
UTF-8 JSON array `["ogs1", ...values]` with no spaces and non-ASCII text left
unescaped. Float fields use fixed decimal places matching the generator:

| Field | Decimal places |
|---|---:|
| `t_s` | 1 |
| `slope_deg` | 2 |
| `rotor_rpm` | 1 |
| `wheel_rpm` | 2 |
| `submerged_fraction_per_revolution` | 4 |
| `pressure_kpa` | 3 |
| `temperature_c` | 2 |
| `vib_rms_g` | 3 |
| `vib_kurtosis` | 3 |
| `level_liters` | 4 |
| `level_pct` | 3 |

Integer values are normalized through `int(float(value))`; strings are encoded
as `str(value)`. The canonical field sequence is:

```text
t_iso, t_s, seq, device_id, fsm_state, moving, recal_window, engine_on,
slope_deg, rotor_rpm, wheel_rpm, rotating_sensor_regime,
submerged_fraction_per_revolution, pressure_kpa, temperature_c, vib_rms_g,
vib_kurtosis, level_liters, level_pct, link_down, label
```

Because signing quantizes values to the listed precision, a change smaller
than that field's precision can canonicalize to the same value and is not
detectable. This is an integrity feature for the synthetic prototype, not
confidentiality or a complete industrial security implementation.

## Scenario params (ground truth)

| Scenario | Truth | Observed effect |
|---|---|---|
| `clean` | level = 95 L | noise only, label `normal` |
| `slow-leak` | −0.5 %/h from t = 2 s (0.475 L/h; `--leak-pct-per-h` override) | pressure follows level down |
| `abrupt-drop` | −15 L step at t = seconds/2 (`--drop-liters`) | pressure step + kurtosis spike 1 s |
| `sensor-drift` | level stays 95 L | pressure +0.005 kPa/s, temp +0.02 °C/s from t = 2 s |
| `link-outage` | level stays 95 L, `link_down` = 1 on [0.4, 0.6] × seconds | values intact, flagged buffered |

Note: at the spec-true 0.5 %/h, a 30 s demo drops ≈ 0.004 L — invisible
by design. Long-horizon runs (hours) show the trend; use
`--leak-pct-per-h` only to accelerate visualization, never as the
reported rate.

## CLI

```bash
python3 sim/generate.py --scenario slow-leak --seconds 30 --out out.csv
python3 sim/generate.py --scenario clean --seconds 5 --out /tmp/t6-smoke.csv
DEVICE_KEY="$(python3 -c "import secrets; print(secrets.token_hex(32))")"
OILGUARD_DEVICE_KEY="$DEVICE_KEY" python3 sim/generate.py --sign --scenario clean --seconds 5 --out /tmp/signed.csv
python3 sim/store_forward.py --in out.csv --out flushed.csv
python3 sim/store_forward.py --in clean.csv --out flushed.csv --outage-from 2 --outage-to 3
```

## Example rows (`clean`, 5 s, seed 7)

```csv
t_iso,t_s,seq,device_id,fsm_state,moving,recal_window,engine_on,slope_deg,rotor_rpm,wheel_rpm,rotating_sensor_regime,submerged_fraction_per_revolution,pressure_kpa,temperature_c,vib_rms_g,vib_kurtosis,level_liters,level_pct,link_down,label
```

(`t_iso` base varies per run; all other values pin to `--seed 7`.)

## Demo log excerpts (real runs, 2026-10-09)

```text
$ python3 sim/generate.py --scenario slow-leak --seconds 30 --out out.csv
scenario=slow-leak rows=300 rate_hz=10 seconds=30.0 out=out.csv
first_state=LOAD last_state=LOAD labels=['normal', 'slow-leak']

$ python3 sim/generate.py --scenario link-outage --seconds 20 --out /tmp/t6-out.csv
scenario=link-outage rows=200 rate_hz=10 seconds=20.0 out=/tmp/t6-out.csv
first_state=LOAD last_state=DUMP labels=['link-outage-buffered', 'normal']

$ python3 sim/store_forward.py --in /tmp/t6-out.csv --out /tmp/t6-flushed.csv
in=/tmp/t6-out.csv out=/tmp/t6-flushed.csv total=200
sent_direct=160 queued=40 flushed=40 out_rows=200
OUTAGE BUFFERING PROOF: PASS (no rows lost, order restored by seq)
```

Slow-leak tail (truth creeps 95 → 94.9963 L over 30 s at the true rate);
abrupt-drop steps 95 → 80 L at mid-run; sensor-drift pressure climbs
≈ 2.58 → 2.69 kPa (30 s run) while truth holds 95 L — the T9 anomaly inputs.
