# Precision drift benchmark

## Method

Both implementations generate the same one million level and pressure readings from the SplitMix64
stream and integer formulas documented in [`bench/precision/README.md`](../../bench/precision/README.md).
The exact reference uses scaled integer sums and an integer rational for population variance; reported
exact values are decimal strings. Float comparisons cover naive, Neumaier, pairwise, Python `math.fsum`,
one-pass variance, two-pass variance, Welford variance, and the accumulated leak integral from consecutive
levels at 0.1-second intervals. Python additionally measures default-context `Decimal` aggregation of
binary-float readings. Runtime is the median of five runs; raw output is in
[`python.json`](../../bench/precision/results/python.json) and
[`rust.json`](../../bench/precision/results/rust.json).

## Environment

- CPU: Apple M3 (`sysctl -n machdep.cpu.brand_string`)
- OS: Darwin 24.6.0, arm64
- Python: 3.11.16
- Rust: `rustc 1.98.1 (48a229cea 2026-09-01)`
- Input: 1,000,000 readings; seed `0x0123456789ABCDEF`

## Results

| Language | Quantity / method | Result | Absolute error | Mean ULP distance | Median runtime (s) |
|---|---|---:|---:|---:|---:|
| Python | exact level mean | -54.9998775802 L | 0 | 0 | — |
| Python | naive mean | -54.999877580200376 L | 3.7631e-13 L | 53 | 0.00678 |
| Python | Neumaier mean | -54.9998775802 L | 2.7297e-16 L | 0 | 0.20812 |
| Python | pairwise mean | -54.999877580199986 L | 1.4484e-14 L | 2 | 0.15911 |
| Python | `math.fsum` mean | -54.9998775802 L | 2.7297e-16 L | 0 | 0.03875 |
| Rust | naive mean | -54.99987758020037631 L | 3.7631e-13 L | 53 | 0.00177 |
| Rust | Neumaier mean | -54.99987758019999973 L | 2.7297e-16 L | 0 | 0.00245 |
| Rust | pairwise mean | -54.99987758019998552 L | 1.4484e-14 L | 2 | 0.00063 |
| Python | exact population variance | 7499.99682208690271256796 L² | 0 | — | — |
| Python | naive / two-pass / Welford variance | 7499.996822086928 / 7499.996822086902 / 7499.996822086948 L² | 2.5038e-11 / 4.2821e-13 / 4.5047e-11 L² | — | 0.06975 / 0.26212 / 0.20230 |
| Rust | naive / two-pass / Welford variance | 7499.996822086928 / 7499.996822087000 / 7499.996822086948 L² | 2.4556e-11 / 9.6406e-11 / 4.4565e-11 L² | — | 0.00343 / 0.00348 / 0.00917 |
| Python | leak integral, float | 299.88919999999604 L | 3.9624e-12 L | — | 0.15781 |
| Rust | leak integral, float | 299.88919999999604 L | 3.9790e-12 L | — | 0.00186 |
| Python | default-context `Decimal` mean of float readings | -54.9998775801999999945781926 L | 5.4218e-18 L | — | 1.40817 |

The exact cumulative integral is 299.8892 L; Python's default-context Decimal integral is also
299.8892000000000000000000000 L. Pressure parity is covered by the shared first-five vectors and
1,000-reading sum constants; the statistical benchmark focuses on level, the leak-sensitive quantity.

## Interpretation

At the 1e-4 L input resolution, the mean errors are far below one reading unit, so binary floating-point
drift does not materially change OilGuard's reported mean at that resolution. The naive mean differs by
53 ULPs, while compensated and pairwise methods reduce that distance to zero and two ULPs respectively.
The population variance is more sensitive to its algorithm: two-pass is most accurate in Python here,
while Welford and the naive one-pass method show larger but still small errors. The million-step leak
integral accumulates about 4e-12 L of float error, which is measurable in the report but far below the
sensor scale. The default-context Decimal mean of binary-float readings differs from the exact integer
mean by about 5.4e-18 L, demonstrating context rounding without changing the practical resolution. These
measurements show that mean aggregation is safe at this resolution for this workload, whereas long
cumulative integrals deserve explicit numerical error budgets and stable summation if requirements become
tighter.
