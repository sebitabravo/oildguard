"""T6 synthetic signal generator (S3 slice).

Emits timestamped 10 Hz pressure/temperature + operational vars plus 1 kHz
vibration features decimated on-edge (RMS/kurtosis per 100 ms window).
Raw 1 kHz samples are NEVER written; only per-window features are transported.

FSM zones/durations mirror ``frontend/src/sim/truck/cycle.ts``:
LOAD 6 s -> HAUL 12 s -> DUMP 6 s -> WAIT 5 s (29 s loop).
Recal gating (stopped + leveled + engine-on = LOAD/DUMP) matches
``isRecalState``; moving (HAUL/WAIT) matches ``isMovingState``.

Column names reuse ``backend/main.py`` IngestPayload where overlapping
(device_id, pressure_kpa, temperature_c, vibration RMS) so the T8
MQTT -> FastAPI -> InfluxDB path can consume this CSV directly.

Scenarios: clean | slow-leak (0.5 %/h default) | abrupt-drop |
sensor-drift | link-outage. Ground truth travels in level_liters /
level_pct / label / link_down columns. See sim/SCHEMA.md.

SYNTHETIC-PROXY (field-anchor pending h(L) bench): PRESSURE_AT_FULL_KPA =
28.0 kPa at 95 L is a pipeline gain, NOT a hydrostatic head — 28 kPa would
imply a ~3.2 m oil head (absurd; realistic 0.3-0.5 m gives ~2.6-4.4 kPa).
Kept running unchanged for the N1-N4 demo; bench-ready literature priors
live in sim/physics.py. See docs/thesis-annex.md §2 (930E/GDY106 scope).

Stdlib only (no extra deps).
"""

from __future__ import annotations

import argparse
import csv
import math
import random
from datetime import datetime, timezone
from typing import Iterator

SAMPLE_RATE_HZ = 10
DT_S = 1.0 / SAMPLE_RATE_HZ
VIB_RAW_HZ = 1000
VIB_SAMPLES_PER_WINDOW = VIB_RAW_HZ // SAMPLE_RATE_HZ  # 100

CAPACITY_L = 95.0  # GDY106 nominal, SAE 85W-140
PRESSURE_AT_FULL_KPA = 28.0  # synthetic rest pressure at 95 L
TEMP_NOMINAL_C = 75.0
GEAR_RATIO = 32.62  # rotor 3000 RPM -> wheel ~92 RPM
ROTOR_MAX_RPM = 3000.0

LEAK_PCT_PER_H = 0.5  # spec default for slow-leak
ABRUPT_DROP_L = 15.0
DRIFT_KPA_PER_S = 0.05
DRIFT_C_PER_S = 0.02

# FSM durations (s), mirrors HAUL_DURATIONS in cycle.ts.
FSM_ORDER = ("LOAD", "HAUL", "DUMP", "WAIT")
FSM_DURATIONS = {"LOAD": 6.0, "HAUL": 12.0, "DUMP": 6.0, "WAIT": 5.0}
CYCLE_TOTAL = sum(FSM_DURATIONS.values())  # 29 s

HEADER = [
    "t_iso",
    "t_s",
    "seq",
    "device_id",
    "fsm_state",
    "moving",
    "recal_window",
    "engine_on",
    "slope_deg",
    "rotor_rpm",
    "wheel_rpm",
    "pressure_kpa",
    "temperature_c",
    "vib_rms_g",
    "vib_kurtosis",
    "level_liters",
    "level_pct",
    "link_down",
    "label",
]


def fsm_state_at(elapsed: float) -> str:
    """Phase for an elapsed clock; loops every 29 s (mirrors stateAt)."""
    t_cycle = elapsed % CYCLE_TOTAL
    acc = 0.0
    for s in FSM_ORDER:
        acc += FSM_DURATIONS[s]
        if t_cycle < acc:
            return s
    return "LOAD"


def is_moving_state(state: str) -> bool:
    return state in ("HAUL", "WAIT")


def is_recal_state(state: str) -> bool:
    return state in ("LOAD", "DUMP")


def _vib_window_features(moving: bool, rng: random.Random) -> tuple[float, float]:
    """Synthesize 100 samples of 1 kHz accel, return (RMS, kurtosis).

    Rest: low broadband (~0.35 g RMS, kurtosis ~3). Moving: haul rumble
    (~1.2 g RMS, kurtosis ~3.5 with occasional impacts). Raw samples are
    discarded; only the two features leave the edge.
    """
    sigma = 1.15 if moving else 0.33
    base = 0.6 if moving else 0.0
    xs = []
    for i in range(VIB_SAMPLES_PER_WINDOW):
        v = base * math.sin(2.0 * math.pi * 47.0 * i / VIB_RAW_HZ)
        v += rng.gauss(0.0, sigma)
        if moving and rng.random() < 0.02:
            v += rng.gauss(0.0, 2.0)  # rock-impact transient
        xs.append(v)
    mean = sum(xs) / len(xs)
    m2 = sum((x - mean) ** 2 for x in xs) / len(xs)
    m4 = sum((x - mean) ** 4 for x in xs) / len(xs)
    rms = math.sqrt(sum(x * x for x in xs) / len(xs))
    kurt = (m4 / (m2 * m2)) if m2 > 1e-9 else 3.0
    return rms, kurt


def iter_rows(
    scenario: str,
    seconds: float,
    device_id: str,
    seed: int,
    leak_pct_per_h: float = LEAK_PCT_PER_H,
    drop_liters: float = ABRUPT_DROP_L,
    start: datetime | None = None,
) -> Iterator[dict]:
    rng = random.Random(seed)
    n = int(round(seconds * SAMPLE_RATE_HZ))
    t0 = start or datetime.now(timezone.utc)
    leak_rate_lps = CAPACITY_L * (leak_pct_per_h / 100.0) / 3600.0
    leak_onset_s = 2.0
    drop_at_s = seconds * 0.5
    outage_from = seconds * 0.4
    outage_to = seconds * 0.6

    for i in range(n):
        t_s = i * DT_S
        state = fsm_state_at(t_s)
        moving = is_moving_state(state)
        recal = is_recal_state(state)
        engine_on = 1  # demo loop keeps engine on (matches cycle.ts note)

        # --- ground-truth level ---
        if scenario == "slow-leak":
            active = t_s >= leak_onset_s
            level = CAPACITY_L - (leak_rate_lps * max(0.0, t_s - leak_onset_s) if active else 0.0)
            label = "slow-leak" if active else "normal"
        elif scenario == "abrupt-drop":
            dropped = t_s >= drop_at_s
            level = CAPACITY_L - (drop_liters if dropped else 0.0)
            label = "abrupt-drop" if dropped else "normal"
        elif scenario == "sensor-drift":
            level = CAPACITY_L
            label = "sensor-drift" if t_s >= leak_onset_s else "normal"
        elif scenario == "link-outage":
            level = CAPACITY_L
            label = "link-outage-buffered" if outage_from <= t_s < outage_to else "normal"
        else:  # clean
            level = CAPACITY_L
            label = "normal"
        level_pct = 100.0 * level / CAPACITY_L

        # --- operational vars ---
        if moving:
            rotor = min(ROTOR_MAX_RPM, max(0.0, rng.gauss(2850.0, 80.0)))
            slope = 4.0 * math.sin(2.0 * math.pi * t_s / 18.0) + rng.gauss(0.0, 0.8)
        else:
            rotor = max(0.0, rng.gauss(120.0, 25.0))
            slope = rng.gauss(0.0, 0.25)  # leveled pad: |slope| < ~1 deg
        wheel = rotor / GEAR_RATIO

        # --- pressure / temperature (observed) ---
        p_true = PRESSURE_AT_FULL_KPA * (level / CAPACITY_L)
        p_true += -0.03 * (TEMP_NOMINAL_C - 75.0)  # placeholder temp coeff
        p_noise = rng.gauss(0.0, 0.6 if moving else 0.15)
        temp = TEMP_NOMINAL_C + (0.8 if moving else 0.0) + rng.gauss(0.0, 0.2)
        if scenario == "sensor-drift" and t_s >= leak_onset_s:
            drift_t = t_s - leak_onset_s
            p_obs = p_true + p_noise + DRIFT_KPA_PER_S * drift_t
            t_obs = temp + DRIFT_C_PER_S * drift_t
        else:
            p_obs, t_obs = p_true + p_noise, temp

        # --- vibration features (decimated, raw 1 kHz discarded) ---
        vib_rms, vib_kurt = _vib_window_features(moving, rng)
        if scenario == "abrupt-drop" and drop_at_s <= t_s < drop_at_s + 1.0:
            vib_kurt += 2.5  # impact transient at the drop instant

        link_down = 1 if (scenario == "link-outage" and outage_from <= t_s < outage_to) else 0

        yield {
            "t_iso": (t0.timestamp() + t_s) and datetime.fromtimestamp(
                t0.timestamp() + t_s, tz=timezone.utc
            ).isoformat(),
            "t_s": f"{t_s:.1f}",
            "seq": i,
            "device_id": device_id,
            "fsm_state": state,
            "moving": int(moving),
            "recal_window": int(recal),
            "engine_on": engine_on,
            "slope_deg": f"{slope:.2f}",
            "rotor_rpm": f"{rotor:.1f}",
            "wheel_rpm": f"{wheel:.2f}",
            "pressure_kpa": f"{p_obs:.3f}",
            "temperature_c": f"{t_obs:.2f}",
            "vib_rms_g": f"{vib_rms:.3f}",
            "vib_kurtosis": f"{vib_kurt:.3f}",
            "level_liters": f"{level:.4f}",
            "level_pct": f"{level_pct:.3f}",
            "link_down": link_down,
            "label": label,
        }


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="T6 synthetic signal generator (10 Hz CSV).")
    p.add_argument("--scenario", default="clean",
                   choices=["clean", "slow-leak", "abrupt-drop", "sensor-drift", "link-outage"])
    p.add_argument("--seconds", type=float, default=30.0)
    p.add_argument("--out", required=True)
    p.add_argument("--device-id", default="wheel-RH-01")
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--leak-pct-per-h", type=float, default=LEAK_PCT_PER_H,
                   help="slow-leak rate in %%/h (spec default 0.5)")
    p.add_argument("--drop-liters", type=float, default=ABRUPT_DROP_L)
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    if args.seconds <= 0:
        raise SystemExit("--seconds must be > 0")
    rows = list(iter_rows(args.scenario, args.seconds, args.device_id,
                          args.seed, args.leak_pct_per_h, args.drop_liters))
    with open(args.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HEADER)
        w.writeheader()
        w.writerows(rows)
    print(f"scenario={args.scenario} rows={len(rows)} rate_hz={SAMPLE_RATE_HZ} "
          f"seconds={args.seconds} out={args.out}")
    print(f"first_state={rows[0]['fsm_state']} last_state={rows[-1]['fsm_state']} "
          f"labels={sorted(set(r['label'] for r in rows))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
