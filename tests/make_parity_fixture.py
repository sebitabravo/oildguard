"""Genera tests/fixtures/physics_parity.json: valores de referencia de Python para el espejo TS.

Uso: ``python3 tests/make_parity_fixture.py``. Los tests de pytest y de bun
comparan contra este archivo, así que cualquier cambio de modelo exige
regenerarlo (y por lo tanto revisar el diff) en un solo lugar.
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, ROOT)

from sim import geartrain, physics  # noqa: E402
from sim.geometry import DEFAULT_GEAR_CASE, dV_dh, head_from_volume, volume_from_head  # noqa: E402

FIXTURE_PATH = os.path.join(ROOT, "tests", "fixtures", "physics_parity.json")

VOLUMES_L = [0.0, 1.0, 10.0, 28.5, 47.5, 70.0, 95.0, 130.0, 250.0, 400.0]
TEMPS_C = [40.0, 60.0, 80.0, 100.0]
HEADS_M = [0.0, 0.05, 0.2, 0.3, 0.38, 0.5, 0.9, 1.2]
ROTOR_RPM = [0.0, 120.0, 1500.0, 3000.0]
MASSES_KG = [60.0, 80.0, 90.0]


def build_fixture() -> dict:
    gc = DEFAULT_GEAR_CASE
    train = geartrain.GDY106_TRAIN
    return {
        "gear_case": {"r_out": gc.r_out, "r_in": gc.r_in, "length": gc.length},
        "train": {
            "hs": asdict(train.hs),
            "ls": asdict(train.ls),
            "ratio": train.ratio,
        },
        "heads": [
            {"volume_l": v, "head_m": head_from_volume(v, gc)} for v in VOLUMES_L
        ],
        "volumes": [
            {"head_m": h, "volume_l": volume_from_head(h, gc), "dv_dh_l_per_mm": dV_dh(h, gc)}
            for h in HEADS_M
        ],
        "pressures": [
            {
                "volume_l": v,
                "temp_c": t,
                "pressure_kpa": physics.pressure_kpa_from_volume(v, t, gc),
                "volume_back_l": physics.volume_from_pressure_kpa(
                    physics.pressure_kpa_from_volume(v, t, gc), t, gc
                ),
            }
            for v in VOLUMES_L
            for t in TEMPS_C
        ],
        "mass_pressures": [
            {"mass_kg": m, "temp_c": t, "pressure_kpa": physics.pressure_kpa_from_mass(m, t, gc)}
            for m in MASSES_KG
            for t in TEMPS_C
        ],
        "speeds": [
            {"rotor_rpm": r, **geartrain.stage_speeds(r)} for r in ROTOR_RPM
        ],
    }


def main() -> int:
    os.makedirs(os.path.dirname(FIXTURE_PATH), exist_ok=True)
    with open(FIXTURE_PATH, "w") as f:
        json.dump(build_fixture(), f, indent=1, sort_keys=True)
        f.write("\n")
    print(f"wrote {FIXTURE_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
