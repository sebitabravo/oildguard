use crate::{physics, rng::PythonRng};
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;
use time::{format_description::parse_borrowed, OffsetDateTime};

pub const HEADER: [&str; 21] = [
    "t_iso",
    "t_s",
    "seq",
    "device_id",
    "fsm_state",
    "moving",
    "recal_window",
    "engine_on",
    "slope_deg",
    "rotor_rpm",
    "wheel_rpm",
    "rotating_sensor_regime",
    "submerged_fraction_per_revolution",
    "pressure_kpa",
    "temperature_c",
    "vib_rms_g",
    "vib_kurtosis",
    "level_liters",
    "level_pct",
    "link_down",
    "label",
];

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Row {
    pub t_iso: String,
    pub t_s: String,
    pub seq: usize,
    pub device_id: String,
    pub fsm_state: String,
    pub moving: i32,
    pub recal_window: i32,
    pub engine_on: i32,
    pub slope_deg: String,
    pub rotor_rpm: String,
    pub wheel_rpm: String,
    pub rotating_sensor_regime: String,
    pub submerged_fraction_per_revolution: String,
    pub pressure_kpa: String,
    pub temperature_c: String,
    pub vib_rms_g: String,
    pub vib_kurtosis: String,
    pub level_liters: String,
    pub level_pct: String,
    pub link_down: i32,
    pub label: String,
}

pub fn fsm_state_at(t: f64) -> &'static str {
    let cycle = t % 29.0;
    if cycle < 6.0 {
        "LOAD"
    } else if cycle < 18.0 {
        "HAUL"
    } else if cycle < 24.0 {
        "DUMP"
    } else {
        "WAIT"
    }
}
fn moving(state: &str) -> bool {
    matches!(state, "HAUL" | "WAIT")
}
fn iso_at(start: OffsetDateTime, seq: usize) -> String {
    let dt = start + time::Duration::microseconds(seq as i64 * 100_000);
    if dt.microsecond() == 0 {
        dt.format(
            &parse_borrowed::<2>("[year]-[month]-[day]T[hour]:[minute]:[second]+00:00").unwrap(),
        )
        .expect("valid UTC timestamp")
    } else {
        dt.format(
            &parse_borrowed::<2>(
                "[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond digits:6]+00:00",
            )
            .unwrap(),
        )
        .expect("valid UTC timestamp")
    }
}
fn vib(rng: &mut PythonRng, is_moving: bool) -> (f64, f64) {
    let sigma = if is_moving { 1.15 } else { 0.33 };
    let base = if is_moving { 0.6 } else { 0.0 };
    let mut xs = Vec::with_capacity(100);
    for i in 0..100 {
        let mut v = base * (2.0 * PI * 47.0 * i as f64 / 1000.0).sin();
        v += rng.gauss(0.0, sigma);
        if is_moving && rng.random() < 0.02 {
            v += rng.gauss(0.0, 2.0);
        }
        xs.push(v);
    }
    let mean = xs.iter().sum::<f64>() / 100.0;
    let m2 = xs.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / 100.0;
    let m4 = xs.iter().map(|x| (x - mean).powi(4)).sum::<f64>() / 100.0;
    let rms = (xs.iter().map(|x| x * x).sum::<f64>() / 100.0).sqrt();
    let kurt = if m2 > 1e-9 { m4 / (m2 * m2) } else { 3.0 };
    (rms, kurt)
}

pub struct Generator {
    pub scenario: String,
    pub seconds: f64,
    pub device_id: String,
    pub rng: PythonRng,
    pub start: OffsetDateTime,
    pub leak_pct_per_h: f64,
    pub drop_liters: f64,
    pub viscosity_proxy: f64,
    i: usize,
    n: usize,
    holdup: f64,
    was_moving: bool,
    t_stop: f64,
    holdup_at_stop: f64,
}
impl Generator {
    pub fn new(
        scenario: &str,
        seconds: f64,
        device_id: &str,
        seed: i64,
        start: OffsetDateTime,
    ) -> Self {
        let n = (seconds * 10.0).round_ties_even() as usize;
        Self {
            scenario: scenario.into(),
            seconds,
            device_id: device_id.into(),
            rng: PythonRng::new(seed),
            start,
            leak_pct_per_h: 0.5,
            drop_liters: 15.0,
            viscosity_proxy: 1.0,
            i: 0,
            n,
            holdup: 0.0,
            was_moving: false,
            t_stop: 0.0,
            holdup_at_stop: 0.0,
        }
    }
    pub fn next_row(&mut self) -> Option<Row> {
        if self.i >= self.n {
            return None;
        }
        let i = self.i;
        self.i += 1;
        let t = i as f64 * 0.1;
        let state = fsm_state_at(t).to_owned();
        let is_moving = moving(&state);
        let (level, label) = match self.scenario.as_str() {
            "slow-leak" if t >= 2.0 => (
                95.0 - 95.0 * (self.leak_pct_per_h / 100.0) / 3600.0 * (t - 2.0),
                "slow-leak",
            ),
            "slow-leak" => (95.0, "normal"),
            "abrupt-drop" if t >= self.seconds * 0.5 => (95.0 - self.drop_liters, "abrupt-drop"),
            "abrupt-drop" => (95.0, "normal"),
            "sensor-drift" if t >= 2.0 => (95.0, "sensor-drift"),
            "link-outage" if self.seconds * 0.4 <= t && t < self.seconds * 0.6 => {
                (95.0, "link-outage-buffered")
            }
            _ => (95.0, "normal"),
        };
        let (rotor, slope) = if is_moving {
            (
                self.rng.gauss(2850.0, 80.0).clamp(0.0, 3000.0),
                4.0 * (2.0 * PI * t / 18.0).sin() + self.rng.gauss(0.0, 0.8),
            )
        } else {
            (
                self.rng.gauss(120.0, 25.0).max(0.0),
                self.rng.gauss(0.0, 0.25),
            )
        };
        let wheel = rotor / 32.62;
        if is_moving {
            self.holdup = 6.0 * (wheel / (3000.0 / 32.62)).clamp(0.0, 1.0);
        } else {
            if self.was_moving {
                self.t_stop = t;
                self.holdup_at_stop = self.holdup;
            }
            self.holdup = self.holdup_at_stop
                * (-(t - self.t_stop).max(0.0) / (0.75 * self.viscosity_proxy)).exp();
        }
        self.was_moving = is_moving;
        let pool = (level - self.holdup).max(0.0);
        let p_noise = self.rng.gauss(0.0, if is_moving { 0.04 } else { 0.01 });
        let temp = 75.0 + if is_moving { 0.8 } else { 0.0 } + self.rng.gauss(0.0, 0.2);
        let p_true = physics::pressure_kpa_from_volume(pool, temp, physics::DEFAULT_GEAR_CASE);
        let drift = if self.scenario == "sensor-drift" && t >= 2.0 {
            t - 2.0
        } else {
            0.0
        };
        let (rms, mut kurt) = vib(&mut self.rng, is_moving);
        if self.scenario == "abrupt-drop" && self.seconds * 0.5 <= t && t < self.seconds * 0.5 + 1.0
        {
            kurt += 2.5;
        }
        Some(Row {
            t_iso: iso_at(self.start, i),
            t_s: format!("{t:.1}"),
            seq: i,
            device_id: self.device_id.clone(),
            fsm_state: state,
            moving: is_moving as i32,
            recal_window: (!is_moving) as i32,
            engine_on: 1,
            slope_deg: format!("{slope:.2}"),
            rotor_rpm: format!("{rotor:.1}"),
            wheel_rpm: format!("{wheel:.2}"),
            rotating_sensor_regime: physics::rotating_sensor_regime(wheel).into(),
            submerged_fraction_per_revolution: format!(
                "{:.4}",
                physics::submerged_fraction(pool, 0.49, wheel)
            ),
            pressure_kpa: format!("{:.3}", p_true + p_noise + 0.005 * drift),
            temperature_c: format!("{:.2}", temp + 0.02 * drift),
            vib_rms_g: format!("{rms:.3}"),
            vib_kurtosis: format!("{kurt:.3}"),
            level_liters: format!("{level:.4}"),
            level_pct: format!("{:.3}", 100.0 * level / 95.0),
            link_down: (self.scenario == "link-outage"
                && self.seconds * 0.4 <= t
                && t < self.seconds * 0.6) as i32,
            label: label.into(),
        })
    }
}
pub fn rows(
    scenario: &str,
    seconds: f64,
    device_id: &str,
    seed: i64,
    start: OffsetDateTime,
) -> Vec<Row> {
    let mut g = Generator::new(scenario, seconds, device_id, seed, start);
    let mut out = Vec::with_capacity(g.n);
    while let Some(row) = g.next_row() {
        out.push(row);
    }
    out
}
