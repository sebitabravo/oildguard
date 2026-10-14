"""Sonda de InfluxDB honesta: un token invalido no puede quedar en verde.

`/health` responde 200 con cualquier token, asi que la sonda de arranque no
demonstraba nada. Estas pruebas fijan que la sonda valide la autenticacion y
que el fallo se reporte en WARNING.
"""

from __future__ import annotations

import logging
import sys
import urllib.error
import urllib.request
from types import ModuleType

# `main` se importa antes que `lifecycle`: lifecycle resuelve `main` de forma
# perezosa y al revés el ciclo de import deja el modulo a medio inicializar.
from backend import main as backend_main
from backend import lifecycle

BACKEND_LOGGER = "oilguard-backend"


class FakeResponse:
    def __init__(self, status: int):
        self.status = status

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *exc_info: object) -> bool:
        return False


def _capture_probe(monkeypatch, handler) -> list[urllib.request.Request]:
    seen: list[urllib.request.Request] = []

    def fake_urlopen(request, timeout=None):
        seen.append(request)
        return handler(request)

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    return seen


def test_startup_probe_signs_in_with_the_configured_token(monkeypatch):
    """`/health` es alcanzable sin credenciales: no demuestra que el token sirva."""
    monkeypatch.setattr(backend_main, "INFLUXDB_URL", "http://influxdb:8086")
    monkeypatch.setattr(backend_main, "INFLUXDB_TOKEN", "good-token")
    seen = _capture_probe(monkeypatch, lambda _request: FakeResponse(204))

    lifecycle._probe_influx()

    assert [request.full_url for request in seen] == ["http://influxdb:8086/api/v2/buckets"]
    assert seen[0].get_header("Authorization") == "Token good-token"


def test_startup_probe_warns_when_the_token_is_rejected(monkeypatch, caplog):
    monkeypatch.setattr(backend_main, "INFLUXDB_URL", "http://influxdb:8086")
    monkeypatch.setattr(backend_main, "INFLUXDB_TOKEN", "bad-token")

    def reject(request):
        raise urllib.error.HTTPError(request.full_url, 401, "unauthorized", {}, None)

    _capture_probe(monkeypatch, reject)

    with caplog.at_level(logging.WARNING, logger=BACKEND_LOGGER):
        lifecycle._probe_influx()

    assert "401" in caplog.text
    assert "/api/v2/buckets" in caplog.text


def test_startup_probe_without_token_still_runs_but_says_it_proves_little(monkeypatch, caplog):
    monkeypatch.setattr(backend_main, "INFLUXDB_URL", "http://influxdb:8086")
    monkeypatch.setattr(backend_main, "INFLUXDB_TOKEN", "   ")
    seen = _capture_probe(monkeypatch, lambda _request: FakeResponse(200))

    with caplog.at_level(logging.WARNING, logger=BACKEND_LOGGER):
        lifecycle._probe_influx()

    assert [request.full_url for request in seen] == ["http://influxdb:8086/health"]
    assert caplog.records
    assert caplog.records[0].levelno == logging.WARNING


def test_startup_probe_never_blocks_startup_on_transport_errors(monkeypatch, caplog):
    monkeypatch.setattr(backend_main, "INFLUXDB_URL", "http://influxdb:8086")
    monkeypatch.setattr(backend_main, "INFLUXDB_TOKEN", "good-token")

    def unreachable(request):
        raise urllib.error.URLError("connection refused")

    _capture_probe(monkeypatch, unreachable)

    with caplog.at_level(logging.WARNING, logger=BACKEND_LOGGER):
        lifecycle._probe_influx()

    assert "connection refused" in caplog.text


def test_persisted_count_failure_is_a_warning_not_a_debug_line(monkeypatch, caplog):
    """Un 401 por token invalido no puede quedar enterrado en debug."""

    def refuse(**_kwargs):
        raise RuntimeError("unauthorized")

    module = ModuleType("influxdb_client")
    module.InfluxDBClient = refuse
    monkeypatch.setitem(sys.modules, "influxdb_client", module)

    with caplog.at_level(logging.DEBUG, logger=BACKEND_LOGGER):
        assert backend_main._count_influx_points() is None

    warnings = [record for record in caplog.records if record.levelno == logging.WARNING]
    assert warnings
    assert any("unauthorized" in record.getMessage() for record in warnings)
