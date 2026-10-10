use std::f64::consts::PI;

pub struct PythonRng {
    state: [u32; 624],
    index: usize,
    gauss_next: Option<f64>,
}

impl PythonRng {
    pub fn new(seed: i64) -> Self {
        let mut rng = Self {
            state: [0; 624],
            index: 624,
            gauss_next: None,
        };
        let value = seed.unsigned_abs() as u32;
        rng.init_by_array(&[value]);
        rng
    }

    fn init_by_array(&mut self, key: &[u32]) {
        self.state[0] = 19650218;
        for i in 1..624 {
            self.state[i] = 1812433253u32
                .wrapping_mul(self.state[i - 1] ^ (self.state[i - 1] >> 30))
                .wrapping_add(i as u32);
        }
        let mut i = 1usize;
        let mut j = 0usize;
        let mut k = 624usize.max(key.len());
        while k > 0 {
            self.state[i] = (self.state[i]
                ^ (self.state[i - 1] ^ (self.state[i - 1] >> 30)).wrapping_mul(1664525))
            .wrapping_add(key[j])
            .wrapping_add(j as u32);
            i += 1;
            j += 1;
            if i >= 624 {
                self.state[0] = self.state[623];
                i = 1;
            }
            if j >= key.len() {
                j = 0;
            }
            k -= 1;
        }
        k = 623;
        while k > 0 {
            self.state[i] = (self.state[i]
                ^ (self.state[i - 1] ^ (self.state[i - 1] >> 30)).wrapping_mul(1566083941))
            .wrapping_sub(i as u32);
            i += 1;
            if i >= 624 {
                self.state[0] = self.state[623];
                i = 1;
            }
            k -= 1;
        }
        self.state[0] = 0x80000000;
        self.index = 624;
    }

    fn next_u32(&mut self) -> u32 {
        if self.index >= 624 {
            for i in 0..624 {
                let y = (self.state[i] & 0x80000000) | (self.state[(i + 1) % 624] & 0x7fffffff);
                self.state[i] = self.state[(i + 397) % 624]
                    ^ (y >> 1)
                    ^ if y & 1 != 0 { 0x9908b0df } else { 0 };
            }
            self.index = 0;
        }
        let mut y = self.state[self.index];
        self.index += 1;
        y ^= y >> 11;
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= y >> 18;
        y
    }

    pub fn random(&mut self) -> f64 {
        let a = (self.next_u32() >> 5) as f64;
        let b = (self.next_u32() >> 6) as f64;
        (a * 67108864.0 + b) * (1.0 / 9007199254740992.0)
    }

    pub fn gauss(&mut self, mu: f64, sigma: f64) -> f64 {
        let z = self.gauss_next.take().unwrap_or_else(|| {
            let x2pi = self.random() * 2.0 * PI;
            let g2rad = (-2.0 * (1.0 - self.random()).ln()).sqrt();
            self.gauss_next = Some(x2pi.sin() * g2rad);
            x2pi.cos() * g2rad
        });
        mu + z * sigma
    }
}

#[cfg(test)]
mod tests {
    use super::PythonRng;
    #[test]
    fn cpython_random_seed_7() {
        // Expected values generated with `python3 -c 'import random; ...'`.
        let mut r = PythonRng::new(7);
        let expected = [0.32383276483316237, 0.15084917392450192, 0.6509344730398537];
        for value in expected {
            assert_eq!(r.random(), value);
        }
    }
    #[test]
    fn cpython_gauss_seed_7() {
        let mut r = PythonRng::new(7);
        let expected = [-0.2558802884476004, 0.511431512516514, -0.2260961647831047];
        for value in expected {
            assert_eq!(r.gauss(0.0, 1.0), value);
        }
    }
}
