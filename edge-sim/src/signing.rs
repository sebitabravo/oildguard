use hmac::{Hmac, Mac};
use serde_json::Value;
use sha2::Sha256;

pub const SIGNED_FIELDS: [&str; 21] = [
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
fn precision(field: &str) -> Option<usize> {
    Some(match field {
        "t_s" => 1,
        "slope_deg" => 2,
        "rotor_rpm" => 1,
        "wheel_rpm" => 2,
        "submerged_fraction_per_revolution" => 4,
        "pressure_kpa" => 3,
        "temperature_c" => 2,
        "vib_rms_g" => 3,
        "vib_kurtosis" => 3,
        "level_liters" => 4,
        "level_pct" => 3,
        _ => return None,
    })
}
fn as_text(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        _ => v.to_string(),
    }
}
pub fn canonical_bytes(row: &Value) -> anyhow::Result<Vec<u8>> {
    let obj = row
        .as_object()
        .ok_or_else(|| anyhow::anyhow!("row must be an object"))?;
    let mut values = Vec::with_capacity(22);
    values.push("ogs1".to_owned());
    for field in SIGNED_FIELDS {
        let v = obj
            .get(field)
            .ok_or_else(|| anyhow::anyhow!("missing {field}"))?;
        let raw = as_text(v);
        if let Some(p) = precision(field) {
            values.push(format!("{:.*}", p, raw.parse::<f64>()?));
        } else if ["seq", "moving", "recal_window", "engine_on", "link_down"].contains(&field) {
            values.push((raw.parse::<f64>()? as i64).to_string());
        } else {
            values.push(raw);
        }
    }
    Ok(serde_json::to_vec(&values)?)
}
pub fn sign(row: &mut Value, key: &[u8]) -> anyhow::Result<()> {
    let payload = canonical_bytes(row)?;
    let mut mac = Hmac::<Sha256>::new_from_slice(key)?;
    mac.update(&payload);
    let sig = hex::encode(mac.finalize().into_bytes());
    let obj = row
        .as_object_mut()
        .ok_or_else(|| anyhow::anyhow!("row must be an object"))?;
    obj.insert("sig_v".into(), Value::String("ogs1".into()));
    obj.insert("sig".into(), Value::String(sig));
    Ok(())
}
pub fn derive_device_key(master: &[u8], device_id: &str) -> anyhow::Result<Vec<u8>> {
    if master.is_empty() || device_id.is_empty() {
        return Err(anyhow::anyhow!("empty key or device id"));
    }
    let mut mac = Hmac::<Sha256>::new_from_slice(master)?;
    mac.update(b"oilguard-device-key/v1\0");
    mac.update(device_id.as_bytes());
    Ok(mac.finalize().into_bytes().to_vec())
}
