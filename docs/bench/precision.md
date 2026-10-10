# Precision drift benchmark

## Method

Both implementations generate the same one million level and pressure readings from the SplitMix64
stream and integer formulas documented in [`bench/precision/README.md`](../../bench/precision/README.md).
The exact reference uses scaled integer sums and an integer rational for population variance; reported
exact values are decimal strings. Float comparisons cover naive, Neumaier, pairwise, Python `math.fsum`,
one-pass variance, two-pass variance, Welford variance, and the accumulated leak integral from consecutive
levels at 0.1-second intervals. Python additionally measures default-context `Decimal` aggregation of
binary-float readings and a `math.fsum` two-pass variance that has no Rust counterpart. Runtime is the
median of five runs; raw output is in
[`python.json`](../../bench/precision/results/python.json) and
[`rust.json`](../../bench/precision/results/rust.json).

## Environment

- CPU: Apple M3 (`sysctl -n machdep.cpu.brand_string`)
- OS: Darwin 24.6.0, arm64
- Python: 3.11.16
- Rust: `rustc 1.98.1 (48a229cea 2026-09-01)`
- Input: 1,000,000 readings; seed `0x0123456789ABCDEF`; level starts at 95.0000 L and leaks about 3 L over the run
  with +/-0.1 L noise (physically plausible, never negative)
- Runtime caveat: both benchmarks ran on a busy machine (load average about 51), so the runtime column is
  indicative only; error and ULP columns are deterministic

## Results

| Language | Quantity / method | Result | Absolute error | Mean ULP distance | Median runtime (s) |
|---|---|---:|---:|---:|---:|
| Python | exact level mean | 93.5000234198 L | 0 | 0 | — |
| Python | naive mean | 93.50002341980095 L | 9.5366e-13 L | 67 | 0.00822 |
| Python | Neumaier mean | 93.5000234198 L | 1.5340e-15 L | 0 | 0.24891 |
| Python | pairwise mean | 93.50002341979999 L | 1.2677e-14 L | 1 | 0.14402 |
| Python | `math.fsum` mean | 93.5000234198 L | 1.5340e-15 L | 0 | 0.05062 |
| Rust | naive mean | 93.50002341980095366 L | 9.5366e-13 L | 67 | 0.00180 |
| Rust | Neumaier mean | 93.50002341980000153 L | 1.5340e-15 L | 0 | 0.00217 |
| Rust | pairwise mean | 93.50002341979998732 L | 1.2677e-14 L | 1 | 0.00163 |
| Python | exact population variance | 0.75326842077753296796 L² | 0 | — | — |
| Python | naive one-pass / two-pass / Welford variance | 0.753268419302913 / 0.753268420777509 / 0.753268420778091 L² | 1.4746e-09 / 2.3750e-14 / 5.5845e-13 L² | — | 0.10098 / 0.23143 / 0.23254 |
| Rust | naive one-pass / two-pass / Welford variance | 0.753268419302913 / 0.753268420777509 / 0.753268420778091 L² | 1.4746e-09 / 2.3759e-14 / 5.5844e-13 L² | — | 0.00369 / 0.00379 / 0.00997 |
| Python | two-pass variance with `math.fsum` (Python only) | 0.753268420777533 L² | 8.5911e-18 L² | — | 0.27743 |
| Python | leak integral, float | 2.8893999999999953 L | 4.6946e-15 L | — | 0.20941 |
| Rust | leak integral, float | 2.8893999999999953 L | 4.8850e-15 L | — | 0.00203 |
| Python | default-context `Decimal` mean of float readings | 93.50002341979999999507811202 L | 4.9219e-18 L | — | 1.43998 |

The exact cumulative integral is 2.8894 L (the telescoped difference between the first and last noisy
readings, so it differs from the nominal 3 L leak by the noise at the two ends); Python's default-context
Decimal integral is also 2.889400000000000000000000000 L. Pressure parity is covered by the shared
first-five vectors and 1,000-reading sum constants; the statistical benchmark focuses on level, the
leak-sensitive quantity.

Both languages now use the same algorithm for every shared method: sequential left-to-right float sums for
`naive`, `two_pass`, and the 32-element leaf blocks of `pairwise`. An earlier revision used `math.fsum` inside
Python's two-pass variance and pairwise leaves, which made Python's two-pass error (4.3e-13 L²) look better than
Rust's (9.6e-11 L²) on the same formula. The `math.fsum` variant is kept as the separate Python-only row above.
The residual 2.3750e-14 vs 2.3759e-14 L² two-pass difference is in the error computation: Python measures the
error against a `Decimal` reference, while Rust measures it against the exact variance rounded to `f64`.

## Interpretation

- The exact level mean is 93.5000234198 L, consistent with a series that starts at 95 L and leaks about 3 L.
- Mean: the naive float mean is off by 9.5366e-13 L (67 ULPs), about 1e-8 of the 1e-4 L input resolution.
  Neumaier and `math.fsum` return the correctly rounded mean (0 ULPs, 1.5340e-15 L); pairwise is 1 ULP away
  (1.2677e-14 L). Python and Rust agree on every mean error to the digits shown.
- Variance: the one-pass formula has the largest error, 1.4746e-09 L² (about 2e-9 relative). Two-pass is
  2.3750e-14 L² in Python and 2.3759e-14 L² in Rust, Welford is 5.5845e-13 and 5.5844e-13 L², and the
  Python-only `math.fsum` two-pass reaches 8.5911e-18 L². With sequential sums, the two-pass method beats
  Welford on this input in both languages, and exact summation improves it further.
- Leak integral: the float accumulation over one million steps errs by 4.6946e-15 L in Python and 4.8850e-15 L
  in Rust, against an exact 2.8894 L. This is far below the 1e-4 L sensor resolution.
- The default-context Decimal mean of binary-float readings differs from the exact mean by 4.9219e-18 L.
- Every float error measured here is orders of magnitude below the 1e-4 L input resolution, so on this
  95 L / 3 L-leak workload float aggregation does not change the mean or integral at sensor resolution;
  the largest error, the one-pass variance, is 1.4746e-09 L². These results do not show behaviour for
  other series (for example much larger magnitudes or longer runs).
- Runtimes were taken on a heavily loaded machine (see Environment) and are not interpreted here.
