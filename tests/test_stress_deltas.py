"""Deltas de estres por caso: ritmo por pendiente, nunca acumulado como ritmo."""

import importlib.util
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
SCRIPT = REPO / "scripts" / "bench" / "recalculate_stress_deltas.py"
BASELINE = REPO / "docs" / "bench" / "stress-baseline.json"
AFTER = REPO / "docs" / "bench" / "stress-results.json"

sys.path.insert(0, str(REPO / "bench" / "stress"))
import run_matrix  # noqa: E402


def _load_script():
    spec = importlib.util.spec_from_file_location("recalculate_stress_deltas", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


rsd = _load_script()


def _reports():
    return rsd.load_report(BASELINE), rsd.load_report(AFTER)


def test_recomputed_slopes_match_stored_summaries():
    # La pendiente recalculada debe coincidir con el resumen publicado.
    baseline, after = _reports()
    for report in (baseline, after):
        assert rsd.verify_rates(report) == []
        for case in report["cases"]:
            expected = case["devices"] * case["rate_hz"]
            via_runner = run_matrix.summarize(case["samples"], expected)
            assert case["summary"]["accepted_rows_per_s"] == pytest.approx(
                via_runner["accepted_rows_per_s"]
            )


def test_deltas_match_per_case_before_after():
    # Cada delta empareja el mismo caso (devices x rate) antes/después.
    baseline, after = _reports()
    rows = {r["devices"]: r for r in rsd.compute_deltas(baseline, after)}
    assert set(rows) == {100, 1000, 5000, 10000}
    base = {c["devices"]: c["summary"] for c in baseline["cases"]}
    nxt = {c["devices"]: c["summary"] for c in after["cases"]}
    for devices, row in rows.items():
        assert row["accepted_delta"] == pytest.approx(
            nxt[devices]["accepted_rows_per_s"] - base[devices]["accepted_rows_per_s"]
        )
        assert row["dropped_delta"] == (
            nxt[devices]["dropped_batches_final"] - base[devices]["dropped_batches_final"]
        )
        assert row["p99_delta"] == pytest.approx(
            nxt[devices]["latency_p99_s_max"] - base[devices]["latency_p99_s_max"]
        )


def test_regressions_are_not_read_as_improvements():
    # 10k pierde ritmo y suma drops/latencia; 5k suma drops y p99 aunque suba el ritmo.
    baseline, after = _reports()
    rows = {r["devices"]: r for r in rsd.compute_deltas(baseline, after)}
    assert rows[10000]["accepted_delta"] < 0
    assert rsd.direction_for_higher_is_better(rows[10000]["accepted_delta"]) == "regression"
    assert rows[10000]["dropped_delta"] > 0
    assert rsd.direction_for_lower_is_better(rows[10000]["dropped_delta"]) == "regression"
    assert rows[10000]["p99_delta"] > 0
    assert rows[5000]["dropped_delta"] > 0
    assert rsd.direction_for_lower_is_better(rows[5000]["dropped_delta"]) == "regression"
    assert rows[5000]["p99_delta"] > 0
    assert rows[1000]["dropped_delta"] < 0
    assert rsd.direction_for_lower_is_better(rows[1000]["dropped_delta"]) == "improvement"


def test_negative_cumulative_total_as_rate_is_caught():
    # Un total acumulado no es un ritmo: sin dividir por tiempo da otro orden de magnitud.
    baseline, _ = _reports()
    case = next(c for c in baseline["cases"] if c["devices"] == 1000)
    warmup = baseline.get("warmup_s", 5.0)
    steady = [s for s in case["samples"] if s["t"] >= warmup and s.get("metrics")]
    totals = [s["metrics"]["rows"]["accepted_total"] for s in steady]
    naive_cumulative = totals[-1]
    naive_delta_without_time = totals[-1] - totals[0]
    correct = rsd.recompute_rate(case["samples"], warmup)
    assert correct is not None
    assert naive_cumulative != pytest.approx(correct, rel=0.1)
    assert naive_delta_without_time != pytest.approx(correct, rel=0.1)
    # El delta correcto por caso tampoco coincide con restar finales entre archivos.
    after = rsd.load_report(AFTER)
    after_case = next(c for c in after["cases"] if c["devices"] == 1000)
    after_totals = [
        s["metrics"]["rows"]["accepted_total"]
        for s in after_case["samples"]
        if s["t"] >= after.get("warmup_s", 5.0) and s.get("metrics")
    ]
    wrong_cross_file_cumulative = after_totals[-1] - totals[-1]
    rows = {r["devices"]: r for r in rsd.compute_deltas(baseline, after)}
    # La resta de acumulados (~245k) no es el delta de ritmo (~4.5k rows/s).
    assert wrong_cross_file_cumulative != pytest.approx(
        rows[1000]["accepted_delta"], rel=0.5
    )
