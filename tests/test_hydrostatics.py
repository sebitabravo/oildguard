"""Hidrostática sobre la geometría: p(V, T), inversa, masa fija y resolución del sensor."""

import pytest

from sim import physics
from sim.geometry import GearCase, head_from_volume
from sim.physics import RESEARCH_ROTATING_CAVITY as RESEARCH_GC

GC = GearCase()


def test_pressure_at_95_litres_is_a_few_kpa_not_28():
    p = physics.pressure_kpa_from_volume(95.0, 60.0, GC)
    assert 2.0 < p < 5.0


def test_pressure_matches_rho_g_h():
    h = head_from_volume(95.0, GC)
    rho = physics.oil_density_kg_m3(60.0)
    assert physics.pressure_kpa_from_volume(95.0, 60.0, GC) == pytest.approx(
        rho * physics.G * h / 1000.0
    )


def test_pressure_is_nonlinear_in_volume():
    p_half = physics.pressure_kpa_from_volume(47.5, 60.0, GC)
    p_full = physics.pressure_kpa_from_volume(95.0, 60.0, GC)
    assert p_half != pytest.approx(p_full / 2.0, rel=0.02)


def test_inverse_round_trip():
    for v in (5.0, 28.5, 47.5, 80.0, 95.0):
        p = physics.pressure_kpa_from_volume(v, 75.0, GC)
        assert physics.volume_from_pressure_kpa(p, 75.0, GC) == pytest.approx(v, abs=1e-4)


def test_vertical_wall_tank_is_temperature_invariant_for_fixed_mass():
    area_m2 = 0.4

    def vertical_head(v_l: float) -> float:
        return v_l / 1000.0 / area_m2

    p40 = physics._pressure_kpa_from_mass(80.0, 40.0, vertical_head)
    p100 = physics._pressure_kpa_from_mass(80.0, 100.0, vertical_head)
    assert p40 == pytest.approx(p100, rel=1e-9)


def test_annulus_is_not_exactly_temperature_invariant_but_close():
    m = 80.0
    p40 = physics.pressure_kpa_from_mass(m, 40.0, GC)
    p100 = physics.pressure_kpa_from_mass(m, 100.0, GC)
    dev = abs(p100 - p40) / p40
    assert dev > 1e-4
    assert dev < 0.05


def test_mass_and_volume_forms_agree():
    t = 70.0
    m = 90.0
    v_l = m / physics.oil_density_kg_m3(t) * 1000.0
    assert physics.pressure_kpa_from_mass(m, t, GC) == pytest.approx(
        physics.pressure_kpa_from_volume(v_l, t, GC)
    )


def test_sensor_resolution_of_a_10_kpa_class_transducer():
    err_l = physics.sensor_resolution_l(10.0, 0.1, 95.0, 60.0, GC)
    assert 0.0 < err_l < 2.0


def test_sensor_resolution_scales_with_accuracy():
    a = physics.sensor_resolution_l(10.0, 0.1, 95.0, 60.0, GC)
    b = physics.sensor_resolution_l(10.0, 0.2, 95.0, 60.0, GC)
    assert b == pytest.approx(2.0 * a)


def test_a_1000_kpa_cell_cannot_resolve_the_level():
    err_l = physics.sensor_resolution_l(1000.0, 1.2, 95.0, 60.0, GC)
    assert err_l > 100.0


def test_absurdity_check_stays_as_historical_record():
    ac = physics.absurdity_check()
    assert ac["implied_head_m"] > 3.0


def test_local_sensitivity_matches_finite_difference():
    v, t = 95.0, 60.0
    numeric = (
        physics.pressure_kpa_from_volume(v + 0.01, t, GC)
        - physics.pressure_kpa_from_volume(v - 0.01, t, GC)
    ) / 0.02
    assert physics.kpa_per_liter(v, t, GC) == pytest.approx(numeric, rel=1e-3)


def test_sensitivity_is_worst_where_the_surface_is_widest():
    assert physics.kpa_per_liter(130.0, 60.0, GC) < physics.kpa_per_liter(10.0, 60.0, GC)


def test_rotating_sensor_regime_thresholds_are_explicit_and_ordered():
    from sim.physics import rotating_sensor_regime

    assert rotating_sensor_regime(0.0) == "static_pool"
    assert rotating_sensor_regime(30.0) == "slosh"
    assert rotating_sensor_regime(60.0) == "centrifugal_rimming"


def test_research_cavity_is_separate_assumption_from_static_gear_case():
    from sim.physics import RESEARCH_ROTATING_CAVITY

    assert (RESEARCH_ROTATING_CAVITY.r_out, RESEARCH_ROTATING_CAVITY.r_in,
            RESEARCH_ROTATING_CAVITY.length) == pytest.approx((0.50, 0.15, 0.70))
    assert physics.pressure_kpa_from_volume(95.0, 60.0, GC) == pytest.approx(
        physics.pressure_kpa_from_volume(95.0, 60.0)
    )


def test_submerged_fraction_is_per_revolution_and_bounded():
    from sim.physics import submerged_fraction_per_revolution

    low = submerged_fraction_per_revolution(45.0, 0.50, 0.0, RESEARCH_GC)
    high = submerged_fraction_per_revolution(45.0, 0.50, 60.0, RESEARCH_GC)
    assert 0.0 <= low <= 1.0
    assert 0.0 <= high <= 1.0
    assert submerged_fraction_per_revolution(45.0, 0.50, 0.0, RESEARCH_GC, samples=720) == pytest.approx(low, abs=0.01)


def test_rotating_sensor_inputs_are_clamped_to_physical_bounds():
    from sim.physics import submerged_fraction_per_revolution

    assert submerged_fraction_per_revolution(1e6, 9.0, 1e6, RESEARCH_GC) == 1.0
    assert submerged_fraction_per_revolution(-20.0, -3.0, -1e6, RESEARCH_GC) == 0.0
