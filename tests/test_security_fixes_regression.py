import importlib
import os
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend import influx_writer, main as backend_main
from ai import anomaly


ROOT = Path(__file__).resolve().parents[1]


def test_influx_writer_startup_rejects_missing_token():
    keys = ("INFLUXDB_TOKEN", "OILGUARD_INFLUX_WRITE")
    original = {key: os.environ.get(key) for key in keys}
    was_set = {key: key in os.environ for key in keys}
    try:
        os.environ.pop("INFLUXDB_TOKEN", None)
        os.environ["OILGUARD_INFLUX_WRITE"] = "1"
        importlib.reload(backend_main)
        if backend_main.INFLUXDB_TOKEN:
            pytest.fail("INFLUXDB_TOKEN must be empty when unset in the environment")

        with pytest.raises(RuntimeError, match="INFLUXDB_TOKEN.*required"):
            with TestClient(backend_main.app):
                pass
    finally:
        for key in keys:
            if was_set[key]:
                os.environ[key] = original[key] or ""
            else:
                os.environ.pop(key, None)
        importlib.reload(backend_main)


def test_compose_credentials_are_required_variables_without_defaults():
    compose = (ROOT / "docker-compose.yml").read_text()
    assignments = re.findall(
        r"(?m)^\s*(DOCKER_INFLUXDB_INIT_PASSWORD|DOCKER_INFLUXDB_INIT_ADMIN_TOKEN|INFLUXDB_TOKEN):\s*(.+)$",
        compose,
    )
    assert len(assignments) == 3
    assert all(re.fullmatch(r"\$\{[A-Z0-9_]+\}", value.strip()) for _, value in assignments)

    example = (ROOT / ".env.example").read_text()
    assert "<change-me>" in example
    assert "oilguard-local-admin-token" not in example


def test_disallowed_cors_origin_is_not_reflected():
    client = TestClient(backend_main.app)
    response = client.get("/health", headers={"Origin": "https://untrusted.example"})

    assert "access-control-allow-origin" not in response.headers


def test_line_protocol_rejects_newline_device_id():
    with pytest.raises(ValueError, match="device_id.*line break"):
        influx_writer.encode_row({
            "t_iso": "2026-01-01T00:00:00+00:00",
            "device_id": "wheel-1\nlevel_liters=999",
            "level_liters": 95,
        })


def test_anomaly_baseline_raises_value_error_when_samples_are_invalid():
    with pytest.raises(ValueError, match="no valid baseline samples"):
        anomaly.fit_baseline([{
            "row": {"t_s": "1", "pressure_kpa": "not-numeric", "temperature_c": "NaN"},
            "window": {"window_id": "window-1"},
        }])


def test_level_series_returns_json_error_when_estimator_rejects_baseline(monkeypatch):
    temporary_store = backend_main.TelemetryStore(
        retention_rows=backend_main.RETENTION_ROWS,
        default_device="regression-device",
    )
    monkeypatch.setattr(backend_main, "_STORE", temporary_store)
    monkeypatch.setattr(backend_main, "_store_lock", temporary_store.lock)
    for seq in range(10):
        temporary_store.append_row({
            "device_id": "regression-device",
            "seq": seq,
            "t_s": float(seq),
            "pressure_kpa": "not-numeric",
            "temperature_c": "NaN",
            "recal_window": 1,
            "moving": 0,
        })

    client = TestClient(backend_main.app)
    response = client.get("/level/series?device_id=regression-device")

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/json")
    assert response.json()["detail"] == "no valid baseline samples (pressure/temperature parse failed)"
