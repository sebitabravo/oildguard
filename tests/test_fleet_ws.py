"""Stream WebSocket de flota: tick por segundo y ventana configurable (R2)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend import main as backend_main
from backend.aggregates import DEFAULT_METRICS


def _row(device_id: str, seq: int, t_s: float, pressure: float) -> dict:
    return {
        "t_iso": f"2026-01-01T00:00:{seq:02d}+00:00",
        "t_s": t_s,
        "seq": seq,
        "device_id": device_id,
        "fsm_state": "LOAD",
        "moving": 0,
        "recal_window": 1,
        "engine_on": 1,
        "slope_deg": 0.1,
        "rotor_rpm": 100.0,
        "wheel_rpm": 3.0,
        "rotating_sensor_regime": "static_pool",
        "submerged_fraction_per_revolution": 1.0,
        "pressure_kpa": pressure,
        "temperature_c": 40.0,
        "vib_rms_g": 0.2,
        "vib_kurtosis": 2.0,
        "level_liters": 90.0,
        "level_pct": 95.0,
        "link_down": 0,
        "label": "normal",
    }


@pytest.fixture()
def client():
    with backend_main._store_lock:
        backend_main._store_rows.clear()
    backend_main._INGEST_METRICS.reset()
    # Sin context manager: no dispara el startup (sondeo de Influx / puente MQTT).
    return TestClient(backend_main.app)


@pytest.fixture()
def seeded(client):
    rows = [_row("wheel-A", seq, float(seq), float(seq + 1)) for seq in range(5)]
    rows += [_row("wheel-B", seq, float(seq + 5), float(seq + 11)) for seq in range(5)]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200
    return client


def test_first_tick_arrives_with_the_documented_shape(seeded):
    with seeded.websocket_connect("/ws/fleet") as socket:
        tick = socket.receive_json()

    assert tick["type"] == "fleet_tick"
    assert tick["as_of"]
    assert tick["window_s"] == 10
    assert tick["quantile_interpolation"] == "linear"
    assert sorted(tick["aggregates"]) == sorted(DEFAULT_METRICS)
    assert tick["aggregates"]["pressure_kpa"]["count"] == 10
    assert tick["aggregates"]["pressure_kpa"]["devices"] == 2
    assert tick["rows"] == 10
    assert tick["devices"] == 2
    assert "latency_p50_s" in tick["ingest"]
    assert tick["ingest"]["queue_depth"] == 0


def test_client_can_change_the_window(seeded):
    with seeded.websocket_connect("/ws/fleet") as socket:
        assert socket.receive_json()["window_s"] == 10

        socket.send_json({"window_s": 300})
        assert socket.receive_json()["window_s"] == 300


@pytest.mark.parametrize("payload", [{"window_s": 0}, {"window_s": 301}, {"window_s": "x"}, {}, "nope"])
def test_invalid_window_is_ignored_and_the_stream_survives(seeded, payload):
    with seeded.websocket_connect("/ws/fleet") as socket:
        assert socket.receive_json()["window_s"] == 10

        socket.send_json(payload)
        assert socket.receive_json()["window_s"] == 10


def test_tick_on_an_empty_store_is_still_well_formed(client):
    with client.websocket_connect("/ws/fleet") as socket:
        tick = socket.receive_json()

    assert tick["type"] == "fleet_tick"
    assert tick["rows"] == 0
    assert tick["aggregates"] == {}


def test_disconnect_is_handled_without_errors(seeded):
    """Salir a mitad del stream no debe dejar tareas colgadas ni excepciones."""
    with pytest.raises(RuntimeError):
        with seeded.websocket_connect("/ws/fleet") as socket:
            assert socket.receive_json()["type"] == "fleet_tick"
            raise RuntimeError("client vanished mid-stream")


def test_tick_payload_is_json_serialisable_for_every_metric(seeded):
    import json

    with seeded.websocket_connect("/ws/fleet") as socket:
        tick = socket.receive_json()

    json.dumps(tick)  # no debe haber nan/inf rompejson
    for block in tick["aggregates"].values():
        assert set(block) == {"mean", "p50", "p95", "p99", "min", "max", "count", "devices"}