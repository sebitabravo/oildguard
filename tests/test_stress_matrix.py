"""Resumen de la matriz de estrés: solo usa el régimen estable y tolera huecos."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "bench" / "stress"))

import run_matrix  # noqa: E402


def _sample(t, accepted, p50=0.01, p99=0.05, depth=0, dropped=0, cpu=None):
    return {
        "t": t,
        "metrics": {
            "rows": {"accepted_1s": accepted},
            "latency": {"p50_s": p50, "p99_s": p99},
            "queue": {"depth": depth, "dropped_batches": dropped},
        },
        "docker": {"cpu_pct": cpu} if cpu is not None else None,
    }


def test_summary_ignores_warmup_and_reports_steady_state():
    samples = [_sample(0, 10), _sample(2, 20)] + [
        _sample(6, 1000, p99=0.08, cpu=50.0),
        _sample(7, 990, depth=3),
        _sample(8, 1010, p99=0.10, dropped=1, cpu=70.0),
    ]
    summary = run_matrix.summarize(samples, expected_rows_per_s=1000)
    assert summary["samples"] == 3
    assert summary["accepted_rows_per_s_median"] == 1000
    assert summary["accepted_ratio"] == 1.0
    assert summary["latency_p99_s_max"] == 0.10
    assert summary["queue_depth_max"] == 3
    assert summary["dropped_batches_final"] == 1
    assert summary["backend_cpu_pct_median"] == 60.0


def test_summary_handles_unreachable_backend_samples():
    samples = [{"t": 6, "metrics": None, "docker": None}]
    summary = run_matrix.summarize(samples, expected_rows_per_s=100)
    assert summary["samples"] == 0
    assert summary["accepted_rows_per_s_median"] is None
    assert summary["accepted_ratio"] is None
