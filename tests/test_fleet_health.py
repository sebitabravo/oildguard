"""/health no puede bloquear en Influx: el conteo va cacheado (R2).

Con el bucketellenado por las pruebas de carga, contar los puntos persistidos
tardaba segundos y /health se caia por timeout mientras /metrics/ingest
respondia en 3 ms. Un chequeo de salud que se cuelga no informa: solo agota
al que pregunta.
"""

from __future__ import annotations

import threading
import time

import pytest
from fastapi.testclient import TestClient

from backend import main as backend_main


class Clock:
    def __init__(self, start: float = 1_789_628_000.0):
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(backend_main, "_count_influx_points", lambda: 0)
    backend_main._INFLUX_POINTS.reset()
    # Sin context manager: no dispara el startup (sondeo de Influx / puente MQTT).
    return TestClient(backend_main.app)


def test_health_never_blocks_on_a_slow_influx_counter(client, monkeypatch):
    monkeypatch.setattr(
        backend_main, "_count_influx_points", lambda: (time.sleep(3), None)[1]
    )

    started = time.perf_counter()
    response = client.get("/health")
    elapsed = time.perf_counter() - started

    assert response.status_code == 200
    assert elapsed < 0.2, f"/health tardó {elapsed:.3f}s: está bloqueando en Influx"


def test_only_the_caller_that_launches_the_probe_pays_the_wait(client, monkeypatch):
    """Con una sonda colgada, el segundo /health tampoco espera el tope."""
    monkeypatch.setattr(
        backend_main, "_count_influx_points", lambda: (time.sleep(3), None)[1]
    )

    first_started = time.perf_counter()
    assert client.get("/health").status_code == 200
    first = time.perf_counter() - first_started

    second_started = time.perf_counter()
    assert client.get("/health").status_code == 200
    second = time.perf_counter() - second_started

    # Mismo contrato que el test anterior: ninguna de las dos espera los 3 s
    # del contador. Medir la segunda contra un margen mas estrecho solo mide
    # cuanto hay de libre la maquina.
    assert first < 0.2
    assert second < 0.2, f"el segundo /health tardó {second:.3f}s esperando una sonda ajena"


def test_health_returns_the_cached_count_with_its_timestamp(client, monkeypatch):
    calls: list[int] = []

    def counter() -> int:
        calls.append(1)
        return 4242

    monkeypatch.setattr(backend_main, "_count_influx_points", counter)

    first = client.get("/health").json()
    second = client.get("/health").json()

    assert first["influx_points"] == 4242
    assert first["influx_points_as_of"]
    assert first["influx_points_reason"] is None
    # Dentro del TTL no se vuelve a sondear: ese era el coste que se.va a eliminar.
    assert len(calls) == 1
    assert second["influx_points"] == 4242


def test_health_reports_a_reason_when_the_count_is_unknown(client, monkeypatch):
    monkeypatch.setattr(backend_main, "_count_influx_points", lambda: None)

    payload = client.get("/health").json()

    assert payload["influx_points"] is None
    assert payload["influx_points_reason"] == "count_unavailable"
    assert payload["influx_points_as_of"]


def test_health_reprobes_after_the_ttl_expires(client, monkeypatch):
    clock = Clock()
    backend_main._INFLUX_POINTS._now_fn = clock
    calls: list[int] = []

    def counter() -> int:
        calls.append(1)
        return 7 * len(calls)

    monkeypatch.setattr(backend_main, "_count_influx_points", counter)

    assert client.get("/health").json()["influx_points"] == 7
    clock.advance(backend_main.INFLUX_COUNT_TTL_S + 1)
    payload = client.get("/health").json()

    assert len(calls) == 2
    assert payload["influx_points"] == 14


def test_cache_is_invalidated_when_the_influx_configuration_changes(client, monkeypatch):
    monkeypatch.setattr(backend_main, "_count_influx_points", lambda: 5)
    assert client.get("/health").json()["influx_points"] == 5

    monkeypatch.setattr(backend_main, "INFLUXDB_URL", "http://otro:8086")
    monkeypatch.setattr(backend_main, "_count_influx_points", lambda: 6)

    # El 5 pertenece a otra instalacion: servirlo seria mentir.
    assert client.get("/health").json()["influx_points"] == 6


def test_a_slow_probe_that_lands_later_fills_the_cache(client, monkeypatch):
    release = threading.Event()

    def slow_counter() -> int:
        release.wait(timeout=5)
        return 99

    monkeypatch.setattr(backend_main, "_count_influx_points", slow_counter)

    started = time.perf_counter()
    first = client.get("/health").json()
    assert time.perf_counter() - started < 0.2
    assert first["influx_points"] is None
    assert first["influx_points_reason"] == "not_probed"

    release.set()
    for _ in range(100):
        if backend_main._INFLUX_POINTS.peek()[0] == 99:
            break
        time.sleep(0.02)

    # El sondeo tarde no se pierde: rellena el cache para las siguientes llamadas.
    assert client.get("/health").json()["influx_points"] == 99


def test_a_raising_counter_does_not_break_health(client, monkeypatch):
    monkeypatch.setattr(
        backend_main, "_count_influx_points", lambda: (_ for _ in ()).throw(RuntimeError("boom"))
    )

    payload = client.get("/health").json()

    assert payload["status"] in {"ok", "degraded"}
    assert payload["influx_points"] is None
    assert payload["influx_points_reason"] == "probe_failed"