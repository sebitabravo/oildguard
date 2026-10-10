"""Microbench de tick y de outages: ruta exacta frente a incremental (R2d).

Mide en el mismo proceso las dos rutas sobre el mismo almacen, para que la
comparacion no dependa del ruido de la maquina:

    python -m backend.bench_fleet --devices 1000 --window 10

El perfil de py-spy que motivo el cambio decia que ``fleet_tick`` era el 49 %
del CPU del contenedor. Este script es la version controlada y reproducible de
esa afirmacion.
"""

from __future__ import annotations

import argparse
import random
import time

from backend.aggregates import DEFAULT_METRICS, aggregate_fleet, build_frame
from backend.fleetagg import RollingFleet

SIGNAL_RANGE = {
    "pressure_kpa": (0.0, 8.0),
    "temperature_c": (-20.0, 60.0),
    "vib_rms_g": (0.0, 2.0),
    "level_liters": (0.0, 500.0),
}


def build_rows(devices: int, window_s: float, rate_hz: float = 10.0) -> list[dict]:
    rng = random.Random(7)
    ticks = max(1, int(window_s * rate_hz))
    rows: list[dict] = []
    seq = 0
    for device_index in range(devices):
        device = f"dev-{device_index:05d}"
        for tick in range(ticks):
            seq += 1
            row = {
                "device_id": device,
                "seq": seq,
                "t_s": 1000.0 + tick / rate_hz,
                "t_iso": "",
                "link_down": 1 if tick % 97 == 96 else 0,
            }
            for name, (low, high) in SIGNAL_RANGE.items():
                row[name] = round(rng.uniform(low, high), 4)
            rows.append(row)
    return rows


def fill_store(store, rows: list[dict]) -> None:
    for row in rows:
        store.append_row(row)


def fill_rolling(rolling: RollingFleet, rows: list[dict]) -> None:
    metrics = list(DEFAULT_METRICS)
    for row in rows:
        rolling.observe(row["device_id"], row["t_s"], [row.get(m) for m in metrics])


def _time(fn, repeat: int) -> float:
    fn()  # calentamiento
    started = time.perf_counter()
    for _ in range(repeat):
        fn()
    return (time.perf_counter() - started) / repeat


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--devices", type=int, default=1000)
    parser.add_argument("--window", type=float, default=10.0)
    parser.add_argument("--repeat", type=int, default=20)
    args = parser.parse_args()

    from backend.store import TelemetryStore

    rows = build_rows(args.devices, args.window)
    store = TelemetryStore()
    fill_store(store, rows)
    rolling = RollingFleet(DEFAULT_METRICS)
    fill_rolling(rolling, rows)

    metrics = list(DEFAULT_METRICS)
    exact = _time(lambda: aggregate_fleet(build_frame(store.snapshot_window(args.window)), metrics), args.repeat)
    incremental = _time(lambda: rolling.snapshot(args.window), args.repeat)

    _, exact_rows, exact_devices = aggregate_fleet(build_frame(store.snapshot_window(args.window)), metrics)
    inc_blocks, inc_rows, inc_devices = rolling.snapshot(args.window)

    print(f"devices={args.devices} window={args.window}s rows={len(rows)} repeat={args.repeat}")
    print(f"  exact       : {exact * 1000:8.2f} ms/tick   rows={exact_rows} devices={exact_devices}")
    print(f"  incremental : {incremental * 1000:8.2f} ms/tick   rows={inc_rows} devices={inc_devices}")
    print(f"  speedup     : {exact / incremental:8.1f}x")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())