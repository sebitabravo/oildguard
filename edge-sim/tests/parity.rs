use oilguard_edge::{generator, physics, signing};
use serde_json::Value;
use std::fs;
use time::{format_description::well_known::Rfc3339, OffsetDateTime, UtcOffset};

#[test]
fn generator_matches_all_golden_rows() {
    let raw = fs::read_to_string(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../tests/fixtures/generator_golden.json"
    ))
    .unwrap();
    let fixture: Value = serde_json::from_str(&raw).unwrap();
    let start = OffsetDateTime::parse(fixture["start"].as_str().unwrap(), &Rfc3339)
        .unwrap()
        .to_offset(UtcOffset::UTC);
    let seconds = fixture["seconds"].as_f64().unwrap();
    let device = fixture["device_id"].as_str().unwrap();
    for case in fixture["cases"].as_array().unwrap() {
        let actual = generator::rows(
            case["scenario"].as_str().unwrap(),
            seconds,
            device,
            case["seed"].as_i64().unwrap(),
            start,
        );
        let expected = case["rows"].as_array().unwrap();
        assert_eq!(actual.len(), expected.len());
        for (row, expected_row) in actual.iter().zip(expected) {
            let values = [
                serde_json::to_value(&row.t_iso).unwrap(),
                serde_json::to_value(&row.t_s).unwrap(),
                serde_json::to_value(row.seq).unwrap(),
                serde_json::to_value(&row.device_id).unwrap(),
                serde_json::to_value(&row.fsm_state).unwrap(),
                serde_json::to_value(row.moving).unwrap(),
                serde_json::to_value(row.recal_window).unwrap(),
                serde_json::to_value(row.engine_on).unwrap(),
                serde_json::to_value(&row.slope_deg).unwrap(),
                serde_json::to_value(&row.rotor_rpm).unwrap(),
                serde_json::to_value(&row.wheel_rpm).unwrap(),
                serde_json::to_value(&row.rotating_sensor_regime).unwrap(),
                serde_json::to_value(&row.submerged_fraction_per_revolution).unwrap(),
                serde_json::to_value(&row.pressure_kpa).unwrap(),
                serde_json::to_value(&row.temperature_c).unwrap(),
                serde_json::to_value(&row.vib_rms_g).unwrap(),
                serde_json::to_value(&row.vib_kurtosis).unwrap(),
                serde_json::to_value(&row.level_liters).unwrap(),
                serde_json::to_value(&row.level_pct).unwrap(),
                serde_json::to_value(row.link_down).unwrap(),
                serde_json::to_value(&row.label).unwrap(),
            ];
            let expected_strings: Vec<Value> = expected_row
                .as_array()
                .unwrap()
                .iter()
                .map(|v| {
                    Value::String(match v {
                        Value::String(s) => s.clone(),
                        _ => v.to_string(),
                    })
                })
                .collect();
            let actual_strings: Vec<Value> = values
                .into_iter()
                .map(|v| {
                    Value::String(match v {
                        Value::String(s) => s,
                        _ => v.to_string(),
                    })
                })
                .collect();
            assert_eq!(Value::Array(actual_strings), Value::Array(expected_strings));
        }
    }
}

#[test]
fn signing_vectors_match() {
    let raw = fs::read_to_string(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../tests/fixtures/signing_vectors.json"
    ))
    .unwrap();
    let fixture: Value = serde_json::from_str(&raw).unwrap();
    let key = hex::decode(fixture["key_hex"].as_str().unwrap()).unwrap();
    for vector in fixture["vectors"].as_array().unwrap() {
        let canonical = signing::canonical_bytes(&vector["row"]).unwrap();
        assert_eq!(canonical, vector["canonical"].as_str().unwrap().as_bytes());
        let mut row = vector["row"].clone();
        signing::sign(&mut row, &key).unwrap();
        assert_eq!(row["sig"], vector["sig"]);
    }
    for item in fixture["derived_keys"].as_array().unwrap() {
        let got = signing::derive_device_key(&key, item["device_id"].as_str().unwrap()).unwrap();
        assert_eq!(hex::encode(got), item["key_hex"]);
    }
}

#[test]
fn physics_fixture_matches() {
    let raw = fs::read_to_string(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../tests/fixtures/physics_parity.json"
    ))
    .unwrap();
    let f: Value = serde_json::from_str(&raw).unwrap();
    let gc = physics::DEFAULT_GEAR_CASE;
    for item in f["heads"].as_array().unwrap() {
        assert_close(
            physics::head_from_volume(item["volume_l"].as_f64().unwrap(), gc),
            item["head_m"].as_f64().unwrap(),
        );
    }
    for item in f["volumes"].as_array().unwrap() {
        let h = item["head_m"].as_f64().unwrap();
        assert_close(
            physics::volume_from_head(h, gc),
            item["volume_l"].as_f64().unwrap(),
        );
        assert_close(
            physics::d_v_d_h(h, gc),
            item["dv_dh_l_per_mm"].as_f64().unwrap(),
        );
    }
    for item in f["pressures"].as_array().unwrap() {
        let v = item["volume_l"].as_f64().unwrap();
        let t = item["temp_c"].as_f64().unwrap();
        assert_close(
            physics::pressure_kpa_from_volume(v, t, gc),
            item["pressure_kpa"].as_f64().unwrap(),
        );
        assert_close(
            physics::volume_from_pressure_kpa(item["pressure_kpa"].as_f64().unwrap(), t, gc),
            item["volume_back_l"].as_f64().unwrap(),
        );
    }
    for item in f["mass_pressures"].as_array().unwrap() {
        assert_close(
            physics::pressure_kpa_from_mass(
                item["mass_kg"].as_f64().unwrap(),
                item["temp_c"].as_f64().unwrap(),
                gc,
            ),
            item["pressure_kpa"].as_f64().unwrap(),
        );
    }
}
fn assert_close(a: f64, b: f64) {
    assert!((a - b).abs() <= 1e-9 + 1e-9 * b.abs(), "{a} != {b}");
}
