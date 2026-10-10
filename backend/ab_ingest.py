"""A/B intercalado entre la linea base y HEAD (R2b).

Medir antes y despues en momentos distintos no sirve en una maquina con ruido:
las pasadas unicas varian +-20%. Alternar baseline/HEAD dentro de la misma
sesion hace que ambas versiones vean las mismas condiciones.
"""

from __future__ import annotations

import json
import statistics
import subprocess
import sys

BASE = "41401bf"  # commit previo a R2b
CONFIGS = [
    ("unsigned 100 devices", ["--devices", "100", "--ticks", "300"]),
    ("unsigned 1000 devices", ["--devices", "1000", "--ticks", "30"]),
    ("unsigned 5000 devices", ["--devices", "5000", "--ticks", "6"]),
    ("signed 1000 devices", ["--devices", "1000", "--ticks", "20", "--signed"]),
]
FILES = [
    "backend/main.py",
    "backend/metrics.py",
    "backend/store.py",
    "backend/ingest_mqtt.py",
    "backend/requirements.txt",
]


def checkout(rev: str) -> None:
    subprocess.run(["git", "checkout", "-q", rev, "--", *FILES], check=True)


def measure(args: list[str], repeat: int = 5) -> float:
    cmd = [sys.executable, "-m", "backend.bench_ingest", *args, "--repeat", str(repeat), "--json"]
    out = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
    return json.loads(out.stdout)["rows_per_s"]


def main(rounds: int = 3) -> int:
    results: dict[str, dict[str, list[float]]] = {}
    try:
        for _ in range(rounds):
            for label, args in CONFIGS:
                checkout(BASE)
                results.setdefault(label, {"base": [], "head": []})["base"].append(measure(args))
                checkout("HEAD")
                results.setdefault(label, {"base": [], "head": []})["head"].append(measure(args))
    finally:
        checkout("HEAD")

    print(f"{'config':22s} {'baseline':>12s} {'HEAD':>12s} {'delta':>9s}")
    for label, _ in CONFIGS:
        base = statistics.median(results[label]["base"])
        head = statistics.median(results[label]["head"])
        print(f"{label:22s} {base:12.0f} {head:12.0f} {(head / base - 1) * 100:+8.1f}%")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())