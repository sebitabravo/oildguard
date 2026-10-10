# Precision benchmark formulas

Both implementations use the same SplitMix64 stream. Starting with state `0x0123456789ABCDEF`, each
`next_u64` first adds `0x9E3779B97F4A7C15` modulo 2^64, then applies the SplitMix64 finalizer:
`z = (z xor (z >> 30)) * 0xBF58476D1CE4E5B9`, then
`z = (z xor (z >> 27)) * 0x94D049BB133111EB`, then `z xor (z >> 31)`, with multiplications modulo
2^64. Each sample consumes two successive outputs `u_level`, `u_pressure`.

For zero-based index `i`, integer level in 1e-4 L is
`max(0, 950000 - floor(3*i / 100) + (u_level % 2001) - 1000)`; the series models a 95 L gear case
(950000 units) with a slow linear leak of about 3 L (30,000 units) over the full run of 1,000,000
readings at 10 Hz (27.8 h), plus uniform noise of +/-0.1 L, and is clamped at 0 so the level can never
be negative. Pressure in 1e-3 kPa is
`10000 + (u_pressure % 3001)`. For the first 1,000 samples, levels begin
`949126, 949065, 950085, 950589, 950976`, pressure begins
`11979, 10436, 12703, 12104, 12991`; integer sums are `949982865` and `11526832`.

The exact mean is the integer sum divided by `n * scale`; exact population variance is
`(n * sum(x_i^2) - sum(x_i)^2) / (n^2 * scale^2)`. Mean and variance use level values with scale
10,000; the analogous pressure scale is 1,000. Readings become binary floating values via
`integer / scale`. The cumulative leak integral uses consecutive level differences: at each 0.1 s
step, `rate_l_per_h = (previous_level - current_level) / 10000 / (0.1 / 3600)` and contributes
`rate_l_per_h * (0.1 / 3600)` liters. The exact integral telescopes to
`(first_level - last_level) / 10000` liters. Rust and Python test the same first-five vectors and
1,000-reading sums to guard parity.

Variance methods are identical in both languages: `one_pass_naive` is `sum(x^2)/n - (sum(x)/n)^2`;
`two_pass` computes the mean with a sequential left-to-right float sum, then sums the squared deviations
sequentially and divides by `n`; `welford` is the running-mean update. Python additionally reports
`two_pass_fsum_python_only`, the same two-pass formula with exactly-rounded `math.fsum` sums, which has no
Rust counterpart. Python `sum` is sequential up to 3.11; Python 3.12+ compensates it, so the reported
environment pins the interpreter version.
