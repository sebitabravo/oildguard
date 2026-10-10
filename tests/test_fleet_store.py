"""Almacén por dispositivo: retención, aislamiento y antireplay (R2)."""

from __future__ import annotations

import pytest

from backend.store import TelemetryStore


def row(device_id: str, seq: int, t_s: float) -> dict:
    return {
        "t_iso": f"2026-01-01T00:00:{seq:02d}+00:00",
        "t_s": t_s,
        "seq": seq,
        "device_id": device_id,
        "pressure_kpa": float(seq),
        "temperature_c": 40.0,
        "vib_rms_g": 0.3,
        "vib_kurtosis": 2.0,
        "level_liters": 90.0 - seq,
        "level_pct": 100.0 - seq,
        "link_down": 0,
        "label": "normal",
    }


def identity(row_: dict) -> tuple:
    return (row_["device_id"], int(row_["seq"]), str(row_["t_iso"]))


def feed(store: TelemetryStore, device_id: str, count: int) -> list[dict]:
    rows = [row(device_id, seq, float(seq)) for seq in range(count)]
    prepared = [(r, identity(r)) for r in rows]
    accepted, replays = store.commit(prepared, [])
    assert replays == 0
    assert len(accepted) == count
    return rows


def test_retention_evicts_oldest_rows_per_device_without_touching_siblings():
    store = TelemetryStore(retention_rows=3)

    feed(store, "wheel-RH-01", 5)
    feed(store, "wheel-RH-02", 5)

    assert [r["seq"] for r in store.rows("wheel-RH-01")] == [2, 3, 4]
    assert [r["seq"] for r in store.rows("wheel-RH-02")] == [2, 3, 4]
    assert store.total_rows() == 6
    assert store.devices() == ["wheel-RH-01", "wheel-RH-02"]


def test_replay_is_rejected_per_device_and_released_only_by_eviction():
    store = TelemetryStore(retention_rows=4)
    rows = feed(store, "wheel-RH-01", 4)

    # El mismo dispositivo todavía lo recuerda: replay.
    accepted, replays = store.commit([(rows[0], identity(rows[0]))], [])
    assert accepted == []
    assert replays == 1

    # Otro dispositivo nunca comparte set: la misma identidad pasa.
    other = row("wheel-RH-02", 0, 0.0)
    accepted, replays = store.commit([(other, identity(other))], [])
    assert len(accepted) == 1
    assert replays == 0

    # Al expulsar la fila 0 su identidad sale del set y puede volver a entrar.
    overflow = row("wheel-RH-01", 4, 4.0)  # desborda la ventana de 4 filas
    store.commit([(overflow, identity(overflow))], [])
    accepted, replays = store.commit([(rows[0], identity(rows[0]))], [])
    assert len(accepted) == 1
    assert replays == 0


def test_unsigned_rows_never_enter_the_replay_set():
    store = TelemetryStore(retention_rows=8)
    unsigned = row("wheel-RH-01", 3, 3.0)

    first, replays = store.commit([(unsigned, None)], [])
    second, replays = store.commit([(dict(unsigned), None)], [])

    assert len(first) == 1
    assert len(second) == 1
    assert replays == 0
    assert store.total_rows() == 2


def test_default_device_prefers_the_configured_id_then_the_most_recent():
    store = TelemetryStore(retention_rows=8, default_device="wheel-RH-01")

    feed(store, "wheel-LH-09", 1)
    assert store.default_device_id() == "wheel-LH-09"

    feed(store, "wheel-RH-07", 1)
    assert store.default_device_id() == "wheel-RH-07"  # más reciente, no el configurado

    feed(store, "wheel-RH-01", 1)
    assert store.default_device_id() == "wheel-RH-01"  # configurado y presente

    store.clear()
    assert store.default_device_id() is None


def test_latest_returns_the_highest_sequence_of_that_device_only():
    store = TelemetryStore(retention_rows=8)

    feed(store, "wheel-RH-01", 3)
    feed(store, "wheel-RH-02", 2)

    assert store.latest("wheel-RH-01")["seq"] == 2
    assert store.latest("wheel-RH-02")["seq"] == 1
    assert store.latest("missing") is None


def test_snapshot_window_keeps_only_recent_rows_across_every_device():
    store = TelemetryStore(retention_rows=100)

    for device in ("wheel-RH-01", "wheel-RH-02"):
        for seq in range(10):
            store.commit([(row(device, seq, float(seq)), None)], [])

    # Ventana inclusiva: con la última muestra en t=9, 5 s cubren t>=4.
    columns = store.snapshot_window(5)

    assert columns["t_s"] == [4.0, 5.0, 6.0, 7.0, 8.0, 9.0] * 2
    assert columns["device_id"] == ["wheel-RH-01"] * 6 + ["wheel-RH-02"] * 6
    assert columns["pressure_kpa"] == [4.0, 5.0, 6.0, 7.0, 8.0, 9.0] * 2
    assert all(isinstance(value, float) for value in columns["level_liters"])


def test_snapshot_window_as_rows_round_trips_through_the_public_contract():
    store = TelemetryStore(retention_rows=100)
    feed(store, "wheel-RH-01", 4)

    rows = store.snapshot_window(2, as_rows=True)

    assert [r["seq"] for r in rows] == [1, 2, 3]
    assert rows[0]["device_id"] == "wheel-RH-01"


def test_snapshot_window_falls_back_to_arrival_when_t_s_is_missing():
    store = TelemetryStore(retention_rows=100)
    store.commit([({"seq": 1, "device_id": "wheel-RH-01", "level_liters": 5.0}, None)], [])

    columns = store.snapshot_window(60)

    assert len(columns["t_s"]) == 1
    assert columns["level_liters"] == [5.0]


def test_clear_drops_every_device_and_its_counters():
    store = TelemetryStore(retention_rows=8)
    rows = feed(store, "wheel-RH-01", 3)
    store.commit([], [(rows[0]["device_id"], "bad_signature")])

    store.clear()

    assert store.total_rows() == 0
    assert store.devices() == []
    assert store.device_stats() == {}


@pytest.mark.parametrize("retention", [1, 2, 7])
def test_identity_bookkeeping_never_exceeds_the_row_window(retention):
    store = TelemetryStore(retention_rows=retention)

    for seq in range(20):
        current = row("wheel-RH-01", seq, float(seq))
        store.commit([(current, identity(current))], [])

    assert store.total_rows() == retention
    assert store.replay_tracked("wheel-RH-01") == retention


def test_stored_rows_carry_arrival_and_identity_provenance():
    store = TelemetryStore(retention_rows=4)
    signed = row("wheel-RH-01", 1, 1.0)

    store.commit([(signed, identity(signed))], [])

    stored = store.rows("wheel-RH-01")[0]
    assert stored["_arrival"] > 0
    assert stored["_rid"] == identity(signed)


def test_legacy_module_level_view_supports_the_era_global_list_surface():
    from backend import main as backend_main

    view = backend_main._store_rows
    with backend_main._store_lock:
        view.clear()
        assert view == []
        view.extend([{"seq": 0}, {"seq": 1}, {"seq": 2}])
        assert len(view) == 3
        view.reverse()
        # La vista devuelve las filas del almacén, que llevan metadatos de
        # procedencia (_arrival); el contrato viejo era "la última fila".
        assert view[0]["seq"] == 2
        assert view[-1]["seq"] == 0
        view.append({"seq": 3})
        assert len(view) == 4
        view.clear()
        assert len(view) == 0