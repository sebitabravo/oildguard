"""Agregaciones de flota con Polars sobre valores calculados a mano (R2).

Los numeros esperados estan escritos a mano, no generados con la misma funcion
que se prueba: un test que calcula su propia verdad no prueba nada.
"""

from __future__ import annotations

import polars as pl
import pytest
from fastapi.testclient import TestClient

from backend import main as backend_main
from backend.aggregates import (
    DEFAULT_METRICS,
    QUANTILE_INTERPOLATION,
    aggregate_by_device,
    aggregate_fleet,
    build_frame,
    parse_metrics,
)

# A: pressure_kpa 1,2,3,4 | B: pressure_kpa 10,20
FLEET_PRESSURES = [1.0, 2.0, 3.0, 4.0, 10.0, 20.0]
FLEET_MEAN = 40.0 / 6.0          # 6.6667
FLEET_P50 = 3.5                  # pos 2.5 -> 3 + 0.5*(4-3)
FLEET_P95 = 17.5                 # pos 4.75 -> 10 + 0.75*(20-10)
FLEET_P99 = 19.5                 # pos 4.95 -> 10 + 0.95*(20-10)
DEVICE_A_MEAN = 2.5
DEVICE_A_P50 = 2.5               # pos 1.5 -> 2 + 0.5*(3-2)
DEVICE_A_P95 = 3.85              # pos 2.85 -> 3 + 0.85*(4-3)
DEVICE_A_P99 = 3.97              # pos 2.97 -> 3 + 0.97*(4-3)


def _row(device_id: str, seq: int, t_s: float, pressure: float) -> dict:
    """Fila completa del contrato SignalRow (POST /ingest la valida)."""
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
    return TestClient(backend_main.app)


@pytest.fixture()
def seeded(client):
    rows = [
        _row("wheel-A", seq, float(seq), pressure)
        for seq, pressure in zip(range(4), FLEET_PRESSURES[:4])
    ] + [
        _row("wheel-B", seq, float(seq + 4), pressure)
        for seq, pressure in zip(range(2), FLEET_PRESSURES[4:])
    ]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200
    return client


# --------------------------------------------------------------------------
# Motor
# --------------------------------------------------------------------------


def test_fleet_aggregates_match_hand_computed_values(seeded):
    response = seeded.get("/fleet/aggregates?window_s=10&metrics=pressure_kpa&group=fleet")

    assert response.status_code == 200
    payload = response.json()
    block = payload["aggregates"]["pressure_kpa"]
    assert block["mean"] == pytest.approx(FLEET_MEAN)
    assert block["p50"] == pytest.approx(FLEET_P50)
    assert block["p95"] == pytest.approx(FLEET_P95)
    assert block["p99"] == pytest.approx(FLEET_P99)
    assert block["min"] == 1.0
    assert block["max"] == 20.0
    assert block["count"] == 6
    assert block["devices"] == 2
    assert payload["reason"] is None
    assert payload["code"] is None


def test_device_grouping_matches_hand_computed_values(seeded):
    response = seeded.get("/fleet/aggregates?window_s=10&metrics=pressure_kpa&group=device")

    payload = response.json()
    by_device = {entry["device_id"]: entry for entry in payload["aggregates"]}
    assert list(by_device) == ["wheel-A", "wheel-B"]

    block_a = by_device["wheel-A"]["metrics"]["pressure_kpa"]
    assert by_device["wheel-A"]["rows"] == 4
    assert block_a["mean"] == pytest.approx(DEVICE_A_MEAN)
    assert block_a["p50"] == pytest.approx(DEVICE_A_P50)
    assert block_a["p95"] == pytest.approx(DEVICE_A_P95)
    assert block_a["p99"] == pytest.approx(DEVICE_A_P99)
    assert block_a["min"] == 1.0
    assert block_a["max"] == 4.0
    assert block_a["count"] == 4
    assert block_a["devices"] == 1

    block_b = by_device["wheel-B"]["metrics"]["pressure_kpa"]
    assert block_b["mean"] == pytest.approx(15.0)
    assert block_b["count"] == 2


def test_window_excludes_rows_older_than_window_s(seeded):
    recent = seeded.get("/fleet/aggregates?window_s=10&metrics=pressure_kpa").json()
    narrow = seeded.get("/fleet/aggregates?window_s=1&metrics=pressure_kpa").json()

    assert recent["aggregates"]["pressure_kpa"]["count"] == 6
    # La ventana es por dispositivo: wheel-A (t_s 0..3) y wheel-B (4..5) aporta
    # cada uno sus dos muestras mas recientes, no una ventana global de 1 s.
    assert narrow["aggregates"]["pressure_kpa"]["count"] == 4
    assert narrow["aggregates"]["pressure_kpa"]["max"] == 20.0


def test_aggregates_declare_the_percentile_method(seeded):
    payload = seeded.get("/fleet/aggregates").json()

    assert payload["quantile_interpolation"] == QUANTILE_INTERPOLATION
    assert payload["metrics"] == list(DEFAULT_METRICS)
    assert payload["group"] == "fleet"
    assert payload["window_s"] == 10


def test_empty_store_returns_reason_and_code_no_rows(client):
    response = client.get("/fleet/aggregates")

    assert response.status_code == 200
    payload = response.json()
    assert payload["reason"] == "no_rows"
    assert payload["code"] == "no_rows"
    assert payload["aggregates"] == {}
    assert payload["rows"] == 0


def test_unknown_metric_is_rejected(seeded):
    response = seeded.get("/fleet/aggregates?metrics=pressure_kpa,fuel_liters")

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ("metrics=", list(DEFAULT_METRICS)),
        ("metrics=pressure_kpa", ["pressure_kpa"]),
        ("metrics=level_liters,pressure_kpa", ["level_liters", "pressure_kpa"]),
        ("metrics=pressure_kpa,pressure_kpa", ["pressure_kpa"]),
    ],
)
def test_parse_metrics_dedupes_and_defaults(params, expected):
    assert parse_metrics(params.split("=", 1)[1]) == expected


def test_build_frame_uses_float64_columns():
    frame = build_frame(
        {
            "device_id": ["a", "b"],
            "t_s": [0.0, 1.0],
            "t_iso": ["x", "y"],
            "pressure_kpa": [1.0, 2.0],
            "temperature_c": [None, None],
        }
    )

    assert frame.schema["pressure_kpa"] == pl.Float64
    assert frame.schema["device_id"] == pl.Utf8
    assert frame.height == 2


def test_aggregate_by_device_honours_the_limit(seeded):
    payload = seeded.get("/fleet/aggregates?group=device&limit=1").json()

    assert payload["devices"] == 2  # el conteo no lo recorta el limite
    assert len(payload["aggregates"]) == 1


# --------------------------------------------------------------------------
# /fleet/devices
# --------------------------------------------------------------------------


def test_fleet_devices_reports_per_device_retention_and_levels(seeded):
    response = seeded.get("/fleet/devices")

    assert response.status_code == 200
    payload = response.json()
    assert payload["kind"] == "fleet-devices"
    assert payload["count"] == 2
    assert payload["reason"] is None

    by_id = {entry["device_id"]: entry for entry in payload["devices"]}
    assert by_id["wheel-A"]["rows_retained"] == 4
    assert by_id["wheel-B"]["rows_retained"] == 2
    assert by_id["wheel-A"]["last_t_iso"] == "2026-01-01T00:00:03+00:00"
    assert by_id["wheel-A"]["latest_level_liters"] == 90.0
    assert by_id["wheel-A"]["verified_ratio"] == 0.0
    assert by_id["wheel-A"]["rows_rejected"] == 0
    assert by_id["wheel-A"]["rejected_reasons"] == {}
    assert by_id["wheel-A"]["retention_rows"] == backend_main.RETENTION_ROWS


def test_fleet_devices_reports_verified_ratio_and_rejections(client, monkeypatch):
    import secrets

    from shared.signing import sign_row

    key = secrets.token_bytes(32)
    monkeypatch.setattr(backend_main, "_DEVICE_KEYS", {"wheel-A": key})
    monkeypatch.setattr(backend_main, "_REQUIRE_SIGNATURE", True)
    signed = sign_row(_row("wheel-A", 0, 0.0, 1.0), key)
    unsigned = _row("wheel-B", 0, 0.0, 2.0)
    tampered = sign_row(_row("wheel-A", 1, 1.0, 1.0), key)
    tampered["pressure_kpa"] = 99.0
    # Rechazo parcial: la fila valida entra, asi que el ack es 200 con conteos.
    assert client.post("/ingest", json={"rows": [signed, unsigned, tampered]}).status_code == 200

    by_id = {e["device_id"]: e for e in client.get("/fleet/devices").json()["devices"]}

    assert by_id["wheel-A"]["rows_verified"] == 1
    # Denominador = todo lo ofrecido (1 aceptada + 1 rechazada), no solo lo aceptado.
    assert by_id["wheel-A"]["rows_offered"] == 2
    assert by_id["wheel-A"]["verified_ratio"] == pytest.approx(0.5)
    assert by_id["wheel-A"]["rejected_reasons"] == {"bad_signature": 1}
    assert by_id["wheel-A"]["rows_rejected"] == 1
    assert by_id["wheel-B"]["verified_ratio"] == 0.0
    assert by_id["wheel-B"]["rejected_reasons"] == {"unsigned": 1}
    assert "wheel-A" not in str(by_id["wheel-A"]["rejected_reasons"])


def test_fleet_devices_empty_store_returns_no_rows(client):
    payload = client.get("/fleet/devices").json()

    assert payload["count"] == 0
    assert payload["devices"] == []
    assert payload["reason"] == "no_rows"
    assert payload["code"] == "no_rows"