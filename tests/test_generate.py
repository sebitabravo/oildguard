"""Generador de señales: presión geométrica, ruido de transductor 0-10 kPa y hold-up en movimiento."""

import statistics
from datetime import datetime, timezone

import pytest

from sim import generate, physics, settling
from sim.geometry import DEFAULT_GEAR_CASE

T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)


def rows_for(scenario="clean", seconds=60.0, seed=7, **kw):
    return list(generate.iter_rows(scenario, seconds, "wheel-RH-01", seed, start=T0, **kw))


def settled(r):
    """Reposo con el hold-up ya drenado: más de 3.5 s tras la parada (ciclo de 29 s, paradas en 0 y 18)."""
    c = float(r["t_s"]) % 29
    return r["recal_window"] == 1 and (3.5 < c < 6.0 or 21.5 < c < 24.0)


def pressures(rows, predicate):
    return [float(r["pressure_kpa"]) for r in rows if predicate(r)]


def test_rest_pressure_matches_geometry_not_the_old_28_kpa_anchor():
    rows = rows_for()
    rest = pressures(rows, settled)
    expected = physics.pressure_kpa_from_volume(95.0, generate.TEMP_NOMINAL_C, DEFAULT_GEAR_CASE)
    assert statistics.fmean(rest) == pytest.approx(expected, abs=0.01)
    assert max(float(r["pressure_kpa"]) for r in rows) < 5.0


def test_rest_noise_matches_a_0_10_kpa_class_transducer():
    rows = rows_for(seconds=120.0)
    rest = pressures(rows, settled)
    assert statistics.pstdev(rest) == pytest.approx(generate.PRESSURE_NOISE_REST_KPA, rel=0.35)


def test_schema_is_unchanged():
    assert list(rows_for(seconds=1.0)[0].keys()) == generate.HEADER


def test_moving_pool_pressure_is_lower_than_at_rest_due_to_holdup():
    rows = rows_for(seconds=120.0)
    moving = statistics.fmean(pressures(rows, lambda r: r["moving"] == 1))
    rest = statistics.fmean(pressures(rows, settled))
    assert rest - moving > 0.05


def test_moving_rows_emit_repeatable_rotating_sensor_metadata():
    a = rows_for(seconds=35.0, seed=23)
    b = rows_for(seconds=35.0, seed=23)
    moving = [row for row in a if row["moving"] == 1]
    assert moving
    assert all(row["rotating_sensor_regime"] in {
        "static_pool", "slosh", "centrifugal_rimming"
    } for row in moving)
    assert all(0.0 <= float(row["submerged_fraction_per_revolution"]) <= 1.0
               for row in moving)
    assert [(r["rotating_sensor_regime"], r["submerged_fraction_per_revolution"])
            for r in a] == [
        (r["rotating_sensor_regime"], r["submerged_fraction_per_revolution"])
        for r in b
    ]
    assert "rotating_sensor_regime" in generate.HEADER
    assert "submerged_fraction_per_revolution" in generate.HEADER


def test_holdup_scales_with_wheel_speed_and_drains_exponentially():
    assert generate.holdup_volume_l(0.0) == 0.0
    assert generate.holdup_volume_l(generate.WHEEL_RPM_MAX) == pytest.approx(generate.V_HOLDUP_MAX_L)
    v0 = 5.0
    tau = 0.75
    assert generate.drained_holdup_l(v0, 0.0, tau) == pytest.approx(v0)
    assert generate.drained_holdup_l(v0, tau, tau) == pytest.approx(v0 / 2.718281828, rel=1e-6)
    assert generate.drained_holdup_l(v0, 10 * tau, tau) < 1e-3


def test_drain_back_deficit_after_stop_grows_with_viscosity():
    def deficit(proxy):
        rows = rows_for(seconds=60.0, viscosity_proxy=proxy)
        # HAUL -> DUMP: parada en t = 18 s; primer segundo posterior vs cola asentada
        early = pressures(rows, lambda r: 18.0 <= float(r["t_s"]) < 19.0)
        late = pressures(rows, lambda r: 22.0 <= float(r["t_s"]) < 24.0)
        return statistics.fmean(late) - statistics.fmean(early)

    assert deficit(2.0) > deficit(0.5)
    assert deficit(1.0) > 0.02


def test_abrupt_drop_step_equals_geometry_difference():
    rows = rows_for("abrupt-drop", seconds=120.0)
    before = pressures(rows, lambda r: settled(r) and float(r["t_s"]) < 58.0)
    after = pressures(rows, lambda r: settled(r) and float(r["t_s"]) > 64.0)
    step = statistics.fmean(before) - statistics.fmean(after)
    expected = (physics.pressure_kpa_from_volume(95.0, generate.TEMP_NOMINAL_C)
                - physics.pressure_kpa_from_volume(80.0, generate.TEMP_NOMINAL_C))
    assert step == pytest.approx(expected, abs=0.02)


def test_sensor_drift_scenario_ramps_pressure_with_constant_level():
    rows = rows_for("sensor-drift", seconds=60.0)
    assert {float(r["level_liters"]) for r in rows} == {95.0}
    first = statistics.fmean(pressures(rows, lambda r: 2.0 < float(r["t_s"]) < 6.0))
    last = statistics.fmean(pressures(rows, lambda r: float(r["t_s"]) > 55.0))
    assert last - first > 0.1


def test_settling_tau_still_increases_with_viscosity_proxy():
    rows = [{k: str(v) for k, v in r.items()} for r in rows_for(seconds=120.0)]
    from sim.detect import detect_windows

    windows = detect_windows(rows)
    means = []
    for proxy in (0.5, 1.0, 2.0):
        fits = settling.extract(rows, windows, proxy)
        taus = [float(f["tau_s"]) for f in fits if float(f["tau_s"]) > 0.0]
        assert len(taus) >= 6
        means.append(statistics.fmean(taus))
    assert means[0] < means[1] < means[2]
