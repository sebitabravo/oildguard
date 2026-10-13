"""Exporta datos deterministas de demostración y constantes físicas de Python."""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sim.generate import iter_rows
from sim.geometry import DEFAULT_GEAR_CASE, EFFECTIVE_HEAD_TOL_M
from sim.geartrain import GDY106_TRAIN
from sim.physics import (
    BETA_RHO_PER_C,
    CAPACITY_L,
    G,
    GEAR_RATIO,
    RHO_REF,
    RHO_T_REF_C,
    RESEARCH_ROTATING_CAVITY,
    ROTATING_RIMMING_FROUDE_MIN,
    ROTATING_RPM_MAX,
    ROTATING_SAMPLES_DEFAULT,
    ROTATING_SAMPLES_MAX,
    ROTATING_SAMPLES_MIN,
    ROTATING_SLOSH_FROUDE_FACTOR,
    ROTATING_SLOSH_HEIGHT_CAP_FACTOR,
    ROTATING_STATIC_FROUDE_MAX,
)

DEMO_REFERENCE_MS = 1768478400000
DEMO_SEED = 930106
INGEST_SEED = 7
INGEST_START = datetime(2026, 1, 1, tzinfo=timezone.utc)
INGEST_TEMPLATE_SECONDS = 120.0
INGEST_TARGET_DROP_L = 4.0
DEFAULT_OUTPUT = Path(__file__).with_name("demo-data.json")


def _round_js(value: float, digits: int = 1) -> float:
    factor = 10**digits
    return math.floor(value * factor + 0.5) / factor


def _seeded(seed: int):
    value = seed & 0xFFFFFFFF

    def random() -> float:
        nonlocal value
        value = (value * 1664525 + 1013904223) & 0xFFFFFFFF
        return value / 4294967296

    return random


def _duty_cycle_temperature(index: int, count: int, offset: float, noise: float) -> float:
    cycles = max(2, math.floor(count / 7 + 0.5))
    phase = ((index / count) * cycles) % 1
    warm = lambda elapsed: 64 + 15 * (1 - math.exp(-elapsed / 0.18))
    value = warm(phase) if phase < 0.6 else 64 + (warm(0.6) - 64) * math.exp(-(phase - 0.6) / 0.22)
    return _round_js(value + offset + (noise - 0.5) * 2.4)


def _history_for(random, level: float, loss_rate: float, wheel_temperature: float) -> dict[str, list[dict[str, Any]]]:
    temperature_noise = _seeded(math.floor(level * 100 + 0.5) + math.floor(wheel_temperature * 10 + 0.5))
    temperature_offset = (wheel_temperature - 60) * 0.12
    windows = (("250h", 25, 250), ("7d", 21, 168), ("30d", 30, 720), ("90d", 36, 2160))
    result = {}
    for window, count, window_hours in windows:
        points = []
        for index in range(count):
            elapsed_hours = (index / (count - 1)) * window_hours
            baseline = min(95, level + (loss_rate * (window_hours - elapsed_hours)) / 100)
            refill = index == math.floor(count * 0.62)
            noisy_level = baseline + (2.4 if refill else 0) + (random() - 0.5) * 0.28
            is_gap = index in (math.floor(count * 0.28), math.floor(count * 0.76))
            point: dict[str, Any] = {
                "at": DEMO_REFERENCE_MS - ((count - 1 - index) * (window_hours / (count - 1)) * 60 * 60 * 1000),
                "liters": None if is_gap else _round_js(max(0, min(97, noisy_level))),
                "sigma": _round_js(0.35 + random() * 0.35),
                "temperatureC": None if is_gap else _duty_cycle_temperature(index, count, temperature_offset, temperature_noise()),
            }
            if refill:
                point["event"] = "refill"
            elif index == math.floor(count / 2):
                point["event"] = "inspection"
            elif index == count - 3:
                point["event"] = "alert"
            points.append(point)
        result[window] = points
    return result


def _demo_dataset() -> dict[str, Any]:
    random = _seeded(DEMO_SEED)
    states = ("nominal", "N1", "N2", "N4", "stale", "link-down")
    alerts = []
    trucks = []
    for truck_index in range(6):
        is_980 = truck_index == 5
        truck_id = f"OG-{truck_index + 1:02d}"
        wheels = []
        for wheel_index, position in enumerate(("LH", "RH")):
            state = "out-of-service" if is_980 else states[(truck_index + wheel_index) % len(states)]
            alert_level = state if state in ("N1", "N2", "N4") else None
            level_l = 95 if is_980 else _round_js(82 + random() * 12)
            loss_rate = _round_js(1.2 + random() * 2 if alert_level else random() * 0.3, 2)
            temperature = _round_js(48 + random() * 25)
            wheel_id = f"wheel-{position}-{truck_index + 1:02d}"
            last_comm = DEMO_REFERENCE_MS - 180_000 if state == "stale" else None if state == "link-down" else DEMO_REFERENCE_MS - 8_000
            wheel = {
                "id": wheel_id,
                "truckId": truck_id,
                "position": position,
                "model": "GDY108-C" if is_980 else "GDY106",
                "validated": not is_980,
                "levelL": level_l,
                "sigmaL": _round_js(0.8 + random() * 1.5),
                "pressureKpa": _round_js(2.1 + random() * 0.8, 2),
                "temperatureC": temperature,
                "vibRms": _round_js(0.18 + random() * 0.5, 2),
                "regime": "rest" if wheel_index == 0 else "movement",
                "validity": "stale" if state == "stale" else "estimate" if state == "link-down" else "invalid" if is_980 else "valid",
                "state": state,
                "alertLevel": alert_level,
                "lossRateLPer100h": loss_rate,
                "lastComm": last_comm,
                "history": _history_for(random, level_l, loss_rate, temperature),
            }
            if alert_level:
                recipient = "Reliability" if alert_level == "N1" else "Planning" if alert_level == "N2" else "Operator"
                alerts.append({
                    "id": f"alert-{wheel_id}",
                    "wheelId": wheel_id,
                    "level": alert_level,
                    "lifecycle": ("open", "acknowledged", "escalated", "closed")[truck_index % 4],
                    "recipient": recipient,
                    "channels": [
                        {"name": "pressure_drop", "state": "fired" if alert_level == "N1" else "quiet"},
                        {"name": "level_trend", "state": "fired"},
                        {"name": "vib_impact", "state": "fired" if alert_level == "N2" else "quiet"},
                        {"name": "temp_drift_veto", "state": "quiet"},
                    ],
                    "audit": [
                        {"actor": recipient, "action": "Alert created", "at": DEMO_REFERENCE_MS - 3_600_000},
                        {"actor": recipient, "action": "Review recorded", "at": DEMO_REFERENCE_MS - 1_800_000},
                    ],
                })
            wheels.append(wheel)
        trucks.append({
            "id": truck_id,
            "model": "980E-5" if is_980 else "930E-4SE",
            "state": wheels[0]["state"],
            "wheels": wheels,
        })
    wheels = [wheel for truck in trucks for wheel in truck["wheels"]]
    devices = [{
        "id": wheel["id"],
        "truckId": wheel["truckId"],
        "lastSeen": wheel["lastComm"],
        "signedRowRatio": 0.998 if wheel["validated"] else 0,
        "fw": "not reported" if wheel["validated"] else None,
        "cert": None,
        "state": "offline" if wheel["state"] == "link-down" else "buffering" if wheel["state"] == "stale" else "online",
    } for wheel in wheels]
    return {
        "referenceMs": DEMO_REFERENCE_MS,
        "trucks": trucks,
        "wheels": wheels,
        "alerts": alerts,
        "devices": devices,
        "outages": [{"deviceId": "wheel-RH-03", "start": DEMO_REFERENCE_MS - 900_000, "end": None}],
    }


def _physics() -> dict[str, Any]:
    constants = {
        "defaultGearCase": {"rOut": DEFAULT_GEAR_CASE.r_out, "rIn": DEFAULT_GEAR_CASE.r_in, "length": DEFAULT_GEAR_CASE.length},
        "researchRotatingCavity": {"rOut": RESEARCH_ROTATING_CAVITY.r_out, "rIn": RESEARCH_ROTATING_CAVITY.r_in, "length": RESEARCH_ROTATING_CAVITY.length},
        "rhoRef": RHO_REF,
        "rhoTRefC": RHO_T_REF_C,
        "betaRhoPerC": BETA_RHO_PER_C,
        "gravity": G,
        "capacityL": CAPACITY_L,
        "rotatingStaticFroudeMax": ROTATING_STATIC_FROUDE_MAX,
        "rotatingRimmingFroudeMin": ROTATING_RIMMING_FROUDE_MIN,
        "rotatingRpmMax": ROTATING_RPM_MAX,
        "sloshHeightCapFactor": ROTATING_SLOSH_HEIGHT_CAP_FACTOR,
        "sloshFroudeFactor": ROTATING_SLOSH_FROUDE_FACTOR,
        "rotatingSamplesDefault": ROTATING_SAMPLES_DEFAULT,
        "rotatingSamplesMin": ROTATING_SAMPLES_MIN,
        "rotatingSamplesMax": ROTATING_SAMPLES_MAX,
        "headToleranceM": EFFECTIVE_HEAD_TOL_M,
        "gdy106Train": {
            "hs": {"zs": GDY106_TRAIN.hs.zs, "zp": GDY106_TRAIN.hs.zp, "zr": GDY106_TRAIN.hs.zr, "planets": GDY106_TRAIN.hs.planets},
            "ls": {"zs": GDY106_TRAIN.ls.zs, "zp": GDY106_TRAIN.ls.zp, "zr": GDY106_TRAIN.ls.zr, "planets": GDY106_TRAIN.ls.planets},
        },
        "gearRatio": GEAR_RATIO,
    }
    sources = {
        "defaultGearCase": "sim/geometry.py:DEFAULT_GEAR_CASE",
        "researchRotatingCavity": "sim/physics.py:RESEARCH_ROTATING_CAVITY",
        "rhoRef": "sim/physics.py:RHO_REF",
        "rhoTRefC": "sim/physics.py:RHO_T_REF_C",
        "betaRhoPerC": "sim/physics.py:BETA_RHO_PER_C",
        "gravity": "sim/physics.py:G",
        "capacityL": "sim/physics.py:CAPACITY_L",
        "rotatingStaticFroudeMax": "sim/physics.py:ROTATING_STATIC_FROUDE_MAX",
        "rotatingRimmingFroudeMin": "sim/physics.py:ROTATING_RIMMING_FROUDE_MIN",
        "rotatingRpmMax": "sim/physics.py:ROTATING_RPM_MAX",
        "sloshHeightCapFactor": "sim/physics.py:ROTATING_SLOSH_HEIGHT_CAP_FACTOR",
        "sloshFroudeFactor": "sim/physics.py:ROTATING_SLOSH_FROUDE_FACTOR",
        "rotatingSamplesDefault": "sim/physics.py:ROTATING_SAMPLES_DEFAULT",
        "rotatingSamplesMin": "sim/physics.py:ROTATING_SAMPLES_MIN",
        "rotatingSamplesMax": "sim/physics.py:ROTATING_SAMPLES_MAX",
        "headToleranceM": "sim/geometry.py:EFFECTIVE_HEAD_TOL_M",
        "gdy106Train": "sim/geartrain.py:GDY106_TRAIN",
        "gearRatio": "sim/physics.py:GEAR_RATIO",
    }
    return {"constants": constants, "sources": sources}


def build_demo_payload() -> dict[str, Any]:
    leak_pct_per_h = (
        INGEST_TARGET_DROP_L / CAPACITY_L * 100.0 * 3600.0
        / max(1.0, INGEST_TEMPLATE_SECONDS - 2.0)
    )
    rows = list(iter_rows(
        "slow-leak",
        INGEST_TEMPLATE_SECONDS,
        "wheel-RH-01",
        INGEST_SEED,
        leak_pct_per_h=leak_pct_per_h,
        start=INGEST_START,
    ))
    return {
        "physics": _physics(),
        "demo": {**_demo_dataset(), "ingestRows": rows},
    }


def export_demo_json(output_path: str | Path = DEFAULT_OUTPUT) -> Path:
    """Escribe la exportación JSON canónica y devuelve su ruta."""
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(build_demo_payload(), allow_nan=False, sort_keys=True, indent=2) + "\n"
    target.write_text(serialized, encoding="utf-8", newline="\n")
    return target


if __name__ == "__main__":
    export_demo_json()
