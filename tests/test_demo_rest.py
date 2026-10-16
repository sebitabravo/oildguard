from datetime import datetime, timezone
import threading

from fastapi.testclient import TestClient

from backend import main as backend_main
from sim import feeder


def test_accelerated_demo_rest_stream_evaluates_rul(monkeypatch):
    master_key = bytes.fromhex("ab" * 32)
    monkeypatch.setenv("OILGUARD_DEVICE_MASTER_KEY", master_key.hex())
    monkeypatch.setattr(backend_main, "_DEVICE_MASTER_KEY", master_key)
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {})
    monkeypatch.setattr(backend_main, "_DEVICE_KEY_CACHE", {})
    monkeypatch.setattr(backend_main, "_REQUIRE_SIGNATURE", True)
    monkeypatch.setattr(
        backend_main,
        "_write_to_influx",
        lambda rows: (
            "test-memory",
            {"code": "influx_written", "params": {"points": len(rows)}},
        ),
    )
    with backend_main._store_lock:
        backend_main._store_rows.clear()
        backend_main._seen_signed_rows.clear()
        backend_main._verified_total = 0
        backend_main._rejected_total = 0
        backend_main._rejected_reasons.clear()

    client = TestClient(backend_main.app)
    batches = feeder.iter_batches(
        seed=7,
        start=datetime(2026, 1, 1, tzinfo=timezone.utc),
        seconds=120,
        target_drop_l=4,
    )
    batch_count = 0
    for batch in batches:
        assert client.post("/ingest", json={"rows": batch}).status_code == 200
        batch_count += 1

    assert batch_count == 120

    response = client.get("/rul")
    assert response.status_code == 200
    result = response.json()
    assert result["evaluated"] is True
    assert result["data"]["status"] == "ok"
    assert result["data"]["hours"] is not None
    assert result["data"]["confidence_band"] is not None


def test_run_uses_long_lived_stream_with_demo_acceleration(monkeypatch):
    requested_horizons = []
    stop = threading.Event()

    def batches(**kwargs):
        requested_horizons.append(kwargs)
        yield []
        yield []

    def post_batch(_rows):
        stop.set()
        return 1

    monkeypatch.setattr(feeder, "iter_batches", batches)
    monkeypatch.setattr(feeder, "post_batch", post_batch)
    monkeypatch.setattr(stop, "wait", lambda _seconds: None)

    assert feeder.run(stop) == (1, 1, 0)
    assert requested_horizons == [
        {
            "seconds": 86400,
            "calibration_seconds": 120,
            "leak_l_per_h": None,
            "floor_l": 0.0,
        }
    ]
