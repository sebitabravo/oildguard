"""Deriva los fixtures del laboratorio desde tests/fixtures/generator_golden.json.

Uso (desde la raíz del repositorio):

    python3 frontend/src/lab/fixtures/derive_fixtures.py

Fuente: cinco casos de 30 s a 10 Hz del generador (`sim/generate.py`), cada uno con su
semilla (7, 11, 13, 17, 19). No se inventa ningún valor: `scenarios.json` solo quita las
columnas derivables (`t_iso`, `device_id`) y convierte los textos numéricos a números;
`validation.json` corre el estimador real `ai/level.py` (`estimate`) sobre cada caso,
igual que GET /level/series, y guarda la estimación fusionada junto a la verdad del
generador (`level_liters`). El test `fixtures.test.ts` falla si estos archivos se desalinean
del golden.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))

from ai import level  # noqa: E402

GOLDEN = ROOT / "tests" / "fixtures" / "generator_golden.json"
OUT = Path(__file__).resolve().parent
DROPPED = ("t_iso", "device_id")
TEXT_COLUMNS = {"fsm_state", "rotating_sensor_regime", "label"}


def number_or_text(column: str, value: str):
    if column in TEXT_COLUMNS:
        return value
    number = float(value)
    return int(number) if number.is_integer() and "." not in value else number


def main() -> None:
    golden = json.loads(GOLDEN.read_text())
    header = golden["header"]
    kept = [name for name in header if name not in DROPPED]
    source = {
        "file": "tests/fixtures/generator_golden.json",
        "generator": "sim/generate.py",
        "estimator": "ai/level.py estimate() (synthetic-proxy)",
        "start": golden["start"],
        "device_id": golden["device_id"],
        "seconds": golden["seconds"],
        "rate_hz": 10,
        "command": "python3 frontend/src/lab/fixtures/derive_fixtures.py",
    }

    scenarios = {}
    validation = {}
    for case in golden["cases"]:
        rows = [dict(zip(header, raw)) for raw in case["rows"]]
        scenarios[case["scenario"]] = {
            "seed": case["seed"],
            "rows": [[number_or_text(name, row[name]) for name in kept] for row in rows],
        }
        estimate = level.estimate(rows)
        points = []
        for row, item in zip(rows, estimate["estimates"]):
            fused = item["level_liters"]
            points.append([
                float(row["t_s"]),
                None if fused is None else round(fused, 4),
                float(row["level_liters"]),
                int(row["recal_window"]),
            ])
        validation[case["scenario"]] = {
            "seed": case["seed"],
            "sigma_l": estimate["sigma_liters"],
            "points": points,
        }

    (OUT / "scenarios.json").write_text(
        json.dumps({"source": source, "columns": kept, "scenarios": scenarios}, separators=(",", ":")) + "\n"
    )
    (OUT / "validation.json").write_text(
        json.dumps(
            {
                "source": source,
                "columns": ["t_s", "level_l", "truth_liters", "recal_window"],
                "scenarios": validation,
            },
            separators=(",", ":"),
        )
        + "\n"
    )


if __name__ == "__main__":
    main()
