use std::f64::consts::PI;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct GearCase {
    pub r_out: f64,
    pub r_in: f64,
    pub length: f64,
}
pub const DEFAULT_GEAR_CASE: GearCase = GearCase {
    r_out: 0.60,
    r_in: 0.22,
    length: 0.42,
};
pub const RESEARCH_ROTATING_CAVITY: GearCase = GearCase {
    r_out: 0.50,
    r_in: 0.15,
    length: 0.70,
};
pub const G: f64 = 9.81;
pub const GEAR_RATIO: f64 = 32.62;

impl GearCase {
    pub fn volume_full_l(self) -> f64 {
        PI * (self.r_out * self.r_out - self.r_in * self.r_in) * self.length * 1000.0
    }
}
pub fn segment_area(r: f64, h: f64) -> f64 {
    if r <= 0.0 || h <= 0.0 {
        return 0.0;
    }
    if h >= 2.0 * r {
        return PI * r * r;
    }
    let d = r - h;
    r * r * (d / r).acos() - d * (0.0f64.max(2.0 * r * h - h * h)).sqrt()
}
fn chord(r: f64, h: f64) -> f64 {
    if r <= 0.0 || h <= 0.0 || h >= 2.0 * r {
        return 0.0;
    }
    2.0 * (0.0f64.max(2.0 * r * h - h * h)).sqrt()
}
pub fn volume_from_head(h: f64, gc: GearCase) -> f64 {
    (segment_area(gc.r_out, h) - segment_area(gc.r_in, h - (gc.r_out - gc.r_in)))
        * gc.length
        * 1000.0
}
pub fn head_from_volume(v: f64, gc: GearCase) -> f64 {
    if v <= 0.0 {
        return 0.0;
    }
    if v >= gc.volume_full_l() {
        return 2.0 * gc.r_out;
    }
    let (mut lo, mut hi) = (0.0, 2.0 * gc.r_out);
    while hi - lo > 1e-9 {
        let mid = 0.5 * (lo + hi);
        if volume_from_head(mid, gc) < v {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    0.5 * (lo + hi)
}
pub fn d_v_d_h(h: f64, gc: GearCase) -> f64 {
    0.0f64.max(chord(gc.r_out, h) - chord(gc.r_in, h - (gc.r_out - gc.r_in))) * gc.length
}
pub fn oil_density(temp: f64) -> f64 {
    901.0 * (1.0 - 7e-4 * (temp - 15.0))
}
pub fn hydrostatic_kpa(rho: f64, h: f64) -> f64 {
    rho * G * h / 1000.0
}
pub fn pressure_kpa_from_volume(v: f64, temp: f64, gc: GearCase) -> f64 {
    hydrostatic_kpa(oil_density(temp), head_from_volume(v, gc))
}
pub fn volume_from_pressure_kpa(p: f64, temp: f64, gc: GearCase) -> f64 {
    volume_from_head(p * 1000.0 / (oil_density(temp) * G), gc)
}
pub fn pressure_kpa_from_mass(m: f64, temp: f64, gc: GearCase) -> f64 {
    let rho = oil_density(temp);
    hydrostatic_kpa(rho, head_from_volume(m / rho * 1000.0, gc))
}
pub fn rotating_sensor_regime(wheel_rpm: f64) -> &'static str {
    let rpm = wheel_rpm.abs().clamp(0.0, 3000.0);
    let froude = (rpm * 2.0 * PI / 60.0).powi(2) * RESEARCH_ROTATING_CAVITY.r_out / G;
    if froude < 0.10 {
        "static_pool"
    } else if froude < 1.0 {
        "slosh"
    } else {
        "centrifugal_rimming"
    }
}
pub fn submerged_fraction(v: f64, radius: f64, wheel_rpm: f64) -> f64 {
    let gc = RESEARCH_ROTATING_CAVITY;
    let full = gc.volume_full_l();
    let v = v.clamp(0.0, full);
    if v <= 0.0 {
        return 0.0;
    }
    if v >= full {
        return 1.0;
    }
    let radius = radius.clamp(0.0, gc.r_out);
    if rotating_sensor_regime(wheel_rpm) == "centrifugal_rimming" {
        let film = v / 1000.0 / (2.0 * PI * gc.r_out * gc.length);
        return if radius >= gc.r_out - film { 1.0 } else { 0.0 };
    }
    let mut surface = head_from_volume(v, gc) - gc.r_out;
    if rotating_sensor_regime(wheel_rpm) == "slosh" {
        let omega = wheel_rpm.abs().clamp(0.0, 3000.0) * 2.0 * PI / 60.0;
        let froude = omega.powi(2) * gc.r_out / G;
        surface += (0.15 * gc.r_out).min(0.10 * gc.r_out * froude);
    }
    let count = 360;
    (0..count)
        .filter(|i| radius * (2.0 * PI * (*i as f64) / count as f64).sin() <= surface)
        .count() as f64
        / count as f64
}
pub fn stage_speeds(rotor: f64) -> [f64; 7] {
    let hs = rotor / 6.75;
    let wheel = hs / (1.0 + 92.0 / 24.0);
    [
        rotor,
        rotor,
        hs,
        hs,
        wheel,
        -(92.0 / 38.0) * hs,
        -(92.0 / 34.0) * wheel,
    ]
}
