"""Equivalencia entre las rachas incrementales y el escaneo exacto (R2d).

La ruta incremental sustituye a la que reescaneaba todas las filas en cada
peticion. Aqui se compara contra esa ruta original sobre fixtures con huecos
entre rachas, rachas en el borde de la retencion, rachas abiertas y
llegadas fuera de orden.
"""

from __future__ import annotations

from typing import Any

import pytest

from backend.outages import OutageTracker, runs_from_rows


def _rows(spec: list[tuple[int, int, str]]) -> list[dict[str, Any]]:
    """``(seq, link_down, t_iso)`` -> filas como las que inserta el almacen."""
    return [
        {
            "device_id": "d1",
            "seq": seq,
            "link_down": down,
            "t_s": float(seq),
            "t_iso": iso,
        }
        for seq, down, iso in spec
    ]


def _feed(tracker: OutageTracker, rows: list[dict[str, Any]]) -> None:
    for row in rows:
        tracker.observe(
            row["device_id"], int(row["seq"]), row["t_s"], row["t_iso"], row["link_down"]
        )


def _key(run: dict[str, Any]) -> tuple:
    return (
        run["device_id"],
        run["start_t_s"],
        run["end_t_s"],
        run["duration_s"],
        run["rows_buffered"],
        run["start_t_iso"],
        run["end_t_iso"],
    )


def _assert_same(spec: list[tuple[int, int, str]]) -> None:
    rows = _rows(spec)
    tracker = OutageTracker()
    _feed(tracker, rows)
    exact = runs_from_rows(rows, "d1")
    incremental = tracker.runs("d1")
    assert sorted(map(_key, incremental)) == sorted(map(_key, exact))


def test_single_run():
    _assert_same([(1, 0, "a"), (2, 1, "b"), (3, 1, "c"), (4, 0, "d")])


def test_run_open_at_the_end():
    _assert_same([(1, 0, "a"), (2, 1, "b"), (3, 1, "c")])


def test_run_open_at_the_start():
    _assert_same([(1, 1, "a"), (2, 1, "b"), (3, 0, "c")])


def test_run_spanning_the_whole_series():
    _assert_same([(1, 1, "a"), (2, 1, "b"), (3, 1, "c")])


def test_several_runs_with_gaps():
    _assert_same([
        (1, 0, "a"), (2, 1, "b"), (3, 1, "c"), (4, 0, "d"), (5, 0, "e"),
        (6, 1, "f"), (7, 0, "g"), (8, 1, "h"), (9, 1, "i"), (10, 1, "j"),
        (11, 1, "k"), (12, 0, "l"),
    ])


def test_every_row_down_then_up():
    _assert_same([(1, 1, "a"), (2, 1, "b"), (3, 0, "c"), (4, 1, "d"), (5, 0, "e")])


def test_no_outages_at_all():
    _assert_same([(1, 0, "a"), (2, 0, "b"), (3, 0, "c")])


def test_single_row_run_has_zero_duration():
    _assert_same([(1, 0, "a"), (2, 1, "b"), (3, 0, "c")])


def test_row_arriving_out_of_order_marks_the_device_for_rebuild():
    tracker = OutageTracker()
    _feed(tracker, _rows([(1, 0, "a"), (2, 1, "b"), (3, 0, "c")]))

    assert tracker.is_dirty("d1") is False
    # Una fila con seq antiguo no puede cerrar una racha que se extends.
    tracker.observe("d1", 1, 1.0, "a", 1)

    assert tracker.is_dirty("d1") is True


def test_rebuild_after_out_of_order_matches_the_exact_scan():
    rows = _rows([(1, 0, "a"), (2, 1, "b"), (3, 0, "c"), (4, 1, "d"), (5, 0, "e")])
    tracker = OutageTracker()
    _feed(tracker, rows)
    tracker.observe("d1", 2, 2.0, "b", 1)  # llegada tarde
    assert tracker.is_dirty("d1") is True

    tracker.rebuild("d1", rows)

    assert tracker.is_dirty("d1") is False
    assert sorted(map(_key, tracker.runs("d1"))) == sorted(
        map(_key, runs_from_rows(sorted(rows, key=lambda r: r["seq"]), "d1"))
    )


def test_closed_runs_are_bounded_per_device():
    tracker = OutageTracker(max_runs_per_device=3)
    spec: list[tuple[int, int, str]] = []
    seq = 1
    for index in range(10):
        spec.append((seq, 0, f"s{seq}")); seq += 1
        spec.append((seq, 1, f"s{seq}")); seq += 1
        spec.append((seq, 1, f"s{seq}")); seq += 1
        spec.append((seq, 0, f"s{seq}")); seq += 1

    _feed(tracker, _rows(spec))
    runs = tracker.runs("d1")

    assert len(runs) == 3
    # Se conservan las MAS RECIENTES.
    exact = runs_from_rows(_rows(spec), "d1")
    assert [r["start_t_s"] for r in runs] == [r["start_t_s"] for r in exact[-3:]]


def test_reading_does_not_grow_with_retention():
    """La propiedad que motiva el cambio: leer no depende de las filas."""
    tracker = OutageTracker()
    for seq in range(1, 5001):
        tracker.observe("d1", seq, float(seq), f"s{seq}", 1 if seq % 3 == 0 else 0)

    runs = tracker.runs("d1")
    # Solo las 50 ultimas rachas, en O(resultado), sin recorrer las 5000 filas.
    assert len(runs) == 50
    # La ultima fila con link_down es 4998 (4999 y 5000 van arriba), asi que
    # esa es la que cierra la ultima racha.
    assert runs[-1]["end_t_s"] == 4998.0


@pytest.mark.parametrize("device", ["d1", "d2", "d3"])
def test_devices_are_independent(device):
    tracker = OutageTracker()
    tracker.observe("d1", 1, 1.0, "a", 1)
    tracker.observe("d1", 2, 2.0, "b", 0)
    tracker.observe(device, 1, 1.0, "a", 1)
    tracker.observe(device, 2, 2.0, "b", 0)

    assert len(tracker.runs("d1")) == 1
    assert len(tracker.runs(device)) == 1


def test_reset_clears_everything():
    tracker = OutageTracker()
    _feed(tracker, _rows([(1, 1, "a"), (2, 1, "b")]))
    assert tracker.runs("d1")

    tracker.reset()

    assert tracker.runs("d1") == []
    assert tracker.device_ids() == []

def test_endpoint_agrees_with_the_exact_scan_over_http():
    """El JSON que consume el dashboard coincide con el escaneo exacto."""
    from starlette.testclient import TestClient

    import backend.main as backend_main

    with backend_main._store_lock:
        backend_main._store_rows.clear()
    backend_main._FLEET_TICK_CACHE.reset()

    specs = {
        "d1": [(1, 0), (2, 1), (3, 1), (4, 0), (5, 1), (6, 0)],
        "d2": [(1, 1), (2, 1)],                      # racha abierta
        "d3": [(1, 0), (2, 0)],                      # sin cortes
        "d4": [(1, 1), (2, 0), (3, 1), (4, 1), (5, 0)],
    }
    rows = []
    seq = 0
    for device, pattern in specs.items():
        for offset, down in pattern:
            seq += 1
            rows.append({
                "device_id": device, "seq": seq, "t_s": float(seq),
                "t_iso": f"t{seq}", "link_down": down,
                "pressure_kpa": 1.0, "temperature_c": 1.0,
                "vib_rms_g": 1.0, "level_liters": 1.0,
            })
    backend_main.verify_and_store(rows)

    # Referencia: el escaneo exacto original, sobre las filas del almacen.
    expected = []
    with backend_main._store_lock:
        for device in backend_main._STORE.devices():
            ordered = sorted(backend_main._STORE.rows(device), key=lambda r: int(r.get("seq", 0)))
            expected.extend(runs_from_rows(ordered, device))

    with TestClient(backend_main.app) as client:
        got = client.get("/fleet/outages").json()["outages"]

    assert got
    assert len(got) == len(expected)
    # Misma forma y mismos valores, sin importar el orden.
    assert sorted(map(_key, got)) == sorted(map(_key, expected))
    assert set(got[0]) == set(expected[0])
    assert got[0]["forwarded"] is None


def test_outages_response_shape_is_unchanged():
    from starlette.testclient import TestClient

    import backend.main as backend_main

    with backend_main._store_lock:
        backend_main._store_rows.clear()
    backend_main._FLEET_TICK_CACHE.reset()
    backend_main.verify_and_store([{
        "device_id": "d1", "seq": 1, "t_s": 1.0, "t_iso": "t1", "link_down": 1,
        "pressure_kpa": 1.0, "temperature_c": 1.0, "vib_rms_g": 1.0, "level_liters": 1.0,
    }])

    with TestClient(backend_main.app) as client:
        empty = client.get("/fleet/outages").json()
        payload = client.get("/fleet/outages").json()

    assert set(payload) == set(empty) == {
        "status", "kind", "as_of", "device_id", "count",
        "outages_total", "outages", "reason", "code",
    }
    assert payload["status"] == "ok"
    assert payload["kind"] == "fleet-outages"
    assert payload["reason"] is None
