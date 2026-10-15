"""Humo del backend FastAPI sin InfluxDB ni MQTT: cae a la memoria."""

from datetime import datetime, timezone
import builtins

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


def test_level_series_empty_store_reports_no_rows(client):
    response = client.get("/level/series")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["kind"] == "oil-level-series"
    assert payload["series"] == []
    assert payload["reason"] == "no_rows"


def test_level_series_returns_fused_fields_sorted_by_sequence(client):
    rows = batch(seconds=60)["rows"]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200

    with backend_main._store_lock:
        backend_main._store_rows.reverse()

    response = client.get("/level/series?limit=2000")

    assert response.status_code == 200
    payload = response.json()
    assert payload["reason"] is None
    series = payload["series"]
    assert len(series) == len(rows)
    # truth_liters es aditivo (F2) y solo aparece cuando las filas traen la
    # verdad del generador, que es el caso de estas.
    assert set(series[0]) == {
        "t_s", "level_l", "sigma_l", "moving", "recal_window", "truth_liters",
    }
    assert all(point["truth_liters"] is not None for point in series)
    assert [point["t_s"] for point in series] == sorted(point["t_s"] for point in series)
    assert all(point["sigma_l"] is not None for point in series)
    assert any(point["level_l"] is not None for point in series)
    assert any(point["moving"] == 1 and point["level_l"] is None for point in series)


def test_level_series_downsamples_evenly_and_enforces_limit_bounds(client):
    rows = batch(seconds=120)["rows"]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200

    default = client.get("/level/series").json()["series"]
    limited = client.get("/level/series?limit=23").json()["series"]
    maximum = client.get("/level/series?limit=2000").json()["series"]

    assert len(default) == 300
    assert len(limited) == 23
    assert len(maximum) == len(rows)
    assert limited[0]["t_s"] == maximum[0]["t_s"]
    assert limited[-1]["t_s"] == maximum[-1]["t_s"]
    gaps = [right["t_s"] - left["t_s"] for left, right in zip(limited, limited[1:])]
    assert max(gaps) - min(gaps) <= 0.11
    assert client.get("/level/series?limit=2001").status_code == 422


def test_slow_leak_batch_produces_an_rul_through_the_api(client):
    rate = 128.5  # %/h acelerado de laboratorio, ~4 L en 120 s
    rows = []
    for r in iter_rows("slow-leak", 120.0, "wheel-RH-01", 7, leak_pct_per_h=rate, start=T0):
        rows.append({k: (float(v) if k in NUMERIC else v) for k, v in r.items()})
    assert client.post("/ingest", json={"rows": rows}).status_code == 200
    data = client.get("/rul").json()["data"]
    assert data["status"] == "ok"
    assert data["hours"] is not None


def test_rul_suppression_note_composes_reason_and_anomaly_fallback_once(client, monkeypatch):
    assert client.post("/ingest", json=batch(seconds=0.1)).status_code == 200
    reason = "trend too weak (R2=0.001 < 0.3); anomaly-only"
    reason_message = {
        "code": "rul_trend_too_weak",
        "params": {"r2": 0.001, "minimum_r2": 0.3},
    }

    def evaluate(_samples, baseline=None):
        return {
            "rul": {
                "status": "suppressed",
                "reason": reason,
                "reason_message": reason_message,
            }
        }

    monkeypatch.setattr(
        backend_main,
        "_load_t10_evaluator",
        lambda: (evaluate, None),
    )
    response = client.get("/rul")
    assert response.status_code == 200
    data = response.json()["data"]

    assert data["note"] == (
        "RUL unavailable: trend too weak (R2=0.001 < 0.3); "
        "anomaly-only alerts remain available."
    )
    assert data["reason_message"] == reason_message
    assert data["note_message"] == {
        "code": "rul_suppressed_summary",
        "params": {},
    }


def test_health_reports_memory_fallback(client):
    h = client.get("/health")
    assert h.status_code == 200
    assert h.json()["status"] == "ok"
    assert h.json()["analysis"] == {"available": True, "reason": None}


def test_empty_store_keeps_healthy_but_unevaluated_semantics(client):
    health = client.get("/health").json()
    alerts = client.get("/alerts").json()
    rul = client.get("/rul").json()

    assert health["status"] == "ok"
    assert health["analysis"] == {"available": True, "reason": None}
    assert alerts["status"] == "ok"
    assert alerts["evaluated"] is False
    assert alerts["reason"] == "no_rows"
    assert alerts["data"]["escalation"] == []
    assert rul["status"] == "ok"
    assert rul["evaluated"] is False
    assert rul["reason"] == "no_rows"
    assert rul["data"]["status"] == "suppressed"


def test_insufficient_rest_samples_are_healthy_but_unevaluated(client):
    assert client.post("/ingest", json=batch(seconds=0.1)).status_code == 200

    alerts = client.get("/alerts").json()
    rul = client.get("/rul").json()

    assert alerts["status"] == "ok"
    assert alerts["evaluated"] is False
    assert alerts["reason"] == "insufficient_rest_samples"
    assert rul["status"] == "ok"
    assert rul["evaluated"] is False
    assert rul["reason"] == "insufficient_rest_samples"


def test_loaded_analyzer_reports_real_evaluation_for_alerts_and_rul(client):
    assert client.post("/ingest", json=batch()).status_code == 200

    health = client.get("/health").json()
    alerts = client.get("/alerts").json()
    rul = client.get("/rul").json()

    assert health["analysis"] == {"available": True, "reason": None}
    assert alerts["status"] == "ok"
    assert alerts["evaluated"] is True
    assert "reason" not in alerts
    assert rul["status"] == "ok"
    assert rul["evaluated"] is True
    assert "reason" not in rul
    assert rul["data"]["status"] == "suppressed"


def test_missing_analyzer_import_degrades_health_and_routes(client, monkeypatch):
    assert client.post("/ingest", json=batch()).status_code == 200
    original_import = builtins.__import__

    def import_without_analyzer(name, globals=None, locals=None, fromlist=(), level=0):
        if name == "ai.ladder":
            raise ModuleNotFoundError("No module named 'sim'")
        return original_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr(builtins, "__import__", import_without_analyzer)

    health_response = client.get("/health")
    alerts_response = client.get("/alerts")
    rul_response = client.get("/rul")
    health = health_response.json()
    alerts = alerts_response.json()
    rul = rul_response.json()

    assert health_response.status_code == 200
    assert health["status"] == "degraded"
    assert health["analysis"]["available"] is False
    assert health["analysis"]["reason"]
    assert alerts_response.status_code == 200
    assert alerts["status"] == "unavailable"
    assert alerts["evaluated"] is False
    assert alerts["reason"] == "analysis_unavailable"
    assert rul_response.status_code == 200
    assert rul["status"] == "unavailable"
    assert rul["evaluated"] is False
    assert rul["reason"] == "analysis_unavailable"


def test_legacy_four_field_payload_is_rejected(client):
    r = client.post("/ingest", json={"device_id": "x", "pressure_kpa": 1.0})
    assert r.status_code == 422


def test_generated_t10_fields_survive_http_ingest(client, monkeypatch):
    monkeypatch.setattr(
        backend_main,
        "_write_to_influx",
        lambda rows: (
            "test-memory",
            {"code": "influx_written", "params": {"points": len(rows)}},
        ),
    )
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
