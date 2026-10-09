"""Pruebas del núcleo físico existente (constantes verificadas y aritmética)."""

import pytest

from sim import physics


def test_wheel_rpm_at_rotor_max_matches_manual():
    assert physics.wheel_rpm(physics.ROTOR_MAX_RPM) == pytest.approx(91.97, abs=0.05)


def test_density_decreases_with_temperature():
    assert physics.oil_density_kg_m3(100.0) < physics.oil_density_kg_m3(40.0)


def test_hydrostatic_round_trip():
    rho = physics.oil_density_kg_m3(60.0)
    p = physics.hydrostatic_kpa(rho, 0.3)
    assert physics.head_for_pressure_m(p, rho) == pytest.approx(0.3, abs=1e-9)


def test_viscosity_inside_pds_bands_at_anchors():
    assert physics.VISC_40C_CST[0] <= physics.viscosity_mid_cst(40.0) <= physics.VISC_40C_CST[1]
    assert physics.VISC_100C_CST[0] <= physics.viscosity_mid_cst(100.0) <= physics.VISC_100C_CST[1]


def test_smoke_passes():
    assert physics.smoke()["status"] == "SMOKE_PASS"
