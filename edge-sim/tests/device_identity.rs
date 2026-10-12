use oilguard_edge::{
    engine::{MqttPoolSink, Sink},
    publisher,
};
use rumqttc::{AsyncClient, MqttOptions};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Arc,
};

#[test]
fn resolves_per_device_certificate_and_key_paths() {
    let directory = tempfile_directory("paths");
    fs::write(directory.join("wheel-LH-01.crt"), b"dummy certificate").unwrap();
    fs::write(directory.join("wheel-LH-01.key"), b"dummy key").unwrap();

    let (certificate, key) =
        publisher::resolve_device_certificate_paths(&directory, "wheel-LH-01").unwrap();

    assert_eq!(certificate, directory.join("wheel-LH-01.crt"));
    assert_eq!(key, directory.join("wheel-LH-01.key"));
    fs::remove_dir_all(directory).unwrap();
}

#[test]
fn missing_per_device_file_error_names_device() {
    let directory = tempfile_directory("missing");
    fs::write(directory.join("wheel-LH-01.crt"), b"dummy certificate").unwrap();

    let error = publisher::resolve_device_certificate_paths(&directory, "wheel-LH-01")
        .unwrap_err()
        .to_string();

    assert!(error.contains("wheel-LH-01"), "{error}");
    fs::remove_dir_all(directory).unwrap();
}

#[test]
fn absent_cert_directory_preserves_single_identity_and_legacy_routing() {
    assert!(!publisher::per_device_identity_enabled(
        "mqtts://broker:8883",
        None
    ));
    assert!(!publisher::per_device_identity_enabled(
        "mqtt://broker:1883",
        Some(Path::new("certs"))
    ));
    assert_eq!(MqttPoolSink::legacy_client_index("wheel-01", 3), 0);
}

#[tokio::test]
async fn per_device_routing_does_not_fall_back_for_unknown_devices() {
    let (client, _event_loop) =
        AsyncClient::new(MqttOptions::new("device-test", "localhost", 1883), 8);
    let sink = MqttPoolSink::new_per_device(std::collections::HashMap::from([(
        "wheel-LH-01".to_string(),
        Arc::new(client),
    )]));

    assert!(sink.send("wheel-LH-01", vec![1], 0).await.is_ok());
    assert!(sink
        .send("wheel-LH-02", vec![1], 0)
        .await
        .unwrap_err()
        .to_string()
        .contains("wheel-LH-02"));
}

fn tempfile_directory(label: &str) -> PathBuf {
    let directory = std::env::temp_dir().join(format!(
        "oilguard-device-identity-{label}-{}",
        std::process::id()
    ));
    let _ = fs::remove_dir_all(&directory);
    fs::create_dir_all(&directory).unwrap();
    directory
}
