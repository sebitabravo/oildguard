pub const SEED: u64 = 0x0123456789ABCDEF;

pub struct SplitMix64 {
    state: u64,
}

impl SplitMix64 {
    pub fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    pub fn next_u64(&mut self) -> u64 {
        self.state = self.state.wrapping_add(0x9E3779B97F4A7C15);
        let mut z = self.state;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58476D1CE4E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D049BB133111EB);
        z ^ (z >> 31)
    }
}

pub fn generate_readings(n: usize) -> (Vec<i64>, Vec<i64>) {
    let mut rng = SplitMix64::new(SEED);
    let mut levels = Vec::with_capacity(n);
    let mut pressures = Vec::with_capacity(n);
    for i in 0..n {
        let u_level = rng.next_u64();
        let u_pressure = rng.next_u64();
        levels.push(950_000 - (i as i64 * 3) + (u_level % 2001) as i64 - 1000);
        pressures.push(10_000 + (u_pressure % 3001) as i64);
    }
    (levels, pressures)
}

pub fn neumaier_sum(values: &[f64]) -> f64 {
    let (mut total, mut correction) = (0.0, 0.0);
    for &value in values {
        let candidate = total + value;
        if total.abs() >= value.abs() {
            correction += (total - candidate) + value;
        } else {
            correction += (value - candidate) + total;
        }
        total = candidate;
    }
    total + correction
}

pub fn welford_variance(values: &[f64]) -> f64 {
    let (mut count, mut mean, mut m2) = (0usize, 0.0, 0.0);
    for &value in values {
        count += 1;
        let delta = value - mean;
        mean += delta / count as f64;
        m2 += delta * (value - mean);
    }
    if count == 0 {
        0.0
    } else {
        m2 / count as f64
    }
}

pub fn two_pass_variance(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    values
        .iter()
        .map(|value| (value - mean).powi(2))
        .sum::<f64>()
        / values.len() as f64
}

pub fn decimal_ratio(numerator: i128, denominator: i128) -> String {
    assert!(denominator > 0);
    let negative = numerator < 0;
    let numerator = numerator.abs();
    let whole = numerator / denominator;
    let mut remainder = numerator % denominator;
    if remainder == 0 {
        return format!("{}{}", if negative { "-" } else { "" }, whole);
    }
    let mut fraction = String::new();
    while remainder != 0 && fraction.len() < 32 {
        remainder *= 10;
        fraction.push(char::from(b'0' + (remainder / denominator) as u8));
        remainder %= denominator;
    }
    while fraction.ends_with('0') {
        fraction.pop();
    }
    format!("{}{}.{}", if negative { "-" } else { "" }, whole, fraction)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splitmix64_published_vectors() {
        let mut rng = SplitMix64::new(SEED);
        assert_eq!(
            (0..5).map(|_| rng.next_u64()).collect::<Vec<_>>(),
            vec![
                0x157A3807A48FAA9D,
                0xD573529B34A1D093,
                0x2F90B72E996DCCBE,
                0xA2D419334C4667EC,
                0x01404CE914938008
            ]
        );
    }

    #[test]
    fn neumaier_handles_ill_conditioned_sum() {
        assert_eq!(neumaier_sum(&[1.0, 1e100, 1.0, -1e100]), 2.0);
    }

    #[test]
    fn welford_matches_two_pass_for_small_data() {
        let values = [1.0, 2.0, 3.0, 4.0, 5.0];
        assert!((welford_variance(&values) - two_pass_variance(&values)).abs() < 1e-14);
    }

    #[test]
    fn rust_parity_constants_from_readme() {
        let (levels, pressures) = generate_readings(1000);
        assert_eq!(&levels[..5], &[949126, 949062, 950079, 950580, 950964]);
        assert_eq!(&pressures[..5], &[11979, 10436, 12703, 12104, 12991]);
        assert_eq!(levels.iter().map(|&v| v as i128).sum::<i128>(), 948498855);
        assert_eq!(pressures.iter().map(|&v| v as i128).sum::<i128>(), 11526832);
    }
}
