"""Endpoints aditivos para las paginas nuevas de la UI (F2 / D8).

Todos son aditivos: anaden campos o rutas y no tocan el contrato existente.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend import main as backend_main


def _row(device_id="wheel-RH-01", seq=0, t_s=0.0, **overrides):
    row = {
        "t_iso": "2026-01-01T00:00:00+00:00",
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
        "pressure_kpa": 2.5,
        "temperature_c": 41.5,
        "vib_rms_g": 0.31,
        "vib_kurtosis": 2.1,
        "level_liters": 90.0,
        "level_pct": 94.7,
        "link_down": 0,
        "label": "normal",
    }
    row.update(overrides)
    return row


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


# --------------------------------------------------------------------------
# 1. /fleet/devices -> latest + alert_level
# --------------------------------------------------------------------------


def test_fleet_devices_exposes_a_latest_block_per_device(client):
    assert client.post("/ingest", json={"rows": [_row(seq=3, temperature_c=55.5)]}).status_code == 200

    device = client.get("/fleet/devices").json()["devices"][0]

    assert device["latest"] == {
        "temperature_c": 55.5,
        "vib_rms_g": 0.31,
        "pressure_kpa": 2.5,
        "fsm_state": "LOAD",
        "moving": 0,
        "link_down": 0,
        "t_iso": "2026-01-01T00:00:00+00:00",
    }


def test_fleet_devices_keeps_every_previously_existing_field(client):
    assert client.post("/ingest", json={"rows": [_row()]}).status_code == 200

    device = client.get("/fleet/devices").json()["devices"][0]

    for field in (
        "device_id", "rows_retained", "retention_rows", "last_t_iso", "last_t_s",
        "rows_accepted", "rows_verified", "rows_rejected", "rows_offered",
        "verified_ratio", "rejected_reasons", "latest_level_liters", "latest_level_pct",
    ):
        assert field in device, field


def test_fleet_devices_alert_level_is_null_when_the_analyzer_is_unavailable(client, monkeypatch):
    monkeypatch.setattr(backend_main, "_load_t10_evaluator", lambda: (None, "boom"))
    assert client.post("/ingest", json={"rows": [_row()]}).status_code == 200

    device = client.get("/fleet/devices").json()["devices"][0]

    assert device["alert_level"] is None
    assert device["alert_level_reason"] == "analyzer_unavailable"


def test_fleet_devices_alert_level_comes_from_the_ladder(client):
    """Usa el generador de referencia: la suite ya prueba que slow-leak levanta N1-N4."""
    from datetime import datetime, timezone

    from sim.generate import iter_rows

    numeric = {
        "t_s", "slope_deg", "rotor_rpm", "wheel_rpm", "pressure_kpa", "temperature_c",
        "vib_rms_g", "vib_kurtosis", "level_liters", "level_pct",
    }
    rows = [
        {k: (float(v) if k in numeric else v) for k, v in raw.items()}
        for raw in iter_rows("slow-leak", 120.0, "wheel-A", 7, leak_pct_per_h=128.5,
                             start=datetime(2026, 1, 1, tzinfo=timezone.utc))
    ]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200

    device = client.get("/fleet/devices").json()["devices"][0]

    assert device["alert_level"] in {"N1", "N2", "N3", "N4"}
    assert device["alert_level_reason"] is None


def test_fleet_devices_alert_level_reason_when_the_ladder_raises_nothing(client):
    assert client.post("/ingest", json={"rows": [_row()]}).status_code == 200

    device = client.get("/fleet/devices").json()["devices"][0]

    assert device["alert_level"] is None
    assert device["alert_level_reason"] == "no_alert"


def test_fleet_devices_alert_level_for_every_device_not_only_the_default(client):
    rows = [_row(device_id="wheel-A", seq=s, t_s=float(s)) for s in range(12)]
    rows += [_row(device_id="wheel-B", seq=s, t_s=float(s)) for s in range(12)]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200

    payload = client.get("/fleet/devices").json()

    assert payload["count"] == 2
    assert all("alert_level" in d for d in payload["devices"])
    assert all("alert_level_reason" in d for d in payload["devices"])


def test_fleet_devices_alert_level_is_omitted_with_a_reason_over_the_budget(client, monkeypatch):
    """La escalera es lineal en filas: fuera de presupuesto se omite y se dice."""
    monkeypatch.setattr(backend_main, "ALERT_LEVEL_ROW_BUDGET", 5)
    rows = [_row(seq=seq, t_s=float(seq)) for seq in range(20)]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200

    payload = client.get("/fleet/devices").json()

    device = payload["devices"][0]
    assert device["alert_level"] is None
    assert device["alert_level_reason"] == "ladder_budget_exceeded"
    assert payload["alert_level"] == {
        "evaluated": False,
        "mode": "auto",
        "rows_scanned": 0,
        "row_budget": 5,
        "reason": "ladder_budget_exceeded",
    }


def test_fleet_devices_alert_level_on_forces_the_ladder_over_the_budget(client, monkeypatch):
    monkeypatch.setattr(backend_main, "ALERT_LEVEL_ROW_BUDGET", 5)
    rows = [_row(seq=seq, t_s=float(seq)) for seq in range(20)]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200

    payload = client.get("/fleet/devices?alert_level=on").json()

    assert payload["alert_level"]["evaluated"] is True
    assert payload["alert_level"]["rows_scanned"] == 20
    assert payload["devices"][0]["alert_level_reason"] in {"no_alert", None} or payload[
        "devices"
    ][0]["alert_level"] in {"N1", "N2", "N3", "N4"}


def test_fleet_devices_alert_level_off_skips_the_ladder_entirely(client):
    rows = [_row(seq=seq, t_s=float(seq)) for seq in range(6)]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200

    payload = client.get("/fleet/devices?alert_level=off").json()

    assert payload["alert_level"]["evaluated"] is False
    assert payload["devices"][0]["alert_level_reason"] == "disabled_by_query"


def test_fleet_devices_rejects_an_unknown_alert_level_mode(client):
    assert client.get("/fleet/devices?alert_level=maybe").status_code == 422


# --------------------------------------------------------------------------
# 2. /level/series?signals= y truth_liters
# --------------------------------------------------------------------------


def test_level_series_adds_signal_columns_when_requested(client):
    rows = [_row(seq=s, t_s=float(s)) for s in range(6)]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200

    series = client.get("/level/series?signals=pressure_kpa,temperature_c,vib_rms_g&limit=2000").json()["series"]

    assert len(series) == 6
    assert series[0]["pressure_kpa"] == 2.5
    assert series[0]["temperature_c"] == 41.5
    assert series[0]["vib_rms_g"] == 0.31


def test_level_series_omits_signal_columns_by_default(client):
    assert client.post("/ingest", json={"rows": [_row()]}).status_code == 200

    point = client.get("/level/series").json()["series"][0]

    assert "pressure_kpa" not in point
    assert "temperature_c" not in point


def test_level_series_rejects_an_unknown_signal(client):
    assert client.get("/level/series?signals=fuel_liters").status_code == 422


def test_level_series_exposes_ground_truth_when_rows_carry_it(client):
    rows = [_row(seq=s, t_s=float(s), level_liters=88.0 - s) for s in range(6)]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200

    series = client.get("/level/series?limit=2000").json()["series"]

    assert series[0]["truth_liters"] == 88.0
    assert series[-1]["truth_liters"] == 83.0


def test_level_series_omits_truth_when_rows_do_not_carry_it(client):
    """Filas sin verdad del generador no deben fingir una verdad medida."""
    rows = []
    for seq in range(6):
        row = _row(seq=seq, t_s=float(seq))
        row.pop("level_liters")  # llega al almacén sin ground truth
        rows.append(row)
    with backend_main._store_lock:
        backend_main._store_rows.clear()
    backend_main.verify_and_store(rows)

    series = client.get("/level/series?limit=2000").json()["series"]

    assert len(series) == 6
    assert all("truth_liters" not in point for point in series)


# --------------------------------------------------------------------------
# 3. /fleet/outages
# --------------------------------------------------------------------------


def test_fleet_outages_groups_consecutive_link_down_rows(client):
    rows = [_row(device_id="wheel-A", seq=s, t_s=float(s), link_down=1) for s in range(4)]
    rows += [_row(device_id="wheel-A", seq=4, t_s=4.0, link_down=0)]
    rows += [_row(device_id="wheel-A", seq=s, t_s=float(s), link_down=1) for s in range(5, 8)]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200

    outages = client.get("/fleet/outages").json()["outages"]

    assert len(outages) == 2
    first = outages[0]
    assert first["device_id"] == "wheel-A"
    assert first["rows_buffered"] == 4
    assert first["duration_s"] == pytest.approx(3.0)
    assert first["start_t_iso"] == "2026-01-01T00:00:00+00:00"
    assert first["end_t_iso"] == "2026-01-01T00:00:00+00:00"
    # Con link_down no hay entrega: no se afirma lo que no se midio.
    assert first["forwarded"] is None


def test_fleet_outages_is_empty_and_explained_without_outages(client):
    assert client.post("/ingest", json={"rows": [_row()]}).status_code == 200

    payload = client.get("/fleet/outages").json()

    assert payload["outages"] == []
    assert payload["count"] == 0
    assert payload["reason"] == "no_outages"
    assert payload["code"] == "no_outages"


def test_fleet_outages_filters_by_device(client):
    rows = [_row(device_id="wheel-A", seq=s, t_s=float(s), link_down=1) for s in range(3)]
    rows += [_row(device_id="wheel-B", seq=s, t_s=float(s), link_down=1) for s in range(3)]
    assert client.post("/ingest", json={"rows": rows}).status_code == 200

    outages = client.get("/fleet/outages?device_id=wheel-B").json()["outages"]

    assert len(outages) == 1
    assert outages[0]["device_id"] == "wheel-B"


def test_fleet_outages_honours_the_limit(client):
    for window in range(4):
        rows = [_row(device_id="wheel-A", seq=window * 10 + s, t_s=float(window * 10 + s), link_down=1)
                for s in range(2)]
        rows.append(_row(device_id="wheel-A", seq=window * 10 + 2, t_s=float(window * 10 + 2), link_down=0))
        assert client.post("/ingest", json={"rows": rows}).status_code == 200

    payload = client.get("/fleet/outages?limit=2").json()

    assert payload["count"] == 2
    assert len(payload["outages"]) == 2
    assert payload["outages_total"] == 4


# --------------------------------------------------------------------------
# 4. /config/thresholds
# --------------------------------------------------------------------------


def test_config_thresholds_imports_the_constants_the_analysis_actually_uses(client):
    from ai import ladder, level, rul

    payload = client.get("/config/thresholds").json()

    assert payload["status"] == "ok"
    assert payload["warn_pct"] == ladder.WARN_PCT == level.WARN_PCT
    assert payload["crit_pct"] == ladder.CRIT_PCT == level.CRIT_PCT
    assert payload["shift_h"] == ladder.SHIFT_H == rul.SHIFT_H
    assert payload["cycle_s"] == rul.CYCLE_S
    assert payload["min_scored_n"] == rul.MIN_SCORED_N == level.MIN_BASELINE_N
    assert payload["min_r2"] == rul.MIN_R2
    assert payload["max_sigma_l"] == rul.MAX_SIGMA_L == level.SIGMA_L_SUPPRESS_L
    assert payload["abrupt_step_l"] == ladder.ABRUPT_STEP_L
    assert payload["z_thr"] == ladder.Z_THR
    assert payload["z_extreme"] == ladder.Z_EXTREME
    assert payload["kurt_spike"] == ladder.KURT_SPIKE
    assert payload["rms_high_g"] == ladder.RMS_HIGH_G
    assert payload["temp_drift_c"] == ladder.TEMP_DRIFT_C
    assert payload["capacity_l"] == level.CAPACITY_L == rul.CAPACITY_L
    assert payload["ladder"] == ladder.LADDER
    assert payload["severity"] == ladder.SEVERITY
    assert payload["min_channels"] == 2  # 2-of-3 confirmation
    assert payload["n2_votes_of"] == 3
    assert payload["channels"] == ["pressure_drop", "level_trend", "vib_impact"]
    assert payload["temp_veto"] is True


def test_config_thresholds_is_read_only(client):
    assert client.get("/config/thresholds").status_code == 200
    assert client.post("/config/thresholds").status_code == 405


def test_config_thresholds_does_not_import_when_the_analyzer_is_broken(client, monkeypatch):
    """Un analyzer roto no debe tumbar /config/thresholds."""
    monkeypatch.setattr(
        backend_main, "_load_t10_evaluator", lambda: (None, "boom")
    )
    response = client.get("/config/thresholds")
    assert response.status_code == 200
    assert response.json()["warn_pct"] == 50.0
