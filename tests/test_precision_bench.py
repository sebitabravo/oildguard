from bench.precision.python.precision_drift import (
    SplitMix64,
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
    assert levels[:5] == [949126, 949062, 950079, 950580, 950964]
    assert pressures[:5] == [11979, 10436, 12703, 12104, 12991]
    assert sum(levels) == 948498855
    assert sum(pressures) == 11526832
