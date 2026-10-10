use precision_drift::{
    decimal_ratio, generate_readings, neumaier_sum, two_pass_variance, welford_variance,
};
use std::env;
use std::fs;
use std::time::Instant;

fn median_runtime<F: FnMut() -> f64>(mut f: F) -> (f64, f64) {
    let mut durations = Vec::with_capacity(5);
    let mut value = 0.0;
    for _ in 0..5 {
        let start = Instant::now();
        value = std::hint::black_box(f());
        durations.push(start.elapsed().as_secs_f64());
    }
    durations.sort_by(f64::total_cmp);
    (value, durations[2])
}

fn ordered_bits(value: f64) -> u64 {
    let bits = value.to_bits();
    if bits >> 63 == 1 {
        !bits
    } else {
        bits | (1 << 63)
    }
}

fn exact_error(value: f64, numerator: i128, denominator: i128) -> f64 {
    let bits = value.to_bits();
    let exponent = ((bits >> 52) & 0x7ff) as i32;
    let fraction = bits & ((1u64 << 52) - 1);
    let mantissa = if exponent == 0 {
        fraction as i128
    } else {
        ((1u64 << 52) | fraction) as i128
    };
    let mantissa = if bits >> 63 != 0 { -mantissa } else { mantissa };
    let power = if exponent == 0 {
        -1074
    } else {
        exponent - 1023 - 52
    };
    if power < 0 && -power < 100 {
        let scale = 1i128 << (-power as u32);
        (mantissa * denominator - numerator * scale).abs() as f64 / (denominator * scale) as f64
    } else {
        (value - numerator as f64 / denominator as f64).abs()
    }
}

fn metric(value: f64, exact: f64, exact_num: i128, exact_den: i128, mean_exact: f64) -> String {
    let absolute = exact_error(value, exact_num, exact_den);
    let relative = if exact == 0.0 {
        0.0
    } else {
        absolute / exact.abs()
    };
    format!(
        "{{\"value\":\"{value:.17}\",\"absolute_error\":\"{absolute:.17e}\",\"relative_error\":\"{relative:.17e}\",\"mean_ulp_distance\":{}}}",
        ordered_bits(value).abs_diff(ordered_bits(mean_exact))
    )
}

fn timed_metric<F: FnMut() -> f64>(
    mut f: F,
    exact: f64,
    exact_num: i128,
    exact_den: i128,
    mean_exact: f64,
) -> (String, f64) {
    let (value, seconds) = median_runtime(&mut f);
    let mut result = metric(value, exact, exact_num, exact_den, mean_exact);
    result.pop();
    result.push_str(&format!(",\"seconds_median_5\":{seconds:.9}}}"));
    (result, seconds)
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let mut n = 1_000_000usize;
    let mut out = String::from("bench/precision/results/rust.json");
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--n" => {
                i += 1;
                n = args[i].parse().expect("--n must be an integer");
            }
            "--out" => {
                i += 1;
                out = args[i].clone();
            }
            other => panic!("unknown argument: {other}"),
        }
        i += 1;
    }

    let (levels, pressures) = generate_readings(n);
    let values: Vec<f64> = levels.iter().map(|&v| v as f64 / 10_000.0).collect();
    let level_sum: i128 = levels.iter().map(|&v| v as i128).sum();
    let square_sum: i128 = levels.iter().map(|&v| (v as i128) * (v as i128)).sum();
    let mean_exact = level_sum as f64 / (n as f64 * 10_000.0);
    let variance_num = n as i128 * square_sum - level_sum * level_sum;
    let variance_den = n as i128 * n as i128 * 100_000_000i128;
    let variance_exact = variance_num as f64 / variance_den as f64;
    let exact_mean_text = decimal_ratio(level_sum, n as i128 * 10_000);
    let exact_variance_text = decimal_ratio(variance_num, variance_den);
    let exact_integral_num = if n > 1 {
        levels[0] as i128 - levels[n - 1] as i128
    } else {
        0
    };
    let exact_integral_text = decimal_ratio(exact_integral_num, 10_000);
    let exact_integral = exact_integral_num as f64 / 10_000.0;

    let (naive, naive_t) = timed_metric(
        || std::hint::black_box(&values).iter().sum::<f64>() / n as f64,
        mean_exact,
        level_sum,
        n as i128 * 10_000,
        mean_exact,
    );
    let (neumaier, neumaier_t) = timed_metric(
        || neumaier_sum(std::hint::black_box(&values)) / n as f64,
        mean_exact,
        level_sum,
        n as i128 * 10_000,
        mean_exact,
    );
    let (pairwise, pairwise_t) = timed_metric(
        || pairwise_sum(std::hint::black_box(&values)) / n as f64,
        mean_exact,
        level_sum,
        n as i128 * 10_000,
        mean_exact,
    );

    let one_pass_fn = || {
        let values = std::hint::black_box(&values);
        let sum = values.iter().sum::<f64>();
        values.iter().map(|v| v * v).sum::<f64>() / n as f64 - (sum / n as f64).powi(2)
    };
    let (one_pass_value, one_pass_t) = median_runtime(one_pass_fn);
    let two_pass_fn = || two_pass_variance(std::hint::black_box(&values));
    let (two_pass_value, two_pass_t) = median_runtime(two_pass_fn);
    let welford_fn = || welford_variance(std::hint::black_box(&values));
    let (welford_value, welford_t) = median_runtime(welford_fn);

    let dt_h = 0.1 / 3600.0;
    let (integral_value, integral_t) = median_runtime(|| {
        let mut total = 0.0;
        for pair in std::hint::black_box(&levels).windows(2) {
            let previous = pair[0] as f64 / 10_000.0;
            let current = pair[1] as f64 / 10_000.0;
            total += ((previous - current) / dt_h) * dt_h;
        }
        total
    });

    let json = format!(
        r#"{{
  "language": "rust",
  "n": {n},
  "seed": "0x0123456789ABCDEF",
  "exact": {{
    "level_sum_scaled": "{level_sum}",
    "level_mean_l": "{exact_mean_text}",
    "level_population_variance_l2": "{exact_variance_text}",
    "leak_integral_l": "{exact_integral_text}",
    "pressure_sum_scaled": "{}"
  }},
  "mean_methods": {{
    "naive": {},
    "neumaier": {},
    "pairwise": {}
  }},
  "variance_methods": {{
    "one_pass_naive": {{"value":"{one_pass_value:.17}","absolute_error":"{:.17e}","relative_error":"{:.17e}","seconds_median_5":{one_pass_t:.9}}},
    "two_pass": {{"value":"{two_pass_value:.17}","absolute_error":"{:.17e}","relative_error":"{:.17e}","seconds_median_5":{two_pass_t:.9}}},
    "welford": {{"value":"{welford_value:.17}","absolute_error":"{:.17e}","relative_error":"{:.17e}","seconds_median_5":{welford_t:.9}}}
  }},
  "leak_integral": {{
    "naive_float": {{"value":"{integral_value:.17}","absolute_error":"{:.17e}","relative_error":"{:.17e}","seconds_median_5":{integral_t:.9}}}
  }}
}}"#,
        pressures.iter().map(|&v| v as i128).sum::<i128>(),
        with_time(naive, naive_t),
        with_time(neumaier, neumaier_t),
        with_time(pairwise, pairwise_t),
        (one_pass_value - variance_exact).abs(),
        (one_pass_value - variance_exact).abs() / variance_exact.abs(),
        (two_pass_value - variance_exact).abs(),
        (two_pass_value - variance_exact).abs() / variance_exact.abs(),
        (welford_value - variance_exact).abs(),
        (welford_value - variance_exact).abs() / variance_exact.abs(),
        (integral_value - exact_integral).abs(),
        (integral_value - exact_integral).abs() / exact_integral.abs()
    );
    let path = std::path::Path::new(&out);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).expect("create output directory");
    }
    fs::write(path, json).expect("write JSON output");
    println!(
        "rust n={n} mean_naive={:.17} mean_exact={} integral_float={:.17} integral_exact={}",
        values.iter().sum::<f64>() / n as f64,
        exact_mean_text,
        integral_value,
        exact_integral_text
    );
}

fn pairwise_sum(values: &[f64]) -> f64 {
    if values.len() <= 32 {
        return values.iter().sum();
    }
    let mid = values.len() / 2;
    pairwise_sum(&values[..mid]) + pairwise_sum(&values[mid..])
}

fn with_time(mut value: String, seconds: f64) -> String {
    value.pop();
    value.push_str(&format!(",\"seconds_median_5\":{seconds:.9}}}"));
    value
}
