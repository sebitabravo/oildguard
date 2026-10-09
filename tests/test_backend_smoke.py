"""Humo del backend FastAPI sin InfluxDB ni MQTT: cae a la memoria."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from backend import main as backend_main
from sim.generate import iter_rows

T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
NUMERIC = ("t_s", "slope_deg", "rotor_rpm", "wheel_rpm", "pressure_kpa", "temperature_c",
           "vib_rms_g", "vib_kurtosis", "level_liters", "level_pct")


@pytest.fixture()
def client():
    with backend_main._store_lock:
        backend_main._store_rows.clear()
    # Sin context manager: no dispara el evento startup (sondeo de Influx / puente MQTT).
    return TestClient(backend_main.app)


def batch(seconds=60.0, scenario="clean"):
    """El generador emite strings formateados; el contrato de /ingest espera números."""
    rows = []
    for r in iter_rows(scenario, seconds, "wheel-RH-01", 7, start=T0):
        rows.append({k: (float(v) if k in NUMERIC else v) for k, v in r.items()})
    return {"rows": rows}


def test_ingest_then_query_endpoints_return_200_with_expected_keys(client):
    r = client.post("/ingest", json=batch())
    assert r.status_code == 200
    assert r.json()["ingested"] == 600

    level = client.get("/level")
    assert level.status_code == 200
    data = level.json()["data"]
    assert {"level_liters", "level_pct", "pressure_kpa", "capacity_liters"} <= set(data)
    assert data["pressure_kpa"] < 5.0

    alerts = client.get("/alerts")
    assert alerts.status_code == 200
    assert {"alerts", "escalation", "rul_status", "model"} <= set(alerts.json()["data"])

    rul = client.get("/rul")
    assert rul.status_code == 200
    rul_data = rul.json()["data"]
    assert {"hours", "status", "anomaly_only", "model"} <= set(rul_data)
    assert rul_data["anomaly_only"] is True


def test_slow_leak_batch_produces_an_rul_through_the_api(client):
    rate = 128.5  # %/h acelerado de laboratorio, ~4 L en 120 s
    rows = []
    for r in iter_rows("slow-leak", 120.0, "wheel-RH-01", 7, leak_pct_per_h=rate, start=T0):
        rows.append({k: (float(v) if k in NUMERIC else v) for k, v in r.items()})
    assert client.post("/ingest", json={"rows": rows}).status_code == 200
    data = client.get("/rul").json()["data"]
    assert data["status"] == "ok"
    assert data["hours"] is not None


def test_health_reports_memory_fallback(client):
    h = client.get("/health")
    assert h.status_code == 200
    assert h.json()["status"] == "ok"


def test_legacy_four_field_payload_is_rejected(client):
    r = client.post("/ingest", json={"device_id": "x", "pressure_kpa": 1.0})
    assert r.status_code == 422


def test_generated_t10_fields_survive_http_ingest(client, monkeypatch):
    monkeypatch.setattr(backend_main, "_write_to_influx", lambda _rows: "test-memory")
    generated = next(iter_rows("clean", 0.1, "wheel-RH-01", 7, start=T0))
    response = client.post("/ingest", json={"rows": [generated]})
    assert response.status_code == 200

    with backend_main._store_lock:
        stored = dict(backend_main._store_rows[-1])

    assert "rotating_sensor_regime" in stored
    assert stored["rotating_sensor_regime"] == generated["rotating_sensor_regime"]
    assert isinstance(stored["submerged_fraction_per_revolution"], float)
    assert stored["submerged_fraction_per_revolution"] == float(
        generated["submerged_fraction_per_revolution"]
    )


def test_mqtt_csv_parser_types_t10_fraction_without_publishing():
    from backend.ingest_mqtt import parse_csv_row

    generated = next(iter_rows("clean", 0.1, "wheel-RH-01", 7, start=T0))
    parsed = parse_csv_row(generated)

    assert isinstance(parsed["submerged_fraction_per_revolution"], float)
    assert parsed["rotating_sensor_regime"] == generated["rotating_sensor_regime"]
