"""Genera tests/fixtures/generator_golden.json: filas de referencia del generador Python.

Uso: ``python3 tests/make_generator_golden.py``. El simulador de borde en Rust
debe reproducir estas filas carácter por carácter (mismo Mersenne Twister,
mismo formato por campo); cualquier cambio del generador exige regenerar el
fixture y revisar el diff.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, ROOT)

from sim.generate import HEADER, iter_rows  # noqa: E402

FIXTURE_PATH = os.path.join(ROOT, "tests", "fixtures", "generator_golden.json")
T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
SECONDS = 30.0
CASES = (
    ("clean", 7),
    ("slow-leak", 11),
    ("abrupt-drop", 13),
    ("sensor-drift", 17),
    ("link-outage", 19),
)


def build_fixture() -> dict:
    cases = []
    for scenario, seed in CASES:
        rows = [
            [str(row[field]) for field in HEADER]
            for row in iter_rows(scenario, SECONDS, "wheel-RH-01", seed, start=T0)
        ]
        cases.append({"scenario": scenario, "seed": seed, "rows": rows})
    return {
        "start": T0.isoformat(),
        "seconds": SECONDS,
        "device_id": "wheel-RH-01",
        "header": list(HEADER),
        "cases": cases,
    }


def main() -> None:
    with open(FIXTURE_PATH, "w", encoding="utf-8") as fh:
        json.dump(build_fixture(), fh, separators=(",", ":"), ensure_ascii=False)
        fh.write("\n")


if __name__ == "__main__":
    main()
