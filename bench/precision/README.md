# Precision benchmark formulas

Both implementations use the same SplitMix64 stream. Starting with state `0x0123456789ABCDEF`, each
`next_u64` first adds `0x9E3779B97F4A7C15` modulo 2^64, then applies the SplitMix64 finalizer:
`z = (z xor (z >> 30)) * 0xBF58476D1CE4E5B9`, then
`z = (z xor (z >> 27)) * 0x94D049BB133111EB`, then `z xor (z >> 31)`, with multiplications modulo
2^64. Each sample consumes two successive outputs `u_level`, `u_pressure`.

For zero-based index `i`, integer level in 1e-4 L is
`950000 - 3*i + (u_level % 2001) - 1000`; pressure in 1e-3 kPa is
`10000 + (u_pressure % 3001)`. For the first 1,000 samples, levels begin
`949126, 949062, 950079, 950580, 950964`, pressure begins
`11979, 10436, 12703, 12104, 12991`; integer sums are `948498855` and `11526832`.

The exact mean is the integer sum divided by `n * scale`; exact population variance is
`(n * sum(x_i^2) - sum(x_i)^2) / (n^2 * scale^2)`. Mean and variance use level values with scale
10,000; the analogous pressure scale is 1,000. Readings become binary floating values via
`integer / scale`. The cumulative leak integral uses consecutive level differences: at each 0.1 s
step, `rate_l_per_h = (previous_level - current_level) / 10000 / (0.1 / 3600)` and contributes
`rate_l_per_h * (0.1 / 3600)` liters. The exact integral telescopes to
`(first_level - last_level) / 10000` liters. Rust and Python test the same first-five vectors and
1,000-reading sums to guard parity.
