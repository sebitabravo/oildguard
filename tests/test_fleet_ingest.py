"""Ingesta en lotes con contrapresion y topicos MQTT por dispositivo (R2)."""

from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone

import pytest

from backend import main as backend_main
from backend.ingest_mqtt import decode_payload, device_from_topic, subscription_topics
from backend.pipeline import IngestPipeline
from shared.signing import sign_row

T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
NUMERIC = {
    "t_s", "slope_deg", "rotor_rpm", "wheel_rpm", "pressure_kpa",
    "temperature_c", "vib_rms_g", "vib_kurtosis", "level_liters", "level_pct",
}


def generated_row(device_id: str = "wheel-RH-01", seq: int = 0) -> dict:
    """Fila del generador de referencia con los numeros ya tipados."""
    from sim.generate import iter_rows

    row = next(iter_rows("clean", 0.1, device_id, 7, start=T0))
    row["seq"] = seq
    return {key: (float(value) if key in NUMERIC else value) for key, value in row.items()}


@pytest.fixture()
def clean_store(monkeypatch):
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
    return backend_main._STORE


# --------------------------------------------------------------------------
# Contrapresion
# --------------------------------------------------------------------------


def test_submit_drops_and_counts_when_the_bounded_queue_is_full():
    processed = []
    pipeline = IngestPipeline(process=lambda rows: processed.append(rows), max_batches=2)

    assert pipeline.submit([{"seq": 1}]) is True
    assert pipeline.submit([{"seq": 2}]) is True
    assert pipeline.submit([{"seq": 3}]) is False  # la cola esta llena

    assert pipeline.dropped_batches() == 1
    assert pipeline.depth() == 2
    # Lo descartado nunca se procesa: el drop es visible, no silencioso.
    assert processed == []


def test_drops_stay_visible_even_when_the_worker_catches_up():
    pipeline = IngestPipeline(process=lambda rows: {"accepted": list(rows)}, max_batches=1)
    pipeline.submit([{"seq": 1}])
    pipeline.submit([{"seq": 2}])

    assert pipeline.drain_once(timeout=0.01) is True
    assert pipeline.dropped_batches() == 1
    assert pipeline.drain_once(timeout=0.01) is False
    assert pipeline.dropped_batches() == 1


# --------------------------------------------------------------------------
# Worker
# --------------------------------------------------------------------------


def test_worker_processes_queued_batches_into_the_store(clean_store):
    pipeline = IngestPipeline(process=backend_main.verify_and_store, max_batches=8)

    assert pipeline.submit([generated_row("wheel-RH-01", 0), generated_row("wheel-RH-01", 1)]) is True
    assert pipeline.drain_once(timeout=0.5) is True

    assert [r["seq"] for r in clean_store.rows("wheel-RH-01")] == [0, 1]
    assert pipeline.accepted_batches() == 1


def test_worker_applies_the_same_signature_rules_as_http(clean_store, monkeypatch):
    """El worker no es un atajo permisivo: misma verificación que POST /ingest."""
    key = secrets.token_bytes(32)
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {"wheel-RH-01": key})
    monkeypatch.setattr(backend_main, "_REQUIRE_SIGNATURE", True)
    pipeline = IngestPipeline(process=backend_main.verify_and_store, max_batches=8)
    signed = sign_row(generated_row("wheel-RH-01", 0), key)
    replays_before = backend_main._rejected_reasons["replay"]

    pipeline.submit([signed])
    pipeline.drain_once(timeout=0.5)
    pipeline.submit([dict(signed)])
    pipeline.drain_once(timeout=0.5)

    assert len(clean_store.rows("wheel-RH-01")) == 1
    assert backend_main._rejected_reasons["replay"] == replays_before + 1

    # Una fila sin firma ya no entra: la reglas no se relajan en la cola.
    unsigned = generated_row("wheel-RH-01", 1)
    pipeline.submit([unsigned])
    pipeline.drain_once(timeout=0.5)
    assert len(clean_store.rows("wheel-RH-01")) == 1


def test_worker_accepts_unsigned_duplicates_when_signatures_are_permissive(clean_store, monkeypatch):
    """Sin identidad firmada no hay antireplay: cada fila sin firma es una fila."""
    monkeypatch.setattr(backend_main, "_REQUIRE_SIGNATURE", False)
    pipeline = IngestPipeline(process=backend_main.verify_and_store, max_batches=8)
    row = generated_row("wheel-RH-01", 0)

    pipeline.submit([row])
    pipeline.drain_once(timeout=0.5)
    pipeline.submit([dict(row)])
    pipeline.drain_once(timeout=0.5)

    assert len(clean_store.rows("wheel-RH-01")) == 2
    assert clean_store.replay_tracked("wheel-RH-01") == 0


def test_influx_writes_are_batched_until_the_row_threshold():
    flushed = []
    pipeline = IngestPipeline(
        process=lambda rows: {"accepted": list(rows)},
        flush=flushed.extend,
        max_batches=8,
        flush_rows=3,
        flush_seconds=60.0,
    )

    pipeline.submit([{"seq": 1}, {"seq": 2}])
    pipeline.drain_once(timeout=0.5)
    assert flushed == []  # aun por debajo del umbral

    pipeline.submit([{"seq": 3}])
    pipeline.drain_once(timeout=0.5)
    assert flushed == [{"seq": 1}, {"seq": 2}, {"seq": 3}]
    assert pipeline.pending_points() == 0


def test_influx_flushes_on_the_time_threshold_without_new_rows():
    flushed = []
    pipeline = IngestPipeline(
        process=lambda rows: {"accepted": list(rows)},
        flush=flushed.extend,
        max_batches=8,
        flush_rows=5000,
        flush_seconds=0.01,
    )

    pipeline.submit([{"seq": 1}])
    pipeline.drain_once(timeout=0.5)
    assert flushed == []

    # El siguiente drain expira y cierra la ventana temporal.
    assert pipeline.drain_once(timeout=0.02) is False
    assert flushed == [{"seq": 1}]


def test_disabled_influx_never_buffers_points():
    flushed = []
    pipeline = IngestPipeline(
        process=lambda rows: {"accepted": list(rows)},
        flush=flushed.extend,
        max_batches=8,
        flush_rows=1,
        flush_seconds=0.01,
        influx_enabled=False,
    )

    pipeline.submit([{"seq": 1}])
    pipeline.drain_once(timeout=0.5)
    pipeline.drain_once(timeout=0.02)

    assert flushed == []
    assert pipeline.pending_points() == 0


def test_a_failing_batch_does_not_kill_the_worker():
    calls = []

    def flaky(rows):
        calls.append(rows)
        if len(calls) == 1:
            raise RuntimeError("boom")
        return {"accepted": list(rows)}

    pipeline = IngestPipeline(process=flaky, max_batches=8)
    pipeline.submit([{"seq": 1}])
    assert pipeline.drain_once(timeout=0.5) is True
    pipeline.submit([{"seq": 2}])
    assert pipeline.drain_once(timeout=0.5) is True

    assert len(calls) == 2
    assert pipeline.failed_batches() == 1


def test_influx_write_disabled_env_keeps_the_backend_off_influxdb(monkeypatch):
    import sys
    from types import ModuleType

    class ExplodingClient:
        def __init__(self, **_kwargs):
            raise AssertionError("no debe abrirse un cliente Influx cuando esta deshabilitado")

    module = ModuleType("influxdb_client")
    module.InfluxDBClient = ExplodingClient
    monkeypatch.setitem(sys.modules, "influxdb_client", module)
    monkeypatch.setattr(backend_main, "_INFLUX_WRITE", False)

    status, structured = backend_main._write_to_influx([{"seq": 1}])

    assert status == "disabled (OILGUARD_INFLUX_WRITE=0); rows kept in memory"
    assert structured == {"code": "influx_client_missing", "params": {}}


def test_main_pipeline_starts_without_a_broker_and_reports_backpressure():
    assert backend_main.INGEST_QUEUE_BATCHES > 0
    assert backend_main.INGEST_FLUSH_ROWS == 5000
    assert backend_main.INGEST_FLUSH_SECONDS == pytest.approx(1.0)
    assert backend_main._PIPELINE.depth() == 0


# --------------------------------------------------------------------------
# Topicos MQTT
# --------------------------------------------------------------------------


def test_bridge_subscribes_to_the_legacy_and_per_device_topics():
    assert subscription_topics() == ("oilguard/signals", "oilguard/signals/+")


def test_decode_payload_accepts_the_per_device_topic():
    payload = json.dumps({"rows": [generated_row()]}).encode()

    rows = decode_payload(payload, "oilguard/signals/wheel-RH-01")

    assert len(rows) == 1
    assert rows[0]["device_id"] == "wheel-RH-01"


def test_decode_payload_never_overrides_a_device_id_signed_in_the_payload():
    """device_id es campo firmado: pisarlo desde el topic romperia el HMAC."""
    payload = json.dumps({"rows": [generated_row("wheel-RH-02")]}).encode()

    rows = decode_payload(payload, "oilguard/signals/wheel-RH-01")

    assert rows[0]["device_id"] == "wheel-RH-02"


def test_decode_payload_fills_a_missing_device_id_from_the_topic():
    row = generated_row("wheel-RH-01")
    row.pop("device_id")
    payload = json.dumps({"rows": [row]}).encode()

    rows = decode_payload(payload, "oilguard/signals/wheel-RH-09")

    assert rows[0]["device_id"] == "wheel-RH-09"


def test_decode_payload_still_accepts_the_legacy_single_row_object():
    payload = json.dumps(generated_row()).encode()

    assert decode_payload(payload, "oilguard/signals") == [generated_row()]


def test_decode_payload_still_rejects_malformed_and_empty_batches():
    with pytest.raises(ValueError):
        decode_payload(b"not json", "oilguard/signals")
    with pytest.raises(ValueError):
        decode_payload(json.dumps({"rows": []}).encode(), "oilguard/signals")


@pytest.mark.parametrize(
    ("topic", "expected"),
    [
        ("oilguard/signals", None),
        ("oilguard/signals/wheel-RH-01", "wheel-RH-01"),
        ("oilguard/signals/wheel-RH-01/extra", None),
        ("oilguard/other/wheel-RH-01", None),
    ],
)
def test_device_from_topic_only_matches_the_per_device_shape(topic, expected):
    assert device_from_topic(topic) == expected
