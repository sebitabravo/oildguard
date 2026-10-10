"""Escritor de Influx asincrono: el ingest nunca espera a la base (R2c)."""

from __future__ import annotations

import threading
import time

import pytest
from fastapi.testclient import TestClient

from backend import main as backend_main
from backend.influx_writer import InfluxWriter, encode_line_protocol, encode_row
from backend.metrics import RateLimiter


class Clock:
    """Reloj controlado para no depender de esperas reales."""

    def __init__(self, start: float = 1_789_628_000.0):
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def row(**overrides):
    base = {
        "t_iso": "2026-01-01T00:00:00.000000+00:00",
        "t_s": 0.0,
        "seq": 7,
        "device_id": "wheel-RH-01",
        "fsm_state": "LOAD",
        "pressure_kpa": 2.5,
        "temperature_c": 41.5,
        "vib_rms_g": 0.31,
        "vib_kurtosis": 2.1,
        "level_liters": 90.25,
        "sig_verified": False,
        "label": "normal",
    }
    base.update(overrides)
    return base


def slow_writer(delay: float = 0.4):
    """Sustituto de la escritura real: tarda y lo hace notar."""
    calls: list[str] = []

    def write(protocol: str) -> None:
        calls.append(protocol)
        time.sleep(delay)

    return write, calls


# --------------------------------------------------------------------------
# Line protocol
# --------------------------------------------------------------------------


def test_line_protocol_has_measurement_tags_fields_and_epoch_timestamp():
    """Influx rechaza RFC3339 (con +00:00 y con Z): exige un entero epoch."""
    line = encode_line_protocol([row()])

    measurement, rest = line.split(" ", 1)
    fields, timestamp = rest.rsplit(" ", 1)
    assert measurement == (
        "oilguard_signals,device_id=wheel-RH-01,fsm_state=LOAD,label=normal,"
        "sig_verified=false"
    )
    assert fields == (
        "pressure_kpa=2.5,temperature_c=41.5,vib_rms_g=0.31,"
        "vib_kurtosis=2.1,level_liters=90.25,seq=7i"
    )
    assert timestamp.isdigit()
    assert timestamp == "1767225600000000000"  # 2026-01-01T00:00:00+00:00 en ns


def test_line_protocol_coerces_numeric_strings():
    """El simulador Rust publica los numeros como cadenas: si se descartan,
    a Influx solo llega el seq y se pierden todas las senales."""
    line = encode_line_protocol([
        row(pressure_kpa="2.579", temperature_c="74.94", level_liters="95.0", seq="400")
    ])

    assert "pressure_kpa=2.579" in line
    assert "temperature_c=74.94" in line
    assert "level_liters=95.0" in line
    assert "seq=400i" in line


def test_line_protocol_uses_nanosecond_precision_not_seconds():
    """El timestamp es clave primaria: a 10 Hz, precision de segundo se pisaria."""
    first = encode_row(row(t_iso="2026-01-01T00:00:00.100000+00:00"))
    second = encode_row(row(t_iso="2026-01-01T00:00:00.200000+00:00"))

    assert first.rsplit(" ", 1)[1] != second.rsplit(" ", 1)[1]
    assert first.rsplit(" ", 1)[1].endswith("100000000")


def test_line_protocol_skips_rows_with_an_unparseable_timestamp():
    assert encode_row(row(t_iso="no-es-una-fecha")) is None


def test_line_protocol_joins_one_line_per_row():
    lines = encode_line_protocol([row(seq=1), row(seq=2)])

    assert len(lines.splitlines()) == 2


def test_line_protocol_marks_integer_fields_with_i():
    assert "seq=7i" in encode_line_protocol([row()])


def test_line_protocol_escapes_commas_and_spaces_in_tags():
    line = encode_line_protocol([row(device_id="wheel, one", fsm_state="A B")])

    assert "device_id=wheel\\,\\ one" in line
    assert "fsm_state=A\\ B" in line


def test_line_protocol_escapes_equals_in_tag_values():
    assert "device_id=a\\=b" in encode_line_protocol([row(device_id="a=b")])


def test_line_protocol_skips_rows_without_a_timestamp():
    assert encode_line_protocol([row(t_iso=None), row(t_iso="")]) == ""


def test_line_protocol_tolerates_missing_or_unparseable_numeric_fields():
    line = encode_line_protocol([row(pressure_kpa=None, level_liters="n/a")])

    assert "pressure_kpa" not in line
    assert "level_liters" not in line
    assert "temperature_c=41.5" in line


def test_line_protocol_emits_nothing_for_an_empty_batch():
    assert encode_line_protocol([]) == ""


# --------------------------------------------------------------------------
# El worker de ingesta no bloquea
# --------------------------------------------------------------------------


def test_writer_never_blocks_the_submitter_when_the_writer_is_slow():
    write, calls = slow_writer(0.4)
    writer = InfluxWriter(write=write, max_batches=8)

    started = time.perf_counter()
    for seq in range(5):
        writer.submit([row(seq=seq)])
    elapsed = time.perf_counter() - started

    assert elapsed < 0.2, f"submit tardó {elapsed:.3f}s: el ingest espera a Influx"
    writer.stop(timeout=2)
    # Coalescidos: cinco lotes de una fila salen como una sola escritura.
    assert len(calls) == 1
    assert calls[0].count("\n") + 1 == 5


def test_submit_reports_false_when_it_drops_a_batch():
    def never_runs(_protocol: str) -> None:
        pass

    writer = InfluxWriter(write=never_runs, max_batches=2)

    assert writer.submit([row()]) is True
    assert writer.submit([row()]) is True
    assert writer.submit([row()]) is False  # cola del escritor llena
    assert writer.dropped_batches() == 1

    writer.stop(timeout=1)


def test_dropped_batches_do_not_reach_influx():
    written: list[str] = []

    def record(protocol: str) -> None:
        written.append(protocol)

    writer = InfluxWriter(write=record, max_batches=2)
    assert writer.submit([row(seq=1)]) is True
    assert writer.submit([row(seq=2)]) is True
    assert writer.submit([row(seq=3)]) is False

    writer.stop(timeout=1)
    joined = "".join(written)

    assert "seq=1i" in joined and "seq=2i" in joined
    assert "seq=3i" not in joined  # el lote descartado nunca se escribe


def test_a_failing_write_is_counted_and_does_not_kill_the_writer():
    state = {"calls": 0}

    def flaky(_protocol: str) -> None:
        state["calls"] += 1
        if state["calls"] == 1:
            raise RuntimeError("influx down")

    writer = InfluxWriter(write=flaky, max_batches=8)
    writer.submit([row(seq=1)])
    writer.submit([row(seq=2)])
    writer.stop(timeout=2)

    # Coalescidos en una escritura: el fallo se cuenta una vez.
    assert state["calls"] == 1
    assert writer.failed_batches() == 1
    assert writer.written_batches() == 0

    # Y el escritor sigue vivo para el siguiente lote.
    writer.submit([row(seq=3)])
    writer.stop(timeout=2)
    assert writer.written_batches() == 1


def test_stop_flushes_everything_queued():
    write, calls = slow_writer(0.01)
    writer = InfluxWriter(write=write, max_batches=64)
    for seq in range(10):
        writer.submit([row(seq=seq)])

    writer.stop(timeout=5)

    assert len(calls) == 1
    assert calls[0].count("\n") + 1 == 10  # ningun punto se pierde
    assert writer.pending() == 0
    assert writer.buffered_points() == 0


def test_small_batches_are_coalesced_into_one_write():
    """1000 mensajes de 10 filas serian 1000 escrituras: se agrupan en una."""
    write, calls = slow_writer(0.0)
    writer = InfluxWriter(write=write, max_batches=4096, flush_rows=50, flush_seconds=60.0)

    for seq in range(100):
        writer.submit([row(seq=seq)])

    assert calls == [], "escribio antes de vaciar el buffer"
    assert writer.buffered_points() == 100  # pendiente, en cola o en buffer

    writer.drain_and_flush()

    assert len(calls) == 1
    assert calls[0].count("\n") + 1 == 100
    assert writer.buffered_points() == 0


def test_worker_flushes_when_the_buffer_crosses_the_row_threshold():
    write, calls = slow_writer(0.0)
    writer = InfluxWriter(write=write, max_batches=256, flush_rows=5, flush_seconds=60.0)
    writer.start()
    for seq in range(15):
        writer.submit([row(seq=seq)])

    deadline = time.time() + 5
    while time.time() < deadline and len(calls) < 3:
        time.sleep(0.01)
    writer.stop(timeout=5)

    # 15 puntos con umbral 5: se escriben por tandas, no de uno en uno.
    assert len(calls) >= 3, f"solo {len(calls)} escritura(s) para 15 puntos"
    assert all(call.count("\n") + 1 <= 5 for call in calls)


def test_flush_happens_on_the_time_threshold_too():
    write, calls = slow_writer(0.0)
    writer = InfluxWriter(write=write, max_batches=64, flush_rows=5000, flush_seconds=0.05)

    writer.start()
    writer.submit([row()])
    time.sleep(0.3)

    assert len(calls) == 1
    writer.stop(timeout=2)


def test_stop_is_idempotent():
    writer = InfluxWriter(write=lambda p: None, max_batches=4)
    writer.stop(timeout=1)
    writer.stop(timeout=1)


def test_writer_with_influx_disabled_never_encodes_or_writes():
    calls: list[str] = []
    writer = InfluxWriter(write=lambda p: calls.append(p), max_batches=4, enabled=False)

    writer.submit([row()])
    writer.stop(timeout=1)

    assert calls == []
    assert writer.dropped_batches() == 0


def test_writer_state_is_readable_without_touching_the_writer_lock():
    writer = InfluxWriter(write=lambda p: None, max_batches=4)
    writer.submit([row()])

    state = writer.state()

    assert state["enabled"] is True
    assert state["queue_depth"] >= 0
    assert state["queue_capacity"] == 4
    assert state["written_batches"] == 0
    writer.stop(timeout=1)


# --------------------------------------------------------------------------
# /metrics/ingest
# --------------------------------------------------------------------------


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(backend_main, "_write_to_influx", lambda rows: (
        "test-memory", {"code": "influx_written", "params": {"points": len(rows)}}
    ))
    with backend_main._store_lock:
        backend_main._store_rows.clear()
    backend_main._INGEST_METRICS.reset()
    backend_main._INFLUX_WRITER.reset()
    return TestClient(backend_main.app)


def test_metrics_ingest_exposes_the_influx_writer_counters(client):
    backend_main.verify_and_store([row()])

    influx = client.get("/metrics/ingest").json()["ingest"]["influx"]

    assert {"enabled", "flush_rows", "flush_seconds", "status", "dropped_batches",
            "written_batches", "written_points", "failed_batches",
            "queue_depth", "queue_capacity", "async"} <= set(influx)
    assert influx["async"] is True


def test_metrics_reports_dropped_influx_batches(client, monkeypatch):
    writer = InfluxWriter(write=lambda p: None, max_batches=1)
    writer.submit([row()])          # llena la cola
    dropped = writer.submit([row()])
    monkeypatch.setattr(backend_main, "_INFLUX_WRITER", writer)

    payload = client.get("/metrics/ingest").json()["ingest"]

    assert dropped is False
    assert payload["influx"]["dropped_batches"] == 1
    assert payload["influx"]["queue_capacity"] == 1
    writer.stop(timeout=1)


def test_store_stays_complete_when_influx_drops(client, monkeypatch):
    """El almacén en memoria y la API no dependen de que Influx acepte el lote."""
    writer = InfluxWriter(write=lambda p: None, max_batches=1)
    monkeypatch.setattr(backend_main, "_INFLUX_WRITER", writer)

    assert client.post("/ingest", json={"rows": [_http_row(seq=s) for s in range(3)]}).status_code == 200
    writer.submit([row()])
    writer.submit([row()])  # se descarta

    assert client.get("/fleet/devices").json()["count"] == 1
    assert client.get("/fleet/devices").json()["devices"][0]["rows_retained"] == 3
    writer.stop(timeout=1)


def test_pipeline_hands_rows_to_the_async_writer_instead_of_buffering(client, monkeypatch):
    seen: list[int] = []
    monkeypatch.setattr(
        backend_main._INFLUX_WRITER,
        "submit",
        lambda rows: (seen.append(len(rows)), True)[1],
    )

    backend_main.verify_and_store([row(seq=1), row(seq=2)])

    assert seen == [2]
    assert backend_main._PIPELINE.pending_points() == 0


def _http_row(seq=0):
    base = row(seq=seq)
    base.update({
        "recal_window": 1, "moving": 0, "engine_on": 1, "slope_deg": 0.1,
        "rotor_rpm": 100.0, "wheel_rpm": 3.0, "level_pct": 94.7,
        "rotating_sensor_regime": "static_pool",
        "submerged_fraction_per_revolution": 1.0, "link_down": 0,
    })
    return base

# --------------------------------------------------------------------------
# Avisos de descarte sin inundar el log
# --------------------------------------------------------------------------


def test_rate_limiter_allows_the_first_event():
    clock = Clock()
    limiter = RateLimiter(interval_s=1.0, now_fn=clock)

    allowed, total = limiter.should_log()

    assert allowed is True
    assert total == 1


def test_rate_limiter_suppresses_events_inside_the_interval():
    clock = Clock()
    limiter = RateLimiter(interval_s=1.0, now_fn=clock)

    first = limiter.should_log()
    for _ in range(500):
        allowed, _ = limiter.should_log()
        assert allowed is False

    assert first[0] is True


def test_rate_limiter_allows_again_after_the_interval_and_reports_the_total():
    clock = Clock()
    limiter = RateLimiter(interval_s=1.0, now_fn=clock)
    limiter.should_log()
    for _ in range(9):
        limiter.should_log()

    clock.advance(1.0)
    allowed, total = limiter.should_log()

    assert allowed is True
    assert total == 11, "el aviso debe decir cuantos se descartaron en total"


def test_rate_limiter_is_thread_safe():
    limiter = RateLimiter(interval_s=0.0)
    allowed = []

    def worker() -> None:
        for _ in range(200):
            allowed.append(limiter.should_log()[0])

    threads = [threading.Thread(target=worker) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert len(allowed) == 1600


def test_pipeline_drops_are_rate_limited_in_the_log(client, monkeypatch, caplog):
    """Un aviso por lote descartado eran ~1700 lineas/s ycpu del 93%."""
    import logging

    pipeline = backend_main.IngestPipeline(
        process=lambda rows: {"accepted": list(rows)}, max_batches=1, influx_enabled=False
    )
    for _ in range(200):
        pipeline.submit([{"seq": 1}])

    assert pipeline.dropped_batches() == 199
    warnings = [
        record for record in caplog.records
        if record.levelno >= logging.WARNING and "dropped" in record.getMessage()
    ]
    assert len(warnings) <= 2, f"{len(warnings)} avisos por 199 descartes"


def test_writer_drops_are_rate_limited(client, caplog):
    import logging

    writer = InfluxWriter(write=lambda p: None, max_batches=1)
    for _ in range(200):
        writer.submit([row()])

    assert writer.dropped_batches() == 199
    warnings = [
        record for record in caplog.records
        if record.levelno >= logging.WARNING and "dropped" in record.getMessage()
    ]
    assert len(warnings) <= 2, f"{len(warnings)} avisos por 199 descartes"
    writer.stop(timeout=1)
