"""Recalcula deltas de estres por caso desde los JSON publicados.

Usa la pendiente del contador acumulado `accepted_total` en el intervalo
estable, emparejando por caso (devices x rate), para no presentar un total
acumulado como si fuera un ritmo ni invertir una regresion como mejora.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_report(path: str | Path) -> dict:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def recompute_rate(samples: list[dict], warmup_s: float) -> float | None:
    # Misma ventana robusta que bench/stress/run_matrix.py:summarize: el contador
    # de 1 s depende del muestreo, la pendiente del acumulado no.
    steady = [s for s in samples if s.get("t", 0) >= warmup_s and s.get("metrics")]
    totals = [
        (s["t"], s["metrics"]["rows"].get("accepted_total"))
        for s in steady
        if "rows" in s["metrics"]
    ]
    totals = [(t, v) for t, v in totals if v is not None]
    if len(totals) >= 2 and totals[-1][0] > totals[0][0]:
        return (totals[-1][1] - totals[0][1]) / (totals[-1][0] - totals[0][0])
    return None


def case_key(case: dict) -> tuple:
    return (case.get("devices"), case.get("rate_hz"))


def verify_rates(report: dict, tolerance: float = 1e-9) -> list[str]:
    # Comprueba que el resumen publicado coincide con la pendiente recalculada.
    errors: list[str] = []
    warmup_s = report.get("warmup_s", 5.0)
    for case in report.get("cases", []):
        stored = case["summary"].get("accepted_rows_per_s")
        recomputed = recompute_rate(case.get("samples", []), warmup_s)
        if stored is None or recomputed is None:
            if stored != recomputed:
                errors.append(f"{case_key(case)}: stored={stored} recomputed={recomputed}")
        elif abs(stored - recomputed) > tolerance:
            errors.append(
                f"{case_key(case)}: stored={stored} recomputed={recomputed}"
            )
    return errors


def delta_pct(before: float | int | None, after: float | int | None) -> float | None:
    # Delta relativo por caso; con base cero no hay porcentaje definido.
    if before is None or after is None:
        return None
    if before == 0:
        return None
    return (after - before) / before * 100.0


def compute_deltas(baseline: dict, after: dict) -> list[dict]:
    # Empareja por caso para no mezclar tamanos de flota distintos.
    base = {case_key(c): c["summary"] for c in baseline.get("cases", [])}
    nxt = {case_key(c): c["summary"] for c in after.get("cases", [])}
    rows: list[dict] = []
    for key in sorted(set(base) & set(nxt)):
        b, a = base[key], nxt[key]
        rows.append(
            {
                "devices": key[0],
                "rate_hz": key[1],
                "accepted_before": b.get("accepted_rows_per_s"),
                "accepted_after": a.get("accepted_rows_per_s"),
                "accepted_delta": (a.get("accepted_rows_per_s") - b.get("accepted_rows_per_s"))
                if b.get("accepted_rows_per_s") is not None
                and a.get("accepted_rows_per_s") is not None
                else None,
                "accepted_pct": delta_pct(
                    b.get("accepted_rows_per_s"), a.get("accepted_rows_per_s")
                ),
                "dropped_before": b.get("dropped_batches_final"),
                "dropped_after": a.get("dropped_batches_final"),
                "dropped_delta": (a.get("dropped_batches_final") - b.get("dropped_batches_final"))
                if b.get("dropped_batches_final") is not None
                and a.get("dropped_batches_final") is not None
                else None,
                "dropped_pct": delta_pct(
                    b.get("dropped_batches_final"), a.get("dropped_batches_final")
                ),
                "p99_before": b.get("latency_p99_s_max"),
                "p99_after": a.get("latency_p99_s_max"),
                "p99_delta": (a.get("latency_p99_s_max") - b.get("latency_p99_s_max"))
                if b.get("latency_p99_s_max") is not None
                and a.get("latency_p99_s_max") is not None
                else None,
                "p99_pct": delta_pct(
                    b.get("latency_p99_s_max"), a.get("latency_p99_s_max")
                ),
            }
        )
    return rows


def direction_for_higher_is_better(delta: float | None) -> str:
    if delta is None:
        return "unknown"
    if delta > 0:
        return "improvement"
    if delta < 0:
        return "regression"
    return "unchanged"


def direction_for_lower_is_better(delta: float | None) -> str:
    if delta is None:
        return "unknown"
    if delta < 0:
        return "improvement"
    if delta > 0:
        return "regression"
    return "unchanged"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--after", required=True)
    args = parser.parse_args(argv)

    baseline = load_report(args.baseline)
    after = load_report(args.after)

    print(
        "method: slope of cumulative accepted_total over t >= warmup_s "
        "(bench/stress/run_matrix.py:summarize), matched per-case by devices"
    )
    print(f"baseline={args.baseline} after={args.after}")

    for name, report in (("baseline", baseline), ("after", after)):
        errors = verify_rates(report)
        if errors:
            for err in errors:
                print(f"mismatch {name}: {err}")
            return 1
    print("verified: recomputed slopes match stored summaries")

    for row in compute_deltas(baseline, after):
        ap = f"{row['accepted_pct']:+.2f}%" if row["accepted_pct"] is not None else "n/a"
        dp = f"{row['dropped_pct']:+.2f}%" if row["dropped_pct"] is not None else "n/a"
        pp = f"{row['p99_pct']:+.2f}%" if row["p99_pct"] is not None else "n/a"
        print(
            f"devices={row['devices']} "
            f"accepted {row['accepted_before']:.4f} -> {row['accepted_after']:.4f} "
            f"delta {row['accepted_delta']:+.4f} ({ap}) "
            f"{direction_for_higher_is_better(row['accepted_delta'])}; "
            f"dropped {row['dropped_before']} -> {row['dropped_after']} "
            f"delta {row['dropped_delta']:+d} ({dp}) "
            f"{direction_for_lower_is_better(row['dropped_delta'])}; "
            f"p99 {row['p99_before']:.4f}s -> {row['p99_after']:.4f}s "
            f"delta {row['p99_delta']:+.4f}s ({pp}) "
            f"{direction_for_lower_is_better(row['p99_delta'])}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
