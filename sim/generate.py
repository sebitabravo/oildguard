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

Pressure model: ``p = rho(T) * g * h(V_pool)`` with the gear-case geometry of
``sim/geometry.py`` (ASSUMPTION until the bench measures h(L)); 95 L gives
~2.6 kPa, not the former 28 kPa pipeline gain (which implied a 3.2 m head).
While the wheel turns, a hold-up volume is lifted onto gears and walls
(``V_HOLDUP_MAX_L`` scaled by wheel speed), so the static pool and its
pressure drop; at stop it drains back with ``tau = SETTLE_TAU0_S * viscosity``
(the settling transient of the pre-proposal, section 3.1). Pressure noise is
sized for a 0-10 kPa class transducer. SYNTHETIC-PROXY until bench data.
See docs/thesis-annex.md section 2.

Stdlib only (no extra deps).
"""

from __future__ import annotations

import argparse
import csv
import math
import random
from datetime import datetime, timezone
from typing import Iterator

try:  # ejecución como paquete o como script (python3 sim/generate.py)
    from sim.geometry import DEFAULT_GEAR_CASE
    from sim.physics import (
        RESEARCH_ROTATING_CAVITY,
        pressure_kpa_from_volume,
        submerged_fraction_per_revolution,
        rotating_sensor_regime,
    )
except ImportError:  # pragma: no cover
    from geometry import DEFAULT_GEAR_CASE  # type: ignore
    from physics import (  # type: ignore
        RESEARCH_ROTATING_CAVITY,
        pressure_kpa_from_volume,
        submerged_fraction_per_revolution,
        rotating_sensor_regime,
    )

SAMPLE_RATE_HZ = 10
DT_S = 1.0 / SAMPLE_RATE_HZ
VIB_RAW_HZ = 1000
VIB_SAMPLES_PER_WINDOW = VIB_RAW_HZ // SAMPLE_RATE_HZ  # 100

CAPACITY_L = 95.0  # GDY106 nominal, SAE 85W-140
TEMP_NOMINAL_C = 75.0
GEAR_RATIO = 32.62  # rotor 3000 RPM -> wheel ~92 RPM
ROTOR_MAX_RPM = 3000.0
WHEEL_RPM_MAX = ROTOR_MAX_RPM / GEAR_RATIO
# ASSUMPTION: sensor face sits 10 mm inboard of the research cavity outer wall.
ROTATING_SENSOR_RADIUS_M = RESEARCH_ROTATING_CAVITY.r_out - 0.01

# ASSUMPTION: aceite elevado hacia engranajes y paredes a velocidad máxima de la rueda.
V_HOLDUP_MAX_L = 6.0
# Constante de vaciado con viscosidad nominal (proxy = 1.0); igual al tau nominal de settling.py.
SETTLE_TAU0_S = 0.75

LEAK_PCT_PER_H = 0.5  # spec default for slow-leak
ABRUPT_DROP_L = 15.0
# Transductor clase 0-10 kPa, +-0.1 %FS: ruido blanco de reposo 0.01 kPa (~0.5 L a 95 L).
# En marcha el chapoteo lo cuadruplica (misma proporción 4x que la escala previa).
PRESSURE_NOISE_REST_KPA = 0.01
PRESSURE_NOISE_MOVING_KPA = 0.04
# Misma deriva relativa que antes (~21 % de la lectura en 120 s) sobre la escala real de ~2.6 kPa.
DRIFT_KPA_PER_S = 0.005
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
    "rotating_sensor_regime",
    "submerged_fraction_per_revolution",
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


def holdup_volume_l(wheel_rpm: float) -> float:
    """Volumen retenido fuera de la piscina estática mientras la rueda gira (lineal en rpm)."""
    return V_HOLDUP_MAX_L * max(0.0, min(1.0, wheel_rpm / WHEEL_RPM_MAX))


def drained_holdup_l(v_at_stop_l: float, t_since_stop_s: float, tau_s: float) -> float:
    """Retorno exponencial del aceite retenido tras detenerse."""
    return v_at_stop_l * math.exp(-max(0.0, t_since_stop_s) / tau_s)


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
    viscosity_proxy: float = 1.0,
) -> Iterator[dict]:
    rng = random.Random(seed)
    n = int(round(seconds * SAMPLE_RATE_HZ))
    t0 = start or datetime.now(timezone.utc)
    leak_rate_lps = CAPACITY_L * (leak_pct_per_h / 100.0) / 3600.0
    leak_onset_s = 2.0
    drop_at_s = seconds * 0.5
    outage_from = seconds * 0.4
    outage_to = seconds * 0.6
    tau_s = SETTLE_TAU0_S * viscosity_proxy
    holdup_l = 0.0
    was_moving = False
    t_stop = 0.0
    holdup_at_stop = 0.0

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

        # --- hold-up: sube con la rueda en marcha y drena al detenerse ---
        if moving:
            holdup_l = holdup_volume_l(wheel)
        else:
            if was_moving:
                t_stop, holdup_at_stop = t_s, holdup_l
            holdup_l = drained_holdup_l(holdup_at_stop, t_s - t_stop, tau_s)
        was_moving = moving

        # Rotating-output sensor metadata is an ASSUMPTION-based synthetic
        # feature. Use pool volume after modeled hold-up; static level scoring
        # remains rest-gated downstream.
        pool_volume_l = max(0.0, level - holdup_l)
        sensor_regime = rotating_sensor_regime(wheel)
        submerged_fraction = submerged_fraction_per_revolution(
            pool_volume_l,
            ROTATING_SENSOR_RADIUS_M,
            wheel,
            RESEARCH_ROTATING_CAVITY,
        )

        # --- pressure / temperature (observed) ---
        p_noise = rng.gauss(0.0, PRESSURE_NOISE_MOVING_KPA if moving else PRESSURE_NOISE_REST_KPA)
        temp = TEMP_NOMINAL_C + (0.8 if moving else 0.0) + rng.gauss(0.0, 0.2)
        p_true = pressure_kpa_from_volume(max(0.0, level - holdup_l), temp, DEFAULT_GEAR_CASE)
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
            "rotating_sensor_regime": sensor_regime,
            "submerged_fraction_per_revolution": f"{submerged_fraction:.4f}",
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
    p.add_argument("--viscosity-proxy", type=float, default=1.0,
                   help="drain-back time scale of the held-up oil (1.0 = nominal 85W-140)")
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    if args.seconds <= 0:
        raise SystemExit("--seconds must be > 0")
    rows = list(iter_rows(args.scenario, args.seconds, args.device_id,
                          args.seed, args.leak_pct_per_h, args.drop_liters,
                          viscosity_proxy=args.viscosity_proxy))
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
