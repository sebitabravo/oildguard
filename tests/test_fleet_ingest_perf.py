"""Helpers puros del camino de ingesta optimizado (R2b).

Cada uno existe porque el perfil lo señalo como coste medible: derivar la
llave por dispositivo en cada fila, el reloj por fila en el almacén y el
parseo de t_iso por fila en las metricas de latencia.
"""

from __future__ import annotations

import json
import re
import time

import pytest

from backend import main as backend_main
from backend.ingest_mqtt import decode_payload
from backend.metrics import RollingLatency, TisoClock
from backend.store import TelemetryStore


class Clock:
    """Reloj controlado para que las ventanas no dependan del tiempo real."""

    def __init__(self, start: float = 1_789_628_000.0):
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def row(device_id: str = "wheel-RH-01", seq: int = 0, t_s: float = 0.0) -> dict:
    return {
        "t_iso": "2026-01-01T00:00:00+00:00",
        "t_s": t_s,
        "seq": seq,
        "device_id": device_id,
        "pressure_kpa": 1.0,
        "level_liters": 90.0,
    }


# --------------------------------------------------------------------------
# Derivacion de llave por dispositivo
# --------------------------------------------------------------------------


def test_device_key_derives_once_per_device_not_once_per_row(monkeypatch):
    master = b"\x01" * 32
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {}, raising=False)
    monkeypatch.setattr(backend_main, "_DEVICE_MASTER_KEY", master, raising=False)
    monkeypatch.setattr(backend_main, "_DEVICE_KEY_CACHE", {}, raising=False)

    calls = []
    from shared.signing import derive_device_key as real

    # main importa el símbolo en su propio namespace: hay que parchearlo ahí.
    monkeypatch.setattr(
        backend_main,
        "derive_device_key",
        lambda m, d: (calls.append(d), real(m, d))[1],
    )

    first = [backend_main.device_key("wheel-RH-01") for _ in range(100)]

    assert calls == ["wheel-RH-01"], "la llave se esta derivando una vez por fila"
    assert len(set(first)) == 1


def test_device_key_cache_is_dropped_when_the_master_key_changes(monkeypatch):
    from shared.signing import derive_device_key

    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {}, raising=False)
    monkeypatch.setattr(backend_main, "_DEVICE_MASTER_KEY", b"\x01" * 32, raising=False)
    first = backend_main.device_key("wheel-RH-01")

    monkeypatch.setattr(backend_main, "_DEVICE_MASTER_KEY", b"\x02" * 32, raising=False)

    assert backend_main.device_key("wheel-RH-01") != first
    assert backend_main.device_key("wheel-RH-01") == derive_device_key(b"\x02" * 32, "wheel-RH-01")


def test_explicit_entry_still_wins_over_a_cached_derived_key(monkeypatch):
    from shared.signing import derive_device_key

    master = b"\x01" * 32
    monkeypatch.setattr(backend_main, "_DEVICE_MASTER_KEY", master, raising=False)
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {}, raising=False)
    derived = backend_main.device_key("wheel-RH-01")
    assert derived == derive_device_key(master, "wheel-RH-01")

    explicit = b"\x09" * 32
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {"wheel-RH-01": explicit})

    assert backend_main.device_key("wheel-RH-01") == explicit


def test_device_key_cache_is_bounded(monkeypatch):
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {}, raising=False)
    monkeypatch.setattr(backend_main, "_DEVICE_MASTER_KEY", b"\x01" * 32, raising=False)

    for index in range(backend_main.DEVICE_KEY_CACHE_LIMIT + 50):
        backend_main.device_key(f"flood-{index}")

    assert backend_main._DEVICE_KEY_CACHE_SIZE() <= backend_main.DEVICE_KEY_CACHE_LIMIT


def test_device_key_without_master_or_entry_is_none(monkeypatch):
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {}, raising=False)
    monkeypatch.setattr(backend_main, "_DEVICE_MASTER_KEY", None, raising=False)

    assert backend_main.device_key("wheel-RH-01") is None
    assert backend_main.device_key("") is None


# --------------------------------------------------------------------------
# Reloj del almacen por lote
# --------------------------------------------------------------------------


def test_commit_stamps_one_arrival_for_the_whole_batch():
    store = TelemetryStore(retention_rows=100)
    rows = [row(seq=seq, t_s=float(seq)) for seq in range(50)]
    arrival = time.time()

    store.commit([(r, None) for r in rows], [], arrival=arrival)

    stamps = {stored["_arrival"] for stored in store.rows("wheel-RH-01")}
    assert stamps == {arrival}


def test_commit_without_arrival_still_works_and_is_monotonic():
    store = TelemetryStore(retention_rows=100)
    rows = [row(seq=seq, t_s=float(seq)) for seq in range(3)]

    store.commit([(r, None) for r in rows], [])

    assert [r["seq"] for r in store.rows("wheel-RH-01")] == [0, 1, 2]


def test_batched_counters_match_per_row_counting():
    rows_a = [row(f"dev-{i % 7}", seq=i, t_s=float(i)) for i in range(210)]
    rows_b = [row(f"dev-{i % 5}", seq=i, t_s=float(i)) for i in range(140)]

    batched = TelemetryStore(retention_rows=1000)
    batched.commit([(r, None) for r in rows_a + rows_b], [], arrival=1.0)
    stats = batched.device_stats()

    per_device: dict[str, int] = {}
    for r in rows_a + rows_b:
        per_device[r["device_id"]] = per_device.get(r["device_id"], 0) + 1

    for device, count in per_device.items():
        assert stats[device]["rows_accepted"] == count
        assert stats[device]["rows_offered"] == count
        assert stats[device]["verified_ratio"] == 0.0


# --------------------------------------------------------------------------
# Reloj de t_iso con memoizacion
# --------------------------------------------------------------------------


def test_tiso_clock_parses_repeated_timestamps_once():
    clock = TisoClock()
    value = "2026-01-01T00:00:00+00:00"

    first = clock.epoch(value)
    assert first is not None
    assert clock.epoch(value) == first
    assert clock.parse_calls == 1


def test_tiso_clock_matches_datetime_for_iso_variants():
    from datetime import datetime

    clock = TisoClock()
    for value in (
        "2026-01-01T00:00:00+00:00",
        "2026-01-01T00:00:00.123456+00:00",
        "2026-01-01T00:00:00Z",
    ):
        assert clock.epoch(value) == datetime.fromisoformat(value).timestamp()


def test_tiso_clock_returns_none_for_junk_without_poisoning_the_cache():
    clock = TisoClock()

    assert clock.epoch("not-a-date") is None
    assert clock.epoch("") is None
    assert clock.epoch(None) is None
    assert clock.epoch(12345) is None
    # Un valor bueno despues de uno malo sigue funcionando.
    assert clock.epoch("2026-01-01T00:00:00+00:00") is not None


def test_tiso_clock_cache_is_bounded():
    clock = TisoClock(limit=64)

    for index in range(500):
        clock.epoch(f"2026-01-01T00:{index // 60:02d}:{index % 60:02d}+00:00")

    assert clock.cached <= 64


# --------------------------------------------------------------------------
# Latencia en bloque
# --------------------------------------------------------------------------


def test_bulk_latency_observe_matches_one_by_one():
    clock = Clock()
    values = [0.1 * (index + 1) for index in range(500)]

    one_by_one = RollingLatency(window_s=10.0, now_fn=clock)
    bulk = RollingLatency(window_s=10.0, now_fn=clock)
    for value in values:
        one_by_one.observe(value, clock.now)
    bulk.observe_many(values, clock.now)

    assert bulk.snapshot(clock.now) == one_by_one.snapshot(clock.now)


def test_bulk_latency_observe_counts_invalid_values_like_single_calls():
    clock = Clock()
    values = [0.5, -1.0, 99_999.0, 0.25]

    bulk = RollingLatency(now_fn=clock)
    bulk.observe_many(values, clock.now)
    snapshot = bulk.snapshot(clock.now)

    assert snapshot["count"] == 2
    assert snapshot["invalid_samples"] == 2


def test_bulk_latency_observe_handles_empty_and_evicts():
    clock = Clock()
    latency = RollingLatency(window_s=10.0, now_fn=clock)

    latency.observe_many([], clock.now)
    assert latency.snapshot(clock.now)["count"] == 0

    latency.observe_many([0.2] * 5, clock.now)
    clock.advance(11)
    assert latency.snapshot(clock.now)["count"] == 0


# --------------------------------------------------------------------------
# Decodificacion JSON
# --------------------------------------------------------------------------


def test_orjson_is_pinned_in_the_backend_requirements():
    from pathlib import Path

    requirements = (Path(__file__).resolve().parents[1] / "backend" / "requirements.txt").read_text(
        encoding="utf-8"
    )
    assert re.search(r"^orjson==\S+$", requirements, re.MULTILINE), (
        "el perfil mostraba el decode como el 31% del camino: debe ir fijado"
    )


def test_decode_parses_with_whichever_decoder_is_active():
    """El decode debe funcionar con y sin orjson: el fallback es un modo soportado.

    Exigir orjson aqui haria fallar la suite en un entorno sin la dependencia,
    que es justo el caso que el fallback de la stdlib cubre.
    """
    from backend import ingest_mqtt

    rows = decode_payload(json.dumps({"rows": [row()]}).encode(), "oilguard/signals")

    assert len(rows) == 1
    assert rows[0]["device_id"] == "wheel-RH-01"
    assert isinstance(ingest_mqtt.accelerated_json_available(), bool)


def test_decode_falls_back_to_stdlib_json_without_orjson(monkeypatch):
    from backend import ingest_mqtt

    monkeypatch.setattr(ingest_mqtt, "orjson", None, raising=False)
    rows = decode_payload(json.dumps({"rows": [row()]}).encode(), "oilguard/signals")

    assert len(rows) == 1
    assert rows[0]["seq"] == 0
    assert ingest_mqtt.accelerated_json_available() is False


@pytest.mark.parametrize(
    "payload",
    [b"not json", b"[1, 2, 3]", b'{"rows": []}', b'{"nope": 1}'],
)
def test_both_decoders_reject_the_same_malformed_payloads(payload, monkeypatch):
    from backend import ingest_mqtt

    with pytest.raises(ValueError):
        decode_payload(payload, "oilguard/signals")

    monkeypatch.setattr(ingest_mqtt, "orjson", None, raising=False)
    with pytest.raises(ValueError):
        decode_payload(payload, "oilguard/signals")


def test_both_decoders_agree_on_a_single_row_object(monkeypatch):
    from backend import ingest_mqtt

    payload = json.dumps(row(seq=3)).encode()
    with_accel = decode_payload(payload, "oilguard/signals")

    monkeypatch.setattr(ingest_mqtt, "orjson", None, raising=False)
    without_accel = decode_payload(payload, "oilguard/signals")

    assert with_accel == without_accel
