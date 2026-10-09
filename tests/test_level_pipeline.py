"""Regresión extremo a extremo del pipeline N1-N4 + RUL con la presión geométrica."""

import statistics
from datetime import datetime, timezone

import pytest

from ai import demo_leak, ladder, level
from sim import physics
from sim.generate import iter_rows

T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
SECONDS = 120.0


def stage(scenario, **kw):
    rows = list(iter_rows(scenario, SECONDS, "wheel-RH-01", 7, start=T0, **kw))
    rest = demo_leak.rest_flags(rows)
    return rows, demo_leak.to_samples(rows, rest)


def test_clean_run_raises_no_n2_or_higher():
    _, samples = stage("clean")
    bundle = ladder.evaluate(samples)
    assert not {"N2", "N3", "N4"} & set(bundle["escalation"])
    assert bundle["rul"]["status"] == "suppressed"


def test_slow_leak_escalates_and_produces_rul():
    rate = demo_leak.accel_rate_for(SECONDS, demo_leak.DEFAULT_TARGET_DROP_L)
    _, samples = stage("slow-leak", leak_pct_per_h=rate)
    bundle = ladder.evaluate(samples)
    assert {"N1", "N2", "N3"} <= set(bundle["escalation"])
    assert bundle["rul"]["status"] == "ok"
    assert bundle["rul"]["hours_to_warning"] is not None


def test_abrupt_drop_triggers_n4():
    _, samples = stage("abrupt-drop", drop_liters=15.0)
    assert "N4" in ladder.evaluate(samples)["escalation"]


def test_sensor_drift_is_not_confirmed_as_a_leak():
    _, samples = stage("sensor-drift")
    assert "N2" not in ladder.evaluate(samples)["escalation"]


def test_level_estimate_at_rest_tracks_ground_truth_on_clean_data():
    rows, samples = stage("clean")
    est = level.estimate(samples)
    truth = {int(r["seq"]): float(r["level_liters"]) for r in rows}
    errs = [e["level_liters"] - truth[e["seq"]] for e in est["estimates"] if not e["gated"]]
    assert errs
    assert abs(statistics.fmean(errs)) < 0.3
    assert max(abs(e) for e in errs) < 3.0
    assert est["model"] == "synthetic-proxy"


def test_level_estimate_follows_the_nonlinear_geometry_after_a_drop():
    rows, samples = stage("abrupt-drop", drop_liters=15.0)
    est = level.estimate(samples)
    late = [e["level_liters"] for e in est["estimates"] if not e["gated"] and e["t_s"] > 70.0]
    assert late
    assert statistics.fmean(late) == pytest.approx(80.0, abs=1.0)


def test_estimate_reports_local_sensitivity_not_the_old_linear_gain():
    _, samples = stage("clean")
    est = level.estimate(samples)
    assert est["kpa_per_liter"] == pytest.approx(physics.kpa_per_liter(95.0, 75.0), rel=0.05)
    assert est["kpa_per_liter"] < 0.05
    assert 0.2 < est["sigma_liters"] < 1.0


def test_demo_leak_cli_passes(capsys):
    assert demo_leak.main(["--seconds", "120"]) == 0
    out = capsys.readouterr().out
    assert "T10_DEMO_DONE PASS" in out
    assert "N1->N2->N3->N4" in out
