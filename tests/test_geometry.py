"""Geometría de la caja de engranajes GDY106: anillo horizontal con piscina de aceite."""

import math

import pytest

from sim.geometry import (
    GearCase,
    dV_dh,
    head_from_volume,
    segment_area,
    volume_from_head,
    wetted_area,
)

GC = GearCase()


def test_segment_area_clamps_and_matches_circle():
    r = 0.5
    assert segment_area(r, -1.0) == 0.0
    assert segment_area(r, 2 * r + 1.0) == pytest.approx(math.pi * r * r)
    assert segment_area(r, r) == pytest.approx(math.pi * r * r / 2.0)


def test_zero_volume_gives_zero_head():
    assert head_from_volume(0.0, GC) == 0.0
    assert volume_from_head(0.0, GC) == 0.0


def test_full_annulus_reaches_outer_diameter():
    v_full = math.pi * (GC.r_out**2 - GC.r_in**2) * GC.length * 1000.0
    assert volume_from_head(2 * GC.r_out, GC) == pytest.approx(v_full, rel=1e-9)
    assert head_from_volume(v_full, GC) == pytest.approx(2 * GC.r_out, abs=1e-5)


def test_volume_is_monotonic_in_head():
    hs = [i * 2 * GC.r_out / 400 for i in range(401)]
    vs = [volume_from_head(h, GC) for h in hs]
    assert all(b >= a for a, b in zip(vs, vs[1:]))


def test_round_trip_volume_head_volume_within_1e6_litres():
    for i in range(0, 951):
        v = i / 10.0
        h = head_from_volume(v, GC)
        assert volume_from_head(h, GC) == pytest.approx(v, abs=1e-6)


def test_half_circle_analytic_without_inner_hub():
    gc = GearCase(r_out=0.5, r_in=0.0, length=0.4)
    expected_l = math.pi * 0.5**2 * 0.4 / 2.0 * 1000.0
    assert volume_from_head(0.5, gc) == pytest.approx(expected_l, rel=1e-9)
    assert head_from_volume(expected_l, gc) == pytest.approx(0.5, abs=1e-5)


def test_head_at_95_litres_is_decimetres_not_metres():
    h = head_from_volume(95.0, GC)
    assert 0.15 < h < 0.5


def test_inner_hub_displaces_oil_above_its_bottom():
    h_hub_bottom = GC.r_out - GC.r_in
    assert wetted_area(h_hub_bottom, GC) == pytest.approx(segment_area(GC.r_out, h_hub_bottom))
    h = h_hub_bottom + 0.1
    assert wetted_area(h, GC) < segment_area(GC.r_out, h)


def test_dv_dh_matches_numeric_derivative():
    for h in (0.05, 0.2, 0.3, 0.5, 0.9):
        eps = 1e-6
        numeric_l_per_mm = (
            volume_from_head(h + eps, GC) - volume_from_head(h - eps, GC)
        ) / (2 * eps) / 1000.0
        assert dV_dh(h, GC) == pytest.approx(numeric_l_per_mm, rel=1e-4)


def test_invalid_geometry_is_rejected():
    with pytest.raises(ValueError):
        GearCase(r_out=0.2, r_in=0.3)
