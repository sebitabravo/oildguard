import pytest

from ai import rul


def _level_output() -> dict:
    return {
        "estimates": [
            {
                "t_s": float(index * 3600),
                "level_liters": 90.0 - index,
                "gated": False,
                "train": False,
            }
            for index in range(10)
        ],
        "sigma_liters": 0.5,
    }


def test_critical_horizon_band_matches_observed_headline(monkeypatch):
    monkeypatch.setattr(
        rul,
        "fit_trend",
        lambda _points: {
            "n": 10,
            "slope_per_h": -1.0,
            "intercept_l": 120.0,
            "r2": 0.9,
            "se_slope_per_h": 0.1,
        },
    )

    result = rul.extrapolate(_level_output())
    band = result["confidence_band"]
    current = _level_output()["estimates"][-1]["level_liters"]

    assert result["hours_to_critical"] == pytest.approx(
        (current - rul.CRIT_L) / -result["slope_L_per_h"]
    )
    assert band["hours_to_critical_low"] == pytest.approx(
        round((current - rul.CRIT_L) / -band["slope_low_L_per_h"], 2)
    )
    assert band["hours_to_critical_high"] == pytest.approx(
        round((current - rul.CRIT_L) / -band["slope_high_L_per_h"], 2)
    )
    assert band["hours_to_critical_low"] <= result["hours_to_critical"]
    assert result["hours_to_critical"] <= band["hours_to_critical_high"]


def test_suppresses_rul_when_slope_interval_contains_zero(monkeypatch):
    monkeypatch.setattr(
        rul,
        "fit_trend",
        lambda _points: {
            "n": 10,
            "slope_per_h": -0.1,
            "intercept_l": 90.0,
            "r2": 0.9,
            "se_slope_per_h": 0.1,
        },
    )

    result = rul.extrapolate(_level_output())

    assert result["status"] == "suppressed"
    assert result["reason_message"]["code"] == "pendiente_no_significativa"


def test_nonnegative_slope_bound_has_no_future_crossing_reason():
    hours, reason = rul._hours_to_critical(81.0, 0.1)

    assert hours is None
    assert reason == "The fitted trend has no future crossing of the critical level."


def test_current_at_or_below_critical_clamps_all_horizons_to_zero(monkeypatch):
    monkeypatch.setattr(
        rul,
        "fit_trend",
        lambda _points: {
            "n": 10,
            "slope_per_h": -1.0,
            "intercept_l": 120.0,
            "r2": 0.9,
            "se_slope_per_h": 0.1,
        },
    )
    level_out = _level_output()
    for estimate in level_out["estimates"]:
        estimate["level_liters"] = rul.CRIT_L - 1.0

    result = rul.extrapolate(level_out)
    band = result["confidence_band"]

    assert result["hours_to_critical"] == 0.0
    assert band["hours_to_critical_low"] == 0.0
    assert band["hours_to_critical_low_reason"] is None
    assert band["hours_to_critical_high"] == 0.0
    assert band["hours_to_critical_high_reason"] is None


def test_student_t_critical_values_for_95_percent_bilateral_interval():
    assert rul.t_critical_95(1) == 12.706
    assert rul.t_critical_95(10) == 2.228
    assert rul.t_critical_95(30) == 2.042
    assert rul.t_critical_95(31) == 1.96
