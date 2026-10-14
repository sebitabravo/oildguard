#!/usr/bin/env python3
"""Compare floating-point aggregations with integer-exact sensor references."""

from __future__ import annotations

import argparse
import json
import math
import statistics
import time
from decimal import Decimal
from pathlib import Path

MASK64 = (1 << 64) - 1
SEED = 0x0123456789ABCDEF


class SplitMix64:
    def __init__(self, seed: int = SEED):
        self.state = seed & MASK64

    def next_u64(self) -> int:
        self.state = (self.state + 0x9E3779B97F4A7C15) & MASK64
        z = self.state
        z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & MASK64
        z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & MASK64
        return (z ^ (z >> 31)) & MASK64


def generate_readings(n: int) -> tuple[list[int], list[int]]:
    rng = SplitMix64()
    levels: list[int] = []
    pressures: list[int] = []
    for i in range(n):
        u_level = rng.next_u64()
        u_pressure = rng.next_u64()
        # Fuga lineal de ~3 L en 1e6 lecturas sobre un cárter de 95 L; el piso en 0 evita niveles negativos.
        levels.append(max(0, 950000 - (i * 3) // 100 + int(u_level % 2001) - 1000))
        pressures.append(10000 + (u_pressure % 3001))
    return levels, pressures


def neumaier_sum(values) -> float:
    total = 0.0
    correction = 0.0
    for value in values:
        candidate = total + value
        if abs(total) >= abs(value):
            correction += (total - candidate) + value
        else:
            correction += (value - candidate) + total
        total = candidate
    return total + correction


def welford_variance(values) -> float:
    count = 0
    mean = 0.0
    m2 = 0.0
    for value in values:
        count += 1
        delta = value - mean
        mean += delta / count
        m2 += delta * (value - mean)
    return m2 / count if count else 0.0


def two_pass_variance(values) -> float:
    # Sumas secuenciales de izquierda a derecha, igual que Rust: sin fsum, para que ambos lenguajes midan el mismo
    # algoritmo.
    if not values:
        return 0.0
    total = 0.0
    for value in values:
        total += value
    mean = total / len(values)
    squares = 0.0
    for value in values:
        squares += (value - mean) ** 2
    return squares / len(values)


def two_pass_variance_fsum(values) -> float:
    if not values:
        return 0.0
    mean = math.fsum(values) / len(values)
    return math.fsum((value - mean) ** 2 for value in values) / len(values)


def _pairwise_sum(values) -> float:
    if len(values) <= 32:
        # Bloque secuencial, igual que Rust: fsum en las hojas haría al pairwise de Python más exacto que el de Rust.
        total = 0.0
        for value in values:
            total += value
        return total
    middle = len(values) // 2
    return _pairwise_sum(values[:middle]) + _pairwise_sum(values[middle:])


def _float_metrics(value: float, exact: Decimal, exact_mean: Decimal, *, include_mean_ulp: bool = True) -> dict:
    absolute = abs(Decimal.from_float(value) - exact)
    relative = absolute / abs(exact) if exact else Decimal(0)
    result = {
        "value": repr(value),
        "absolute_error": str(absolute),
        "relative_error": str(relative),
    }
    if include_mean_ulp:
        result["mean_ulp_distance"] = abs(_ordered_float_bits(value) - _ordered_float_bits(float(exact_mean)))
    return result


def _ordered_float_bits(value: float) -> int:
    import struct

    bits = struct.unpack(">Q", struct.pack(">d", value))[0]
    return (~bits & MASK64) if bits >> 63 else (bits | (1 << 63))


def _timed(fn, repeats: int = 5) -> tuple[object, float]:
    durations = []
    result = None
    for _ in range(repeats):
        started = time.perf_counter()
        result = fn()
        durations.append(time.perf_counter() - started)
    return result, statistics.median(durations)


def run_benchmark(n: int) -> dict:
    levels, pressures = generate_readings(n)
    floats = [value / 10000 for value in levels]
    level_sum = sum(levels)
    exact_mean = Decimal(level_sum) / Decimal(n * 10000)
    exact_var_num = n * sum(value * value for value in levels) - level_sum * level_sum
    exact_variance = Decimal(exact_var_num) / Decimal(n * n * 100_000_000)
    exact_integral = Decimal(levels[0] - levels[-1]) / Decimal(10000) if n > 1 else Decimal(0)

    sums = {}
    for label, fn in (
        ("naive", lambda: sum(floats)),
        ("neumaier", lambda: neumaier_sum(floats)),
        ("pairwise", lambda: _pairwise_sum(floats)),
        ("math_fsum", lambda: math.fsum(floats)),
    ):
        (result, seconds) = _timed(fn)
        sums[label] = {**_float_metrics(result / n, exact_mean, exact_mean), "seconds_median_5": seconds}

    variance_methods = {}
    for label, fn in (
        ("one_pass_naive", lambda: sum(value * value for value in floats) / n - (sum(floats) / n) ** 2),
        ("two_pass", lambda: two_pass_variance(floats)),
        ("two_pass_fsum_python_only", lambda: two_pass_variance_fsum(floats)),
        ("welford", lambda: welford_variance(floats)),
    ):
        value, seconds = _timed(fn)
        variance_methods[label] = {
            **_float_metrics(value, exact_variance, exact_mean, include_mean_ulp=False),
            "seconds_median_5": seconds,
        }

    def integrate_float():
        total = 0.0
        dt_h = 0.1 / 3600
        previous = levels[0] / 10000
        for integer in levels[1:]:
            current = integer / 10000
            total += ((previous - current) / dt_h) * dt_h
            previous = current
        return total

    integral, integral_seconds = _timed(integrate_float)
    decimal_value, decimal_seconds = _timed(
        lambda: sum(
            (Decimal.from_float(value / 10000) for value in levels),
            Decimal(0),
        ) / Decimal(n)
    )
    # La conversión desde binario conserva el efecto del redondeo de contexto de Decimal.
    decimal_integral, decimal_integral_seconds = _timed(
        lambda: _decimal_integral(levels)
    )
    return {
        "language": "python",
        "n": n,
        "seed": f"0x{SEED:016X}",
        "exact": {
            "level_sum_scaled": str(level_sum),
            "level_mean_l": str(exact_mean),
            "level_population_variance_l2": str(exact_variance),
            "leak_integral_l": str(exact_integral),
            "pressure_sum_scaled": str(sum(pressures)),
        },
        "mean_methods": sums,
        "variance_methods": variance_methods,
        "leak_integral": {
            "naive_float": {
                **_float_metrics(integral, exact_integral, exact_mean, include_mean_ulp=False),
                "seconds_median_5": integral_seconds,
            },
            "decimal_default_context": {
                "value": str(decimal_integral),
                "absolute_error": str(abs(decimal_integral - exact_integral)),
                "seconds_median_5": decimal_integral_seconds,
            },
        },
        "decimal_mean_default_context": {
            "value": str(decimal_value),
            "absolute_error": str(abs(decimal_value - exact_mean)),
            "seconds_median_5": decimal_seconds,
        },
    }


def _decimal_integral(levels: list[int]) -> Decimal:
    if len(levels) < 2:
        return Decimal(0)
    dt_h = Decimal("0.1") / Decimal(3600)
    total = Decimal(0)
    previous = Decimal(levels[0]) / Decimal(10000)
    for integer in levels[1:]:
        current = Decimal(integer) / Decimal(10000)
        total += ((previous - current) / dt_h) * dt_h
        previous = current
    return total


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=1_000_000)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    report = run_benchmark(args.n)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    print(
        f"python n={args.n} "
        f"mean_naive={report['mean_methods']['naive']['value']} "
        f"mean_exact={report['exact']['level_mean_l']} "
        f"integral_float={report['leak_integral']['naive_float']['value']} "
        f"integral_exact={report['exact']['leak_integral_l']}"
    )


if __name__ == "__main__":
    main()
