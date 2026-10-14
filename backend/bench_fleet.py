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


def build_rows(
    devices: int,
    window_s: float,
    rate_hz: float = 10.0,
    link_down_period: int = 97,
) -> list[dict]:
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
                "link_down": 1 if tick % link_down_period == link_down_period - 1 else 0,
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

    print("fleet tick")
    print(f"devices={args.devices} window={args.window}s rows={len(rows)} repeat={args.repeat}")
    print(f"  exact       : {exact * 1000:8.2f} ms/tick   rows={exact_rows} devices={exact_devices}")
    print(f"  incremental : {incremental * 1000:8.2f} ms/tick   rows={inc_rows} devices={inc_devices}")
    print(f"  speedup     : {exact / incremental:8.1f}x")

    _bench_outages(rows, args)
    return 0


def _bench_outages(rows: list[dict], args) -> None:
    """Rachas de corte: escaneo completo frente a seguimiento incremental."""
    from backend.outages import OutageTracker, runs_from_rows

    # Cortes densos: un corte cada 7 filas produce ~14 rachas por dispositivo,
    # que es lo que hace que el escaneo crezca con la retencion.
    rows = build_rows(args.devices, args.window, link_down_period=7)

    exact_rows = [sorted(store_rows_of(rows, d), key=lambda r: r["seq"]) for d in devices_of(rows)]

    def scan() -> int:
        found = []
        for device, device_rows in zip(devices_of(rows), exact_rows):
            found.extend(runs_from_rows(device_rows, device))
        # El endpoint ordena globalmente y corta en `limit`: con 1000 equipos y
        # ~14000 rachas, esa parte no es trivial.
        found.sort(key=lambda run: (str(run.get("start_t_iso") or ""), run["device_id"]), reverse=True)
        return len(found[:50])

    tracker = OutageTracker()
    for row in rows:
        tracker.observe(
            row["device_id"], row["seq"], row["t_s"], row["t_iso"], row["link_down"]
        )

    def tracked() -> int:
        found = []
        for device in devices_of(rows):
            found.extend(tracker.runs(device))
        found.sort(key=lambda run: (str(run.get("start_t_iso") or ""), run["device_id"]), reverse=True)
        return len(found[:50])

    scan()  # calentamiento
    started = time.perf_counter()
    for _ in range(args.repeat):
        scan()
    scan_ms = (time.perf_counter() - started) / args.repeat * 1000

    started = time.perf_counter()
    for _ in range(args.repeat):
        tracked()
    tracked_ms = (time.perf_counter() - started) / args.repeat * 1000

    print()
    print("fleet outages")
    print(f"  scan        : {scan_ms:8.2f} ms/call   devueltas(limit=50)={scan()}")
    print(f"  incremental : {tracked_ms:8.2f} ms/call   devueltas(limit=50)={tracked()}")
    print(f"  speedup     : {scan_ms / tracked_ms:8.1f}x")


def devices_of(rows: list[dict]) -> list[str]:
    seen: list[str] = []
    for row in rows:
        if row["device_id"] not in seen:
            seen.append(row["device_id"])
    return seen


def store_rows_of(rows: list[dict], device: str) -> list[dict]:
    return [row for row in rows if row["device_id"] == device]


if __name__ == "__main__":
    raise SystemExit(main())
