import pytest

from backend import main as backend_main

query_helpers = backend_main._query_helpers


@pytest.mark.parametrize("nested", [False, True])
def test_compute_with_pinned_baseline_pins_direct_or_nested_result(nested):
    device_id = f"p0-c2-pin-helper-{nested}"
    baseline = {
        "mu": 1.0,
        "sigma": 0.1,
        "beta": 0.0,
        "t_ref": 75.0,
        "n": 10,
        "source": "first-rest-window n=10",
        "seq_start": 1,
        "seq_end": 10,
    }
    received = []

    def compute(current):
        received.append(current)
        return {"level": {"baseline": baseline}} if nested else {"baseline": baseline}

    result = query_helpers.compute_with_pinned_baseline(device_id, compute)

    assert result == compute_result(nested, baseline)
    assert received == [None]
    assert query_helpers.pinned_baseline(device_id) == baseline

    replacement = {**baseline, "mu": 2.0}
    second = query_helpers.compute_with_pinned_baseline(
        device_id,
        lambda current: (received.append(current), {"baseline": replacement})[1],
    )

    assert second == {"baseline": replacement}
    assert received[-1] == baseline
    assert query_helpers.pinned_baseline(device_id) == baseline


def compute_result(nested, baseline):
    return {"level": {"baseline": baseline}} if nested else {"baseline": baseline}
