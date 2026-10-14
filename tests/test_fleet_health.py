"""/health no puede bloquear en Influx: el conteo va cacheado (R2).

Con el bucketellenado por las pruebas de carga, contar los puntos persistidos
tardaba segundos y /health se caia por timeout mientras /metrics/ingest
respondia en 3 ms. Un chequeo de salud que se cuelga no informa: solo agota
al que pregunta.
"""

from __future__ import annotations

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


class ManualExecutor:
    """Lanzador de sondas controlado por el test: nada corre hasta que se pide.

    Las pruebas de la sonda usaban esperas y sondeos sobre un hilo real, lo
    que las hacia depender de la carga de la maquina. Aqui el test decide
    exactamente cuando se ejecuta la sonda.
    """

    def __init__(self) -> None:
        self.pending: list = []

    def __call__(self, work) -> None:
        self.pending.append(work)

    @property
    def launched(self) -> int:
        return len(self.pending)

    def run_all(self) -> None:
        pending, self.pending = self.pending, []
        for work in pending:
            work()


@pytest.fixture()
def manual_probes():
    executor = ManualExecutor()
    backend_main._INFLUX_POINTS.set_executor(executor)
    return executor


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(backend_main, "_count_influx_points", lambda: 0)
    backend_main._INFLUX_POINTS.reset()
    # Sin context manager: no dispara el startup (sondeo de Influx / puente MQTT).
    return TestClient(backend_main.app)


@pytest.fixture()
def fast_probe_wait():
    """Tope de espera pequeno para las pruebas que usan el hilo real.

    El tope por defecto (0.1 s) deja solo 2x de margen sobre el aserto de
    200 ms, y esa asercion mide tiempo de reloj: bajo carga de otra maquina se
    volvia intermitente sin que el codigo hubiera cambiado. Con un tope de
    5 ms el margen es de 40x y la prueba sigue probando lo mismo: que la
    llamada vuelve mucho antes de los 3 s que tarda el contador.
    """
    backend_main._INFLUX_POINTS.wait_s = 0.005
    yield
    backend_main._INFLUX_POINTS.wait_s = backend_main.INFLUX_COUNT_PROBE_WAIT_S


def test_health_never_blocks_on_a_slow_influx_counter(client, monkeypatch, fast_probe_wait):
    monkeypatch.setattr(
        backend_main, "_count_influx_points", lambda: (time.sleep(3), None)[1]
    )

    started = time.perf_counter()
    response = client.get("/health")
    elapsed = time.perf_counter() - started

    assert response.status_code == 200
    assert elapsed < 0.2, f"/health tardó {elapsed:.3f}s: está bloqueando en Influx"


def test_only_the_caller_that_launches_the_probe_pays_the_wait(client, monkeypatch, fast_probe_wait):
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


def test_cache_is_invalidated_when_the_influx_configuration_changes(client, monkeypatch, manual_probes):
    monkeypatch.setattr(backend_main, "_count_influx_points", lambda: 5)
    client.get("/health").json()
    manual_probes.run_all()
    assert client.get("/health").json()["influx_points"] == 5

    monkeypatch.setattr(backend_main, "INFLUXDB_URL", "http://otro:8086")
    monkeypatch.setattr(backend_main, "_count_influx_points", lambda: 6)

    # El 5 pertenece a otra instalacion: servirlo seria mentir. Ademas la
    # reconfiguracion debe lanzar una sonda nueva aunque la anterior siguiera
    # en vuelo; si no, /health se quedaria sin dato hasta que terminara.
    reconfigured = client.get("/health").json()
    manual_probes.run_all()

    assert reconfigured["influx_points"] is None
    assert client.get("/health").json()["influx_points"] == 6


def test_a_probe_from_a_previous_configuration_cannot_poison_the_cache(
    client, monkeypatch, manual_probes
):
    """Una sonda en vuelo de la config anterior no puede escribir su resultado.

    Sin generacion, la sonda lenta de la instalacion vieja escribia su numero
    encima del cache nuevo y /health servia una persistencia que no era.
    """
    monkeypatch.setattr(backend_main, "_count_influx_points", lambda: 111)
    client.get("/health")  # lanza la sonda de la config vieja, queda en vuelo
    assert manual_probes.launched == 1

    monkeypatch.setattr(backend_main, "INFLUXDB_URL", "http://otro:8086")
    monkeypatch.setattr(backend_main, "_count_influx_points", lambda: 222)
    client.get("/health")  # reconfigura: lanza la sonda nueva, la vieja sigue viva
    assert manual_probes.launched == 2

    manual_probes.run_all()  # la vieja termina tarde, despues de la nueva

    assert client.get("/health").json()["influx_points"] == 222


def test_a_slow_probe_that_lands_later_fills_the_cache(client, monkeypatch, manual_probes):
    monkeypatch.setattr(backend_main, "_count_influx_points", lambda: 99)

    first = client.get("/health").json()

    # La sonda esta en vuelo: la respuesta no la espera y no inventa un valor.
    assert manual_probes.launched == 1
    assert first["influx_points"] is None
    assert first["influx_points_reason"] == "not_probed"

    manual_probes.run_all()

    # El sondeo tardio no se pierde: rellena el cache para las siguientes llamadas.
    assert manual_probes.launched == 0  # el TTL evita volver a sondar
    assert client.get("/health").json()["influx_points"] == 99


def test_a_raising_counter_does_not_break_health(client, monkeypatch):
    monkeypatch.setattr(
        backend_main, "_count_influx_points", lambda: (_ for _ in ()).throw(RuntimeError("boom"))
    )

    payload = client.get("/health").json()

    assert payload["status"] in {"ok", "degraded"}
    assert payload["influx_points"] is None
    assert payload["influx_points_reason"] == "probe_failed"
