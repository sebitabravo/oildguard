"""Microbenchmark del camino de ingesta (R2b).

Empuja lotes por exactamente el mismo camino que usa el worker MQTT:
decode -> verify -> store -> metrics, con Influx deshabilitado. Sirve para
medir en proceso, sin Docker ni broker, y para decidir optimizaciones con
datos en vez de con suposiciones.

    python -m backend.bench_ingest --devices 1000 --seconds 10
    python -m backend.bench_ingest --devices 1000 --profile

`--profile` acota cProfile SOLO al bucle medido: generar la señal con
sim.generate cuesta cientos de segundos y ahogaría el perfil de la ingesta.
"""

from __future__ import annotations

import argparse
import cProfile
import io
import json
import logging
import os
import pstats
import sys
import time
from datetime import datetime, timedelta, timezone

if __package__ in (None, ""):  # ejecución como script suelto
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sim.generate import iter_rows

NUMERIC = {
    "t_s", "slope_deg", "rotor_rpm", "wheel_rpm", "pressure_kpa",
    "temperature_c", "vib_rms_g", "vib_kurtosis", "level_liters", "level_pct",
}
TICK_HZ = 10
DEVICE_KEY = bytes(range(32))


def build_templates(devices: int, per_device: int) -> dict[str, list[dict]]:
    """Filas reales por dispositivo, generadas una vez con sim.generate.

    Se generan una sola vez porque la física cuesta ~13 ms por llamada: lo que
    se mide es la ingesta, no el simulador. Cada lote reutiliza estas filas con
    su propio ``seq`` y ``t_iso``.
    """
    start = datetime.now(timezone.utc) - timedelta(hours=1)
    templates: dict[str, list[dict]] = {}
    for index in range(devices):
        device_id = f"wheel-{index:05d}"
        rows: list[dict] = []
        for raw in iter_rows("clean", per_device / TICK_HZ, device_id, 0, start=start):
            rows.append({k: (float(v) if k in NUMERIC else v) for k, v in raw.items()})
        templates[device_id] = rows
    return templates


def build_payloads(
    templates: dict[str, list[dict]], ticks: int, signed: bool = False
) -> list[bytes]:
    """Lotes JSON listos para decodificar, como los que llegan por MQTT."""
    base = datetime.now(timezone.utc) - timedelta(seconds=ticks / TICK_HZ)
    payloads: list[bytes] = []
    for tick in range(ticks):
        stamp = (base + timedelta(seconds=tick / TICK_HZ)).isoformat()
        seq = tick * 10
        rows: list[dict] = []
        for device_id, template in templates.items():
            for offset, row in enumerate(template):
                fresh = dict(row)
                fresh["seq"] = seq + offset
                fresh["t_iso"] = stamp
                rows.append(fresh)
        if signed:
            rows = _sign(rows)
        payloads.append(json.dumps({"rows": rows}).encode("utf-8"))
    return payloads


def _sign(rows: list[dict]) -> list[dict]:
    """Firma como haría el edge, para medir el camino con HMAC."""
    from shared.signing import derive_device_key, sign_row

    signed: list[dict] = []
    for row in rows:
        key = derive_device_key(DEVICE_KEY, row["device_id"])
        signed.append(sign_row(row, key))
    return signed


def _configure(signed: bool):
    from backend import main as backend_main

    # El log por lote es I/O real: dejarlo a INFO medimos el logger, no la
    # ingesta, y la salida inunda la medicion.
    logging.getLogger("oilguard-backend").setLevel(logging.CRITICAL)
    backend_main._STORE.clear()
    backend_main._INGEST_METRICS.reset()
    backend_main._rejected_total = 0
    backend_main._rejected_reasons.clear()
    backend_main._verified_total = 0
    backend_main._DEVICE_KEYS = {}
    backend_main._DEVICE_MASTER_KEY = DEVICE_KEY if signed else None
    backend_main._REQUIRE_SIGNATURE = signed
    backend_main._INFLUX_WRITE = False


def drive(payloads: list[bytes]) -> int:
    """El camino medido: decode -> verify -> store -> metrics."""
    from backend import main as backend_main
    from backend.ingest_mqtt import decode_payload

    total = 0
    for payload in payloads:
        total += len(backend_main.verify_and_store(decode_payload(payload, "oilguard/signals")))
    return total


def run(devices: int, ticks: int, per_device: int, signed: bool, profile: bool, repeat: int = 1) -> dict:
    from backend import main as backend_main

    _configure(signed)
    templates = build_templates(devices, per_device)
    payloads = build_payloads(templates, ticks, signed=signed)
    total_rows = len(payloads) * devices * per_device

    profiler = None
    if profile:
        profiler = cProfile.Profile()

    samples: list[float] = []
    accepted = 0
    profile_text = ""
    for attempt in range(max(1, repeat)):
        if attempt:
            _configure(signed)
        if profiler is not None and attempt == 0:
            profiler.enable()
        started = time.perf_counter()
        accepted = drive(payloads)
        elapsed = time.perf_counter() - started
        if profiler is not None and attempt == 0:
            profiler.disable()
            stream = io.StringIO()
            pstats.Stats(profiler, stream=stream).sort_stats("cumulative").print_stats(20)
            profile_text = stream.getvalue()
        samples.append(total_rows / elapsed if elapsed else 0.0)

    samples.sort()
    median = samples[len(samples) // 2]
    result = {
        "devices": devices,
        "batches": len(payloads),
        "rows": total_rows,
        "accepted": accepted,
        "seconds": round(len(payloads) / median * devices * per_device, 3),
        "rows_per_s": round(median, 1),
        "best_rows_per_s": round(samples[-1], 1),
        "worst_rows_per_s": round(samples[0], 1),
        "repeat": len(samples),
        "store_rows": backend_main._STORE.total_rows(),
        "signed": signed,
        "profile": profile_text,
    }
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="OilGuard ingest microbenchmark")
    parser.add_argument("--devices", type=int, default=1000)
    parser.add_argument("--ticks", type=int, default=30, help="publicaciones (10 Hz cada una)")
    parser.add_argument("--per-device", type=int, default=10, help="filas por lote y dispositivo")
    parser.add_argument("--signed", action="store_true", help="firmar cada fila (HMAC)")
    parser.add_argument("--profile", action="store_true", help="cProfile del bucle medido")
    parser.add_argument("--repeat", type=int, default=1, help="pasadas; se informa la mediana")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    result = run(
        devices=args.devices,
        ticks=args.ticks,
        per_device=args.per_device,
        signed=args.signed,
        profile=args.profile,
        repeat=args.repeat,
    )
    if args.json:
        print(json.dumps({k: v for k, v in result.items() if k != "profile"}))
    else:
        label = f"{result['devices']} devices x {result['rows_per_batch_per_device']}" if "rows_per_batch_per_device" in result else f"{result['devices']} devices x {args.per_device}"
        print(
            f"{label:28s} {'signed' if result['signed'] else 'unsigned':8s} "
            f"rows={result['rows']:>8d} "
            f"rows/s={result['rows_per_s']:>10.0f} "
            f"(min {result['worst_rows_per_s']:.0f} max {result['best_rows_per_s']:.0f}, "
            f"n={result['repeat']})"
        )
    if result.get("profile"):
        print(result["profile"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())