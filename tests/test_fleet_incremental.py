"""Equivalencia entre los agregados incrementales y el calculo exacto (R2d).

Tolerancia declarada:

- ``count``, ``mean``, ``min``, ``max``, ``rows`` y ``devices``: EXACTOS. Son
  acumuladores y colas monotonas; no hay muestreo en ningun momento.
- ``p50``/``p95``/``p99``: aproximados por embolsado. Se exige que la
  desviacion no supere el 1 % del rango observado de la senal, que es la
  tolerancia que pide el brief. ``p99`` es el que se mira de verdad, porque es
  el cuantil con mas varianza y el que el dashboard usa para alertar.
"""

from __future__ import annotations

import random
from typing import Any

import pytest

from backend.aggregates import DEFAULT_METRICS, aggregate_fleet, build_frame
from backend.fleetagg import RollingFleet
from backend.store import TelemetryStore, row_ts

SIGNAL_RANGE = {
    "pressure_kpa": (0.0, 8.0),
    "temperature_c": (-20.0, 60.0),
    "vib_rms_g": (0.0, 2.0),
    "level_liters": (0.0, 500.0),
}


def _make_rows(
    devices: int, ticks: int, *, seed: int = 7, link_down_every: int | None = None
) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    rows: list[dict[str, Any]] = []
    seq = 0
    for device_index in range(devices):
        device = f"dev-{device_index:04d}"
        for tick in range(ticks):
            seq += 1
            row: dict[str, Any] = {
                "device_id": device,
                "seq": seq,
                "t_s": 1000.0 + tick * 0.1,
                "t_iso": f"1970-01-01T00:16:{tick // 10:02d}.{tick % 10}000Z",
                "link_down": 0,
            }
            for name, (low, high) in SIGNAL_RANGE.items():
                row[name] = round(rng.uniform(low, high), 4)
            if link_down_every is not None and tick % link_down_every == link_down_every - 1:
                row["link_down"] = 1
                for name in SIGNAL_RANGE:
                    row[name] = 0.0
            rows.append(row)
    return rows


def _exact(store: TelemetryStore, window_s: float, metrics=DEFAULT_METRICS) -> tuple[Any, int, int]:
    frame = build_frame(store.snapshot_window(window_s))
    return aggregate_fleet(frame, list(metrics))


def _incremental(rolling: RollingFleet, window_s: float) -> tuple[Any, int, int]:
    return rolling.snapshot(window_s)


def _fill_rolling(rolling: RollingFleet, rows: list[dict[str, Any]], metrics=DEFAULT_METRICS) -> None:
    for row in rows:
        rolling.observe(
            row["device_id"],
            row_ts(row),
            [row.get(name) for name in metrics],
        )


@pytest.mark.parametrize("window_s", [1.0, 5.0, 30.0])
def test_incremental_matches_exact_on_1000_devices(window_s):
    """1000 dispositivos x 100 ticks a 10 Hz, ventana variable."""
    rows = _make_rows(1000, 100)
    store = TelemetryStore()
    rolling = RollingFleet(DEFAULT_METRICS)

    for row in rows:
        store.append_row(row)
        _fill_rolling(rolling, [row])

    exact_blocks, exact_rows, exact_devices = _exact(store, window_s)
    got_blocks, got_rows, got_devices = _incremental(rolling, window_s)

    assert (got_rows, got_devices) == (exact_rows, exact_devices)
    assert set(got_blocks) == set(exact_blocks)

    for metric in DEFAULT_METRICS:
        want = exact_blocks[metric]
        have = got_blocks[metric]
        span = SIGNAL_RANGE[metric][1] - SIGNAL_RANGE[metric][0]

        # Exactos.
        assert have["count"] == want["count"], metric
        assert have["mean"] == pytest.approx(want["mean"], rel=1e-9), metric
        assert have["min"] == pytest.approx(want["min"], rel=1e-9), metric
        assert have["max"] == pytest.approx(want["max"], rel=1e-9), metric
        assert have["devices"] == want["devices"], metric

        # Cuantiles: 1 % del rango de la senal.
        for label, _q in (("p50", 0), ("p95", 0), ("p99", 0)):
            assert have[label] == pytest.approx(want[label], abs=span * 0.01), (metric, label)


def test_quantiles_converge_as_samples_grow():
    """Mas muestras por dispositivo acortan el error: el embolsado funciona."""
    rows = _make_rows(200, 100)

    errors = {}
    for samples in (8, 32, 128):
        rolling = RollingFleet(DEFAULT_METRICS, samples_per_metric=samples)
        _fill_rolling(rolling, rows)
        store = TelemetryStore()
        for row in rows:
            store.append_row(row)
        want = _exact(store, 5.0)[0]["vib_rms_g"]["p99"]
        have = rolling.snapshot(5.0)[0]["vib_rms_g"]["p99"]
        errors[samples] = abs(have - want)

    assert errors[128] < errors[8], errors


def test_a_stalled_device_still_contributes_its_own_window():
    """El corte es por reloj de cada dispositivo, no global.

    Un equipo que dejo de publicar hace una hora sigue aportando las filas de
    su ultima ventana. Una estructura con reloj global lo contaria como cero.
    """
    active = [{"device_id": "live", "seq": i, "t_s": 9000.0 + i, "t_iso": "", "link_down": 0,
               "pressure_kpa": 1.0, "temperature_c": 1.0, "vib_rms_g": 1.0, "level_liters": 1.0}
              for i in range(10)]
    dead = [{"device_id": "ghost", "seq": i, "t_s": 100.0 + i, "t_iso": "", "link_down": 0,
             "pressure_kpa": 1.0, "temperature_c": 1.0, "vib_rms_g": 1.0, "level_liters": 1.0}
            for i in range(10)]

    store = TelemetryStore()
    rolling = RollingFleet(DEFAULT_METRICS)
    for row in dead + active:
        store.append_row(row)
        _fill_rolling(rolling, [row])

    exact_blocks, exact_rows, exact_devices = _exact(store, 5.0)
    got_blocks, got_rows, got_devices = _incremental(rolling, 5.0)

    # Cada equipo aporta 6 filas: las de su propia ventana de 5 s a 10 Hz
    # (cutoff = 109 - 5 y 9009 - 5). Lo relevante es que el fantasma cuenta.
    assert (got_rows, got_devices) == (exact_rows, exact_devices) == (12, 2)
    assert got_blocks["pressure_kpa"]["count"] == exact_blocks["pressure_kpa"]["count"] == 12


def test_null_values_are_skipped_exactly_as_polars_does():
    rows = [
        {"device_id": "d1", "seq": 1, "t_s": 1.0, "t_iso": "", "link_down": 0,
         "pressure_kpa": 2.0, "temperature_c": None, "vib_rms_g": 0.5, "level_liters": None},
        {"device_id": "d1", "seq": 2, "t_s": 2.0, "t_iso": "", "link_down": 0,
         "pressure_kpa": 4.0, "temperature_c": 10.0, "vib_rms_g": None, "level_liters": None},
    ]
    store = TelemetryStore()
    rolling = RollingFleet(DEFAULT_METRICS)
    for row in rows:
        store.append_row(row)
        _fill_rolling(rolling, [row])

    exact = _exact(store, 60.0)[0]
    have = rolling.snapshot(60.0)[0]

    for metric in DEFAULT_METRICS:
        assert have[metric]["count"] == exact[metric]["count"], metric
        assert have[metric]["mean"] == pytest.approx(exact[metric]["mean"], rel=1e-9), metric


def test_window_beyond_the_horizon_is_refused_not_faked():
    """Fuera del horizonte la estructura no puede responder; lo dice."""
    rolling = RollingFleet(DEFAULT_METRICS, horizon_s=30.0)
    rolling.observe("d1", 10.0, [1.0, 2.0, 3.0, 4.0])

    assert rolling.covers(30.0) is True
    assert rolling.covers(30.1) is False
    assert rolling.covers(300.0) is False


def test_tick_cost_does_not_grow_with_rows():
    """La propiedad que motiva el cambio: el tick es O(dispositivos).

    Anadir diez veces mas filas no puede multiplicar el coste del tick; lo
    unico que crece es el numero de dispositivos.
    """
    import time

    def build(n_devices: int, n_rows_each: int) -> RollingFleet:
        rolling = RollingFleet(DEFAULT_METRICS)
        for device_index in range(n_devices):
            for row_index in range(n_rows_each):
                rolling.observe(
                    f"dev-{device_index:04d}",
                    1000.0 + row_index * 0.1,
                    [1.0, 2.0, 3.0, 4.0],
                )
        return rolling

    # Un dispositivo con diez veces mas filas: coste de tick igual.
    small = build(1, 100)
    big = build(1, 1000)

    def tick_cost(rolling: RollingFleet) -> float:
        rolling.snapshot(30.0)  # calentamiento
        started = time.perf_counter()
        for _ in range(20):
            rolling.snapshot(30.0)
        return (time.perf_counter() - started) / 20

    assert tick_cost(big) < tick_cost(small) * 5

def test_websocket_tick_agrees_with_the_exact_endpoint():
    """El tick que consume el dashboard coincide con /fleet/aggregates.

    Este es el contrato que importa: la ruta incremental sustituye a la
    exacta solo si el cliente ve los mismos numeros.
    """
    from starlette.testclient import TestClient

    import backend.main as backend_main

    with backend_main._store_lock:
        backend_main._store_rows.clear()
    backend_main._FLEET_TICK_CACHE.reset()

    rows = _make_rows(40, 20, seed=11)
    backend_main.verify_and_store(rows)

    tick = backend_main.fleet_tick(2.0)
    exact_blocks, exact_rows, exact_devices = _exact(backend_main._STORE, 2.0)

    assert (tick["rows"], tick["devices"]) == (exact_rows, exact_devices)
    for metric in DEFAULT_METRICS:
        want = exact_blocks[metric]
        have = tick["aggregates"][metric]
        span = SIGNAL_RANGE[metric][1] - SIGNAL_RANGE[metric][0]
        assert have["count"] == want["count"], metric
        assert have["mean"] == pytest.approx(want["mean"], rel=1e-9), metric
        assert have["min"] == pytest.approx(want["min"], rel=1e-9), metric
        assert have["max"] == pytest.approx(want["max"], rel=1e-9), metric
        assert have["p99"] == pytest.approx(want["p99"], abs=span * 0.01), metric


def test_tick_beyond_the_horizon_falls_back_to_the_exact_path():
    """Con ventana > horizonte se cae a Polars, no a un cero inventado."""
    import backend.main as backend_main

    with backend_main._store_lock:
        backend_main._store_rows.clear()
    backend_main._FLEET_TICK_CACHE.reset()
    backend_main.verify_and_store(_make_rows(20, 10, seed=3))

    wide = backend_main.fleet_tick(10_000)
    exact_blocks, exact_rows, _exact_devices = _exact(backend_main._STORE, 10_000)

    assert wide["rows"] == exact_rows > 0
    assert wide["aggregates"]["pressure_kpa"]["count"] == exact_blocks["pressure_kpa"]["count"]
