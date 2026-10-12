import logging

import pytest

from backend import main


@pytest.fixture(autouse=True)
def clear_ingest_state():
    main._STORE.clear()
    yield
    main._STORE.clear()


def row(**overrides):
    values = {
        "t_iso": "2026-10-09T06:23:18.569142+00:00",
        "t_s": 0.0,
        "seq": 0,
        "device_id": "wheel-RH-01",
        "fsm_state": "LOAD",
        "moving": 0,
        "recal_window": 1,
        "engine_on": 1,
        "slope_deg": 0.13,
        "rotor_rpm": 113.6,
        "wheel_rpm": 3.48,
        "rotating_sensor_regime": "static_pool",
        "submerged_fraction_per_revolution": 1.0,
        "pressure_kpa": 2.579,
        "temperature_c": 74.94,
        "vib_rms_g": 0.324,
        "vib_kurtosis": 2.415,
        "level_liters": 95.0,
        "level_pct": 100.0,
        "link_down": 0,
        "label": "normal",
    }
    values.update(overrides)
    return values


def test_unsigned_duplicate_is_accepted_and_counted(monkeypatch):
    monkeypatch.setattr(main, "_REQUIRE_SIGNATURE", False)
    sample = row()

    first = main.verify_and_store([sample])
    second = main.verify_and_store([sample])

    assert first["ingested"] == 1
    assert second["ingested"] == 1
    assert second["rejected"] == 0
    assert second["rejected_reasons"] == {}
    assert main._STORE.total_rows() == 2


@pytest.mark.parametrize("missing_field", ["device_id", "seq"])
@pytest.mark.parametrize("require_signature", [False, True], ids=["permissive", "required"])
def test_unsigned_row_without_identity_is_rejected(
    caplog, monkeypatch, missing_field, require_signature
):
    sample = row()
    sample.pop(missing_field)
    monkeypatch.setattr(main, "_REQUIRE_SIGNATURE", require_signature)

    with caplog.at_level(logging.WARNING, logger="oilguard-backend"):
        result = main.verify_and_store([sample])

    assert result["ingested"] == 0
    assert result["rejected"] == 1
    assert result["rejected_reasons"] == {"missing_identity": 1}
    assert main._STORE.total_rows() == 0
    assert "missing_identity" in caplog.text


def test_optional_can_fields_default_to_null_and_are_kept_when_present():
    absent = main.SignalRow(**row())
    supplied = main.SignalRow(**row(speed_kmh=18.5, load_pct=72.0))

    assert absent.speed_kmh is None
    assert absent.load_pct is None
    assert supplied.speed_kmh == 18.5
    assert supplied.load_pct == 72.0

    main.verify_and_store([absent.model_dump(), supplied.model_dump()])
    stored = main._STORE.rows("wheel-RH-01")

    assert stored[0]["speed_kmh"] is None
    assert stored[0]["load_pct"] is None
    assert stored[1]["speed_kmh"] == 18.5
    assert stored[1]["load_pct"] == 72.0
