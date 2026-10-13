from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend import main as backend_main
from sim.feeder import configured_ingest_url, first_batch


def test_feeder_ingest_url_uses_configured_backend_port(monkeypatch):
    monkeypatch.setenv("OILGUARD_DEMO_BACKEND_PORT", "8123")

    assert configured_ingest_url() == "http://127.0.0.1:8123/ingest"


def test_feeder_ingest_url_defaults_to_port_8001(monkeypatch):
    monkeypatch.delenv("OILGUARD_DEMO_BACKEND_PORT", raising=False)

    assert configured_ingest_url() == "http://127.0.0.1:8001/ingest"


def test_first_demo_feeder_batch_is_accepted(monkeypatch):
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

    rows = first_batch(
        seed=7,
        start=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    response = TestClient(backend_main.app).post("/ingest", json={"rows": rows})

    assert response.status_code == 200
    assert response.json()["ingested"] > 0
