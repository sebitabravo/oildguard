from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from backend import main as backend_main
from sim.physics import pressure_kpa_from_volume


@pytest.fixture
def client(monkeypatch):
    store = backend_main.TelemetryStore(
        retention_rows=10,
        default_device=backend_main.DEFAULT_DEVICE,
    )
    store.on_clear(backend_main._FLEET_ROLLING.reset)
    store.on_clear(backend_main._OUTAGES.reset)
    reset_pins = getattr(backend_main._query_helpers, "reset_pinned_baselines", None)
    if reset_pins is not None:
        store.on_clear(reset_pins)
        reset_pins()
    monkeypatch.setattr(backend_main, "_STORE", store)
    monkeypatch.setattr(backend_main, "_store_lock", store.lock)
    monkeypatch.setattr(backend_main, "_store_rows", backend_main.StoreView(store))
    monkeypatch.setattr(backend_main, "_seen_signed_rows", backend_main._SeenView(store))
    monkeypatch.setattr(backend_main, "RETENTION_ROWS", store.retention_rows)
    monkeypatch.setattr(
        backend_main,
        "_write_to_influx",
        lambda rows: (
            "test-memory",
            {"code": "influx_written", "params": {"points": len(rows)}},
        ),
    )
    return TestClient(backend_main.app)


def _rows(volumes, *, start_seq=0, truth_liters=None, device_id="wheel-RH-01"):
    rows = []
    for index, volume in enumerate(volumes):
        seq = start_seq + index
        row = {
            "t_iso": datetime(2026, 1, 1, tzinfo=timezone.utc).isoformat(),
            "t_s": seq / 10,
            "seq": seq,
            "device_id": device_id,
            "fsm_state": "LOAD",
            "moving": 0,
            "recal_window": 1,
            "engine_on": 1,
            "slope_deg": 0.0,
            "rotor_rpm": 100.0,
            "wheel_rpm": 3.0,
            "rotating_sensor_regime": "static_pool",
            "submerged_fraction_per_revolution": 1.0,
            "pressure_kpa": pressure_kpa_from_volume(volume, 75.0),
            "temperature_c": 75.0,
            "vib_rms_g": 0.3,
            "vib_kurtosis": 2.0,
            "level_pct": 100.0 * (truth_liters if truth_liters is not None else volume) / 95.0,
            "link_down": 0,
            "label": "normal",
        }
        if truth_liters is not None:
            row["level_liters"] = truth_liters
        else:
            row["level_liters"] = volume
        rows.append(row)
    return rows


def _ingest(client, rows):
    response = client.post("/ingest", json={"rows": rows})
    assert response.status_code == 200, response.text


def test_level_endpoint_returns_pressure_estimate_and_validation_truth(client):
    _ingest(client, _rows([95.0] * 10, truth_liters=10.0))

    response = client.get("/level")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["level_liters"] == pytest.approx(95.0, abs=3.0)
    assert data["truth_liters"] == 10.0
    assert data["confidence"] != 0.0


def test_level_endpoint_keeps_last_rest_estimate_when_latest_rows_are_moving(client):
    _ingest(client, _rows([95.0] * 10))
    moving_rows = _rows([95.0] * 3, start_seq=10)
    for row in moving_rows:
        row["recal_window"] = 0
        row["moving"] = 1
        row["fsm_state"] = "HAUL"
    _ingest(client, moving_rows)

    response = client.get("/level")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["level_liters"] == pytest.approx(95.0, abs=3.0)
    assert data["estimate_seq"] == 9
    assert data["estimate_t_iso"] == moving_rows[0]["t_iso"]


def test_pinned_baseline_survives_eviction_and_tracks_later_leak(client):
    _ingest(client, _rows([95.0] * 10))
    assert client.get("/level").status_code == 200
    _ingest(client, _rows([60.0] * 10, start_seq=10))

    level_data = client.get("/level").json()["data"]
    series = client.get("/level/series?limit=2000").json()["series"]
    latest_series = next(point for point in reversed(series) if point["level_l"] is not None)

    assert level_data["level_liters"] == pytest.approx(60.0, abs=3.0)
    assert latest_series["level_l"] == pytest.approx(60.0, abs=3.0)


def test_ingest_pins_baseline_before_first_rest_window_is_evicted(client):
    _ingest(client, _rows([95.0] * 10))
    _ingest(client, _rows([60.0] * 10, start_seq=10))

    response = client.get("/level")

    assert response.status_code == 200
    assert response.json()["data"]["level_liters"] == pytest.approx(60.0, abs=3.0)


def test_fleet_latest_level_matches_estimate_not_ingested_truth(client):
    _ingest(client, _rows([95.0] * 10, truth_liters=10.0))

    level_data = client.get("/level").json()["data"]
    devices = client.get("/fleet/devices?alert_level=on").json()["devices"]
    device = next(item for item in devices if item["device_id"] == "wheel-RH-01")

    assert device["latest_level_liters"] == pytest.approx(95.0, abs=3.0)
    assert device["latest_level_liters"] == pytest.approx(level_data["level_liters"], abs=0.01)
    assert device["latest_level_liters"] != 10.0
