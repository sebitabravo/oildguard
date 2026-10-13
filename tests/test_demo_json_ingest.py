import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from backend import main as backend_main
from sim import feeder
from shared.signing import derive_device_key, sign_row


def test_first_json_demo_batch_is_accepted_by_ingest(monkeypatch):
    master_key = bytes.fromhex("ab" * 32)
    monkeypatch.setenv("OILGUARD_DEVICE_MASTER_KEY", master_key.hex())
    monkeypatch.setattr(backend_main, "_DEVICE_MASTER_KEY", master_key)
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {})
    monkeypatch.setattr(backend_main, "_DEVICE_KEY_CACHE", {})
    monkeypatch.setattr(backend_main, "_REQUIRE_SIGNATURE", True)
    monkeypatch.setattr(
        backend_main,
        "_write_to_influx",
        lambda rows: ("test-memory", {"code": "influx_written", "params": {"points": len(rows)}}),
    )
    with backend_main._store_lock:
        backend_main._store_rows.clear()
        backend_main._seen_signed_rows.clear()
        backend_main._verified_total = 0
        backend_main._rejected_total = 0
        backend_main._rejected_reasons.clear()

    payload = json.loads((Path(__file__).resolve().parents[1] / "sim" / "demo-data.json").read_text())
    device_key = derive_device_key(master_key, "wheel-RH-01")
    rows = [sign_row(row, device_key) for row in payload["demo"]["ingestRows"][:10]]
    response = TestClient(backend_main.app).post("/ingest", json={"rows": rows})

    assert response.status_code == 200
    assert response.json()["ingested"] > 0


def test_feeder_stream_uses_json_templates_and_advances_signed_batches(monkeypatch):
    master_key = bytes.fromhex("ab" * 32)
    monkeypatch.setenv("OILGUARD_DEVICE_MASTER_KEY", master_key.hex())
    monkeypatch.setattr(
        feeder,
        "iter_rows",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("generator must not feed demo stream")),
        raising=False,
    )

    injected_now = datetime(2030, 5, 6, 12, 30, tzinfo=timezone.utc)
    batches = feeder.iter_batches(
        seed=7,
        start=datetime(2026, 1, 1, tzinfo=timezone.utc),
        seconds=2.0,
        calibration_seconds=2.0,
        clock=lambda: injected_now,
    )
    first = next(batches)
    second = next(batches)

    assert [row["seq"] for row in first] == list(range(10))
    assert [row["seq"] for row in second] == list(range(10, 20))
    assert first[0]["t_s"] == "0.0"
    assert second[0]["t_s"] == "1.0"
    assert all(
        abs((datetime.fromisoformat(row["t_iso"]) - injected_now).total_seconds()) <= 120
        for row in (first[0], second[0])
    )
    assert all("sig" in row and "sig_v" in row for row in first + second)
