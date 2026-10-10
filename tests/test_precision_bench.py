from bench.precision.python.precision_drift import (
    SplitMix64,
    _pairwise_sum,
    generate_readings,
    neumaier_sum,
    welford_variance,
    two_pass_variance,
)


def test_splitmix64_published_vectors():
    rng = SplitMix64(0x0123456789ABCDEF)
    assert [rng.next_u64() for _ in range(5)] == [
        0x157A3807A48FAA9D,
        0xD573529B34A1D093,
        0x2F90B72E996DCCBE,
        0xA2D419334C4667EC,
        0x01404CE914938008,
    ]


def test_neumaier_handles_ill_conditioned_sum():
    assert neumaier_sum([1.0, 1e100, 1.0, -1e100]) == 2.0


def test_welford_matches_two_pass_for_small_data():
    values = [1.0, 2.0, 3.0, 4.0, 5.0]
    assert abs(welford_variance(values) - two_pass_variance(values)) < 1e-14


def test_python_parity_constants_from_readme():
    levels, pressures = generate_readings(1000)
    assert levels[:5] == [949126, 949065, 950085, 950589, 950976]
    assert pressures[:5] == [11979, 10436, 12703, 12104, 12991]
    assert sum(levels) == 949982865
    assert sum(pressures) == 11526832


def test_level_series_stays_physical_over_full_run():
    levels, _ = generate_readings(1_000_000)
    assert min(levels) > 0
    assert 920_000 <= sum(levels) // len(levels) <= 950_000
    assert 27_000 <= levels[0] - levels[-1] <= 33_000



def test_two_pass_variance_uses_sequential_summation():
    values = [level / 10000 for level in generate_readings(2000)[0]]
    mean = 0.0
    for value in values:
        mean += value
    mean /= len(values)
    expected = 0.0
    for value in values:
        expected += (value - mean) ** 2
    assert two_pass_variance(values) == expected / len(values)


def test_pairwise_sum_uses_sequential_leaf_blocks():
    def reference(values):
        if len(values) <= 32:
            total = 0.0
            for value in values:
                total += value
            return total
        middle = len(values) // 2
        return reference(values[:middle]) + reference(values[middle:])

    values = [level / 10000 for level in generate_readings(100_000)[0]]
    assert _pairwise_sum(values) == reference(values)
