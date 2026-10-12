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


def test_critical_horizon_band_contains_the_point_estimate(monkeypatch):
    monkeypatch.setattr(
        rul,
        "fit_trend",
        lambda _points: {
            "n": 10,
            "slope_per_h": -1.0,
            "intercept_l": 90.0,
            "r2": 0.9,
            "se_slope_per_h": 0.1,
        },
    )

    result = rul.extrapolate(_level_output())
    band = result["confidence_band"]

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


def test_missing_future_crossings_include_a_reason(monkeypatch):
    monkeypatch.setattr(
        rul,
        "fit_trend",
        lambda _points: {
            "n": 10,
            "slope_per_h": -1.0,
            "intercept_l": 20.0,
            "r2": 0.9,
            "se_slope_per_h": 0.1,
        },
    )

    band = rul.extrapolate(_level_output())["confidence_band"]

    assert band["hours_to_critical_low"] is None
    assert band["hours_to_critical_low_reason"]
    assert band["hours_to_critical_high"] is None
    assert band["hours_to_critical_high_reason"]


def test_student_t_critical_values_for_95_percent_bilateral_interval():
    assert rul.t_critical_95(1) == 12.706
    assert rul.t_critical_95(10) == 2.228
    assert rul.t_critical_95(30) == 2.042
    assert rul.t_critical_95(31) == 1.96
