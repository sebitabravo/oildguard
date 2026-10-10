from __future__ import annotations

import sys
from types import ModuleType
from typing import Any

from fastapi.testclient import TestClient

from backend import main as backend_main


class FakeRecord:
    def __init__(self, value: int):
        self.value = value

    def get_value(self) -> int:
        return self.value


class FakeTable:
    def __init__(self, values: list[int]):
        self.records = [FakeRecord(value) for value in values]


class FakeQueryApi:
    def __init__(self, tables: list[FakeTable] | None = None, error: Exception | None = None):
        self.tables = tables or []
        self.error = error
        self.query_text = ""
        self.org: str | None = None

    def query(self, query: str, org: str) -> list[FakeTable]:
        self.query_text = query
        self.org = org
        if self.error is not None:
            raise self.error
        return self.tables


class FakeInfluxClient:
    def __init__(self, query_api: FakeQueryApi, **kwargs: Any):
        self.api = query_api
        self.options = kwargs
        self.closed = False

    def query_api(self) -> FakeQueryApi:
        return self.api

    def close(self) -> None:
        self.closed = True


def install_fake_influx_client(monkeypatch, factory):
    module = ModuleType("influxdb_client")
    module.InfluxDBClient = factory
    monkeypatch.setitem(sys.modules, "influxdb_client", module)


def test_health_distinguishes_session_rows_from_persisted_points(monkeypatch):
    with backend_main._store_lock:
        backend_main._store_rows.clear()
        backend_main._store_rows.extend([{"seq": 0}, {"seq": 1}, {"seq": 2}])
    monkeypatch.setattr(backend_main, "_count_influx_points", lambda: 11, raising=False)
    client = TestClient(backend_main.app)

    response = client.get("/health")

    assert response.status_code == 200
    health = response.json()
    assert health["store_rows"] == 3
    assert health["influx_points"] == 11


def test_count_influx_points_sums_grouped_seq_counts_and_closes_client(monkeypatch):
    api = FakeQueryApi(tables=[FakeTable([2]), FakeTable([3])])
    instances: list[FakeInfluxClient] = []

    def factory(**kwargs: Any) -> FakeInfluxClient:
        client = FakeInfluxClient(api, **kwargs)
        instances.append(client)
        return client

    install_fake_influx_client(monkeypatch, factory)

    count = backend_main._count_influx_points()

    assert count == 5
    assert len(instances) == 1
    assert instances[0].options["timeout"] == 1200
    assert instances[0].closed is True
    assert 'from(bucket: "oilguard")' in api.query_text
    assert "range(start: 0)" in api.query_text
    assert 'r._measurement == "oilguard_signals"' in api.query_text
    assert 'r._field == "seq"' in api.query_text
    assert "count()" in api.query_text
    assert api.org == "oilguard"


def test_empty_influx_query_returns_zero(monkeypatch):
    api = FakeQueryApi(tables=[])
    clients: list[FakeInfluxClient] = []

    def factory(**kwargs: Any) -> FakeInfluxClient:
        client = FakeInfluxClient(api, **kwargs)
        clients.append(client)
        return client

    install_fake_influx_client(monkeypatch, factory)

    assert backend_main._count_influx_points() == 0
    assert clients[0].closed is True


def test_missing_influx_configuration_returns_none(monkeypatch):
    monkeypatch.setattr(backend_main, "INFLUXDB_URL", "")

    assert backend_main._count_influx_points() is None


def test_missing_influx_client_returns_none(monkeypatch):
    original_import = __import__

    def import_without_influx(name, *args, **kwargs):
        if name == "influxdb_client":
            raise ImportError("influx client unavailable")
        return original_import(name, *args, **kwargs)

    monkeypatch.delitem(sys.modules, "influxdb_client", raising=False)
    monkeypatch.setattr("builtins.__import__", import_without_influx)

    assert backend_main._count_influx_points() is None


def test_query_timeout_returns_null_and_health_remains_healthy(monkeypatch):
    api = FakeQueryApi(error=TimeoutError("count query timed out"))
    clients: list[FakeInfluxClient] = []

    def factory(**kwargs: Any) -> FakeInfluxClient:
        client = FakeInfluxClient(api, **kwargs)
        clients.append(client)
        return client

    install_fake_influx_client(monkeypatch, factory)
    with backend_main._store_lock:
        backend_main._store_rows.clear()
        backend_main._store_rows.append({"seq": 0})

    response = TestClient(backend_main.app).get("/health")

    assert response.status_code == 200
    health = response.json()
    assert health["store_rows"] == 1
    assert health["influx_points"] is None
    assert clients[0].closed is True
