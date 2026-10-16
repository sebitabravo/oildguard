import pytest

from ai import level
from sim.physics import pressure_kpa_from_volume


def _samples(volumes, rest_flags=None):
    return [
        {
            "seq": seq,
            "t_s": seq / 10,
            "t_iso": f"2026-01-01T00:00:{seq:02d}+00:00",
            "pressure_kpa": pressure_kpa_from_volume(volume, 75.0),
            "temperature_c": 75.0,
            "rest": rest_flags[seq] if rest_flags is not None else True,
        }
        for seq, volume in enumerate(volumes)
    ]


def test_pinned_baseline_preserves_estimates_and_training_flags():
    samples = _samples(
        [95.0] * 10 + [90.0, 85.0, 80.0],
        [True] * 10 + [False] + [True] * 2,
    )

    fitted = level.estimate(samples)
    pinned = level.estimate(samples, baseline=fitted["baseline"])

    assert [
        (point["seq"], point["level_liters"], point["train"], point["gated"])
        for point in pinned["estimates"]
    ] == [
        (point["seq"], point["level_liters"], point["train"], point["gated"])
        for point in fitted["estimates"]
    ]
    assert pinned["baseline"]["pinned"] is True
    assert pinned["baseline"]["seq_start"] == 0
    assert pinned["baseline"]["seq_end"] == 9


def test_latest_rest_estimate_uses_trailing_run_median_and_breaks_on_gates():
    estimates = [
        {"seq": 1, "t_iso": "t1", "level_liters": 90.0},
        {"seq": 2, "t_iso": "t2", "level_liters": 92.0},
        {"seq": 3, "t_iso": "t3", "level_liters": None, "gated": True},
        {"seq": 4, "t_iso": "t4", "level_liters": 60.0, "train": True},
        {"seq": 5, "t_iso": "t5", "level_liters": 64.0},
        {"seq": 6, "t_iso": "t6", "level_liters": 62.0},
    ]

    latest = level.latest_rest_estimate(estimates)

    assert latest == {
        "level_liters": 62.0,
        "level_pct": round(100.0 * 62.0 / level.CAPACITY_L, 3),
        "n": 3,
        "t_iso": "t6",
        "seq": 6,
    }


def test_latest_rest_estimate_skips_trailing_gated_rows():
    estimates = [
        {"seq": 1, "t_iso": "t1", "level_liters": 90.0},
        {"seq": 2, "t_iso": "t2", "level_liters": 92.0},
        {"seq": 3, "t_iso": "t3", "level_liters": None, "gated": True},
        {"seq": 4, "t_iso": "t4", "level_liters": 60.0, "train": True},
        {"seq": 5, "t_iso": "t5", "level_liters": 64.0},
        {"seq": 6, "t_iso": "t6", "level_liters": 62.0},
        {"seq": 7, "t_iso": "t7", "level_liters": None, "gated": True},
        {"seq": 8, "t_iso": "t8", "level_liters": None, "gated": True},
    ]

    latest = level.latest_rest_estimate(estimates)

    assert latest == {
        "level_liters": 62.0,
        "level_pct": round(100.0 * 62.0 / level.CAPACITY_L, 3),
        "n": 3,
        "t_iso": "t6",
        "seq": 6,
    }


def test_latest_rest_estimate_uses_settled_samples_after_stop_transient():
    estimates = [
        {"seq": 1, "t_s": 0.0, "t_iso": "t0", "level_liters": 89.0},
        {"seq": 2, "t_s": 1.0, "t_iso": "t1", "level_liters": 89.0},
        {"seq": 3, "t_s": 2.0, "t_iso": "t2", "level_liters": 89.0},
        {"seq": 4, "t_s": 3.0, "t_iso": "t3", "level_liters": 92.0},
        {"seq": 5, "t_s": 4.0, "t_iso": "t4", "level_liters": 92.0},
    ]

    latest = level.latest_rest_estimate(estimates)

    assert latest == {
        "level_liters": 92.0,
        "level_pct": round(100.0 * 92.0 / level.CAPACITY_L, 3),
        "n": 2,
        "t_iso": "t4",
        "seq": 5,
    }


def test_latest_rest_estimate_skips_unsettled_run_for_previous_settled_run():
    estimates = [
        {"seq": 1, "t_s": 0.0, "t_iso": "t0", "level_liters": 89.0},
        {"seq": 2, "t_s": 1.0, "t_iso": "t1", "level_liters": 89.0},
        {"seq": 3, "t_s": 2.0, "t_iso": "t2", "level_liters": 89.0},
        {"seq": 4, "t_s": 3.0, "t_iso": "t3", "level_liters": 92.0},
        {"seq": 5, "t_s": 4.0, "t_iso": "t4", "level_liters": 92.0},
        {"seq": 6, "t_s": 5.0, "t_iso": "t5", "level_liters": None, "gated": True},
        {"seq": 7, "t_s": 6.0, "t_iso": "t6", "level_liters": 60.0},
        {"seq": 8, "t_s": 7.0, "t_iso": "t7", "level_liters": 60.0},
    ]

    latest = level.latest_rest_estimate(estimates)

    assert latest == {
        "level_liters": 92.0,
        "level_pct": round(100.0 * 92.0 / level.CAPACITY_L, 3),
        "n": 2,
        "t_iso": "t4",
        "seq": 5,
    }


def test_latest_rest_estimate_falls_back_when_no_run_is_settled():
    estimates = [
        {"seq": 1, "t_s": 0.0, "t_iso": "t0", "level_liters": 89.0},
        {"seq": 2, "t_s": 1.0, "t_iso": "t1", "level_liters": 91.0},
        {"seq": 3, "t_s": 2.0, "t_iso": "t2", "level_liters": 90.0},
    ]

    latest = level.latest_rest_estimate(estimates)

    assert latest == {
        "level_liters": 90.0,
        "level_pct": round(100.0 * 90.0 / level.CAPACITY_L, 3),
        "n": 3,
        "t_iso": "t2",
        "seq": 3,
    }


@pytest.mark.parametrize("estimates", [[], [{"seq": 1, "level_liters": None}]])
def test_latest_rest_estimate_returns_none_without_scored_rows(estimates):
    assert level.latest_rest_estimate(estimates) is None
