"""Metricas de ingesta: ventanas rodantes, contrapresion y latencia (R2)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend import main as backend_main
from backend.metrics import IngestMetrics, RollingCounter, RollingLatency


class Clock:
    """Reloj controlado para que las ventanas no dependan del tiempo real."""

    def __init__(self, start: float = 1_000_000.0):
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def test_rolling_counter_reports_one_and_ten_second_windows():
    clock = Clock()
    counter = RollingCounter(window_s=10.0, now_fn=clock)

    counter.add(5, clock.now)
    assert counter.total(1.0, clock.now) == 5
    assert counter.total(10.0, clock.now) == 5

    clock.advance(2)
    counter.add(3, clock.now)
    assert counter.total(1.0, clock.now) == 3
    # Consultar la ventana corta no puede borrar lo que la larga aun necesita.
    assert counter.total(10.0, clock.now) == 8


def test_rolling_counter_drops_samples_that_leave_the_window():
    clock = Clock()
    counter = RollingCounter(window_s=10.0, now_fn=clock)

    counter.add(7, clock.now)
    clock.advance(11)

    assert counter.total(10.0, clock.now) == 0
    assert counter.total(1.0, clock.now) == 0


def test_rolling_counter_keeps_a_total_that_never_expires():
    clock = Clock()
    counter = RollingCounter(window_s=10.0, now_fn=clock)

    counter.add(2, clock.now)
    clock.advance(100)
    counter.add(1, clock.now)

    assert counter.cumulative() == 3
    assert counter.total(10.0, clock.now) == 1


def test_latency_percentiles_match_hand_computed_linear_quantiles():
    clock = Clock()
    latency = RollingLatency(window_s=10.0, now_fn=clock)

    for value in (0.5, 0.1, 0.3, 0.2, 0.4):
        latency.observe(value, clock.now)

    snapshot = latency.snapshot(clock.now)

    assert snapshot["count"] == 5
    assert snapshot["p50_s"] == pytest.approx(0.3)
    assert snapshot["p95_s"] == pytest.approx(0.48)
    assert snapshot["p99_s"] == pytest.approx(0.496)
    assert snapshot["min_s"] == pytest.approx(0.1)
    assert snapshot["max_s"] == pytest.approx(0.5)
    assert snapshot["mean_s"] == pytest.approx(0.3)


def test_latency_is_empty_before_any_sample():
    clock = Clock()

    snapshot = RollingLatency(now_fn=clock).snapshot(clock.now)

    assert snapshot["count"] == 0
    assert snapshot["p50_s"] is None


def test_negative_and_huge_latencies_are_ignored_but_counted():
    clock = Clock()
    latency = RollingLatency(window_s=10.0, now_fn=clock)

    latency.observe(0.25, clock.now)
    latency.observe(-5.0, clock.now)  # reloj del emisor adelantado
    latency.observe(99_999.0, clock.now)  # t_iso roto o emisor parado

    snapshot = latency.snapshot(clock.now)

    assert snapshot["count"] == 1
    assert snapshot["invalid_samples"] == 2


def test_latency_samples_expire_outside_the_window():
    clock = Clock()
    latency = RollingLatency(window_s=10.0, now_fn=clock)

    latency.observe(0.2, clock.now)
    clock.advance(11)

    assert latency.snapshot(clock.now)["count"] == 0


def test_latency_sample_buffer_is_bounded_under_sustained_load():
    clock = Clock()
    latency = RollingLatency(window_s=10.0, max_samples=100, now_fn=clock)

    for index in range(500):
        latency.observe(index / 1000.0, clock.now)

    snapshot = latency.snapshot(clock.now)

    assert snapshot["count"] == 100
    assert snapshot["dropped_samples"] == 400


def test_ingest_metrics_snapshot_shape_is_stable():
    clock = Clock()
    metrics = IngestMetrics(window_s=10.0, now_fn=clock)

    metrics.record(accepted=4, rejected=1, latency_s=0.2)
    snapshot = metrics.snapshot(now=clock.now, queue={"depth": 2, "dropped_batches": 1})

    assert snapshot["rows"]["accepted_1s"] == 4
    assert snapshot["rows"]["rejected_1s"] == 1
    assert snapshot["rows"]["accepted_10s"] == 4
    assert snapshot["rows"]["rejected_total"] == 1
    assert snapshot["queue"]["depth"] == 2
    assert snapshot["queue"]["dropped_batches"] == 1
    assert snapshot["latency"]["p50_s"] == pytest.approx(0.2)
    assert snapshot["latency"]["percentile_method"] == "linear"
    assert snapshot["latency"]["definition"] == "receive time - t_iso"


# --------------------------------------------------------------------------
# Rutas HTTP
# --------------------------------------------------------------------------


@pytest.fixture()
def client(monkeypatch):
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
    backend_main._INGEST_METRICS.reset()
    # Sin context manager: no dispara el startup (sondeo de Influx / puente MQTT).
    return TestClient(backend_main.app)


def test_metrics_endpoint_reports_counters_queue_and_latency(client):
    assert client.post("/ingest", json={"rows": [_row(seq) for seq in range(3)]}).status_code == 200

    response = client.get("/metrics/ingest")

    assert response.status_code == 200
    payload = response.json()
    assert payload["kind"] == "ingest-metrics"
    assert payload["ingest"]["rows"]["accepted_total"] == 3
    assert payload["ingest"]["queue"]["capacity"] == backend_main.INGEST_QUEUE_BATCHES
    assert payload["ingest"]["latency"]["count"] == 3
    assert payload["ingest"]["influx"]["enabled"] is True


def test_metrics_endpoint_survives_an_empty_store(client):
    response = client.get("/metrics/ingest")

    assert response.status_code == 200
    assert response.json()["ingest"]["latency"]["count"] == 0


def test_health_exposes_a_compact_ingest_object(client):
    client.post("/ingest", json={"rows": [_row(0)]})

    ingest = client.get("/health").json()["ingest"]

    assert ingest["queue_depth"] == 0
    assert ingest["dropped_batches"] == 0
    assert ingest["accepted_rows_10s"] == 1
    assert ingest["latency_p95_s"] is not None
    assert set(ingest) <= {"queue_depth", "dropped_batches", "accepted_rows_10s",
                           "rejected_rows_10s", "latency_p50_s", "latency_p95_s",
                           "latency_p99_s"}  # compacto: no duplica /metrics/ingest


def test_metrics_counts_dropped_batches_from_a_full_queue(client, monkeypatch):
    pipeline = backend_main.IngestPipeline(
        process=lambda rows: {"accepted": list(rows)},
        max_batches=1,
        influx_enabled=False,
    )
    monkeypatch.setattr(backend_main, "_PIPELINE", pipeline)
    pipeline.submit([{"seq": 1}])
    pipeline.submit([{"seq": 2}])

    payload = client.get("/metrics/ingest").json()["ingest"]

    assert payload["queue"]["dropped_batches"] == 1
    assert payload["queue"]["depth"] == 1


def _row(seq: int) -> dict:
    from datetime import datetime, timezone

    return {
        "t_iso": datetime.now(timezone.utc).isoformat(),
        "t_s": float(seq),
        "seq": seq,
        "device_id": "wheel-RH-01",
        "fsm_state": "LOAD",
        "moving": 0,
        "recal_window": 1,
        "engine_on": 1,
        "slope_deg": 0.1,
        "rotor_rpm": 100.0,
        "wheel_rpm": 3.0,
        "rotating_sensor_regime": "static_pool",
        "submerged_fraction_per_revolution": 1.0,
        "pressure_kpa": 2.0,
        "temperature_c": 40.0,
        "vib_rms_g": 0.2,
        "vib_kurtosis": 2.0,
        "level_liters": 90.0,
        "level_pct": 95.0,
        "link_down": 0,
        "label": "normal",
    }