"""Tren planetario de dos etapas del GDY106 (Fig. 95, GEK-91680A)."""

import pytest

from sim import geartrain as gt


def test_ratio_formula_per_stage():
    stage = gt.PlanetaryStage(zs=16, zp=38, zr=92, planets=3)
    assert stage.ratio == pytest.approx(1.0 + 92 / 16)


def test_frozen_train_satisfies_assembly_conditions():
    for stage in (gt.GDY106_TRAIN.hs, gt.GDY106_TRAIN.ls):
        assert stage.zr == stage.zs + 2 * stage.zp
        assert (stage.zs + stage.zr) % stage.planets == 0
        assert stage.zs >= 13
        assert gt.neighbour_clearance_ok(stage)


def test_frozen_train_uses_a_single_shared_ring_gear():
    assert gt.GDY106_TRAIN.hs.zr == gt.GDY106_TRAIN.ls.zr


def test_frozen_train_ratio_within_half_percent_of_manual():
    err = abs(gt.GDY106_TRAIN.ratio - gt.TARGET_RATIO) / gt.TARGET_RATIO
    assert err < 0.005


def test_search_finds_only_valid_trains_sorted_by_error():
    sols = gt.search_tooth_counts()
    assert sols
    errs = [abs(s.error_pct) for s in sols]
    assert errs == sorted(errs)
    for s in sols:
        assert abs(s.error_pct) <= 0.5
        for st in (s.hs, s.ls):
            assert st.zr == st.zs + 2 * st.zp
            assert (st.zs + st.zr) % st.planets == 0


def test_shared_ring_search_only_returns_equal_rings():
    sols = gt.search_tooth_counts(shared_ring=True)
    assert sols
    assert all(s.hs.zr == s.ls.zr for s in sols)


def test_frozen_train_is_one_of_the_search_results():
    found = {(s.hs, s.ls) for s in gt.search_tooth_counts(shared_ring=True)}
    assert (gt.GDY106_TRAIN.hs, gt.GDY106_TRAIN.ls) in found


def test_rotor_3000_rpm_gives_about_92_wheel_rpm():
    sp = gt.stage_speeds(3000.0)
    assert sp["wheel_rpm"] == pytest.approx(92.0, abs=1.0)
    assert sp["shaft_rpm"] == 3000.0


def test_stage_chain_is_consistent():
    sp = gt.stage_speeds(1000.0)
    assert sp["hs_carrier_rpm"] == pytest.approx(1000.0 / gt.GDY106_TRAIN.hs.ratio)
    assert sp["wheel_rpm"] == pytest.approx(sp["hs_carrier_rpm"] / gt.GDY106_TRAIN.ls.ratio)
    assert sp["ls_sun_rpm"] == sp["hs_carrier_rpm"]


def test_planet_spin_relative_to_carrier_opposes_carrier_rotation():
    sp = gt.stage_speeds(3000.0)
    st = gt.GDY106_TRAIN.hs
    expected = -(st.zr / st.zp) * sp["hs_carrier_rpm"]
    assert sp["hs_planet_rel_rpm"] == pytest.approx(expected)
    assert sp["hs_planet_rel_rpm"] < 0.0
    assert sp["ls_planet_rel_rpm"] < 0.0


def test_planet_spin_from_sun_side_equals_ring_side():
    sp = gt.stage_speeds(2000.0)
    st = gt.GDY106_TRAIN.ls
    from_sun = -(st.zs / st.zp) * (sp["ls_sun_rpm"] - sp["wheel_rpm"])
    assert sp["ls_planet_rel_rpm"] == pytest.approx(from_sun)
