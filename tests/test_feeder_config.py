from __future__ import annotations

import pytest

from sim import feeder


def _speed_up_day(monkeypatch):
    monkeypatch.setenv("OILGUARD_DEVICE_MASTER_KEY", "ab" * 32)
    monkeypatch.setattr(feeder, "SAMPLE_RATE_HZ", 1)
    monkeypatch.setattr(feeder, "BATCH_SECONDS", 60 * 60)
    monkeypatch.setattr(feeder, "sign_row", lambda row, _key: row)


def test_demo_leak_config_uses_defaults_when_environment_is_unset(monkeypatch):
    monkeypatch.delenv("OILGUARD_DEMO_LEAK_L_PER_H", raising=False)
    monkeypatch.delenv("OILGUARD_DEMO_FLOOR_PCT", raising=False)

    assert feeder.demo_leak_config() == (60.0, 40.0)


@pytest.mark.parametrize(
    ("variable", "value"),
    [
        ("OILGUARD_DEMO_LEAK_L_PER_H", "not-a-number"),
        ("OILGUARD_DEMO_LEAK_L_PER_H", "nan"),
        ("OILGUARD_DEMO_LEAK_L_PER_H", "inf"),
        ("OILGUARD_DEMO_LEAK_L_PER_H", "0"),
        ("OILGUARD_DEMO_LEAK_L_PER_H", "-1"),
        ("OILGUARD_DEMO_FLOOR_PCT", "not-a-number"),
        ("OILGUARD_DEMO_FLOOR_PCT", "nan"),
        ("OILGUARD_DEMO_FLOOR_PCT", "inf"),
        ("OILGUARD_DEMO_FLOOR_PCT", "-1"),
        ("OILGUARD_DEMO_FLOOR_PCT", "100"),
    ],
)
def test_demo_leak_config_rejects_invalid_environment(monkeypatch, variable, value):
    monkeypatch.setenv(variable, value)

    with pytest.raises(RuntimeError, match=variable):
        feeder.demo_leak_config()


def test_feeder_reports_invalid_leak_config_to_stderr(monkeypatch, capsys):
    monkeypatch.setenv("OILGUARD_DEMO_LEAK_L_PER_H", "nan")
    monkeypatch.setattr(feeder.signal, "signal", lambda *_args: None)
    monkeypatch.setattr(feeder, "run", lambda *_args, **_kwargs: (0, 0, 0))

    assert feeder.main() == 1
    assert "OILGUARD_DEMO_LEAK_L_PER_H" in capsys.readouterr().err


def test_main_reports_and_passes_the_configured_floor(monkeypatch, capsys):
    monkeypatch.setenv("OILGUARD_DEMO_LEAK_L_PER_H", "600")
    monkeypatch.setenv("OILGUARD_DEMO_FLOOR_PCT", "40")
    monkeypatch.setattr(feeder.signal, "signal", lambda *_args: None)
    monkeypatch.setattr(feeder, "configured_ingest_url", lambda: "http://127.0.0.1:8001/ingest")
    monkeypatch.setattr(feeder, "_demo_payload", lambda: {"physics": {"constants": {"capacityL": 95}}})
    received = []

    def fake_run(stop, leak_l_per_h, floor_l):
        received.append((leak_l_per_h, floor_l))
        return 1, 10, 0

    monkeypatch.setattr(feeder, "run", fake_run)

    assert feeder.main() == 0
    assert received == [(600.0, 38.0)]
    assert "Fuga demo: 600 L/h; piso 40 % (38,0 L); el piso se alcanza en ~5,7 min." in capsys.readouterr().err


def test_feeder_level_respects_floor_through_24_hours(monkeypatch):
    _speed_up_day(monkeypatch)
    batches = feeder.iter_batches(
        seconds=24 * 60 * 60,
        leak_l_per_h=60,
        floor_l=38,
        clock=lambda: feeder.DEMO_START,
    )

    levels = [float(row["level_liters"]) for batch in batches for row in batch]

    assert min(levels) >= 38
    assert levels[-1] == pytest.approx(38)


def test_legacy_feeder_level_never_goes_below_zero(monkeypatch):
    _speed_up_day(monkeypatch)

    levels = [
        float(row["level_liters"])
        for batch in feeder.iter_batches(
            seconds=24 * 60 * 60,
            target_drop_l=4,
            calibration_seconds=120,
            clock=lambda: feeder.DEMO_START,
        )
        for row in batch
    ]

    assert min(levels) >= 0
    assert levels[-1] == pytest.approx(0)
