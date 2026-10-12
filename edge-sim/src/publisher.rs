use anyhow::{Context, Result};
use bytes::Bytes;
use rumqttc::{AsyncClient, EventLoop, MqttOptions, QoS, Transport};
use serde::Serialize;
use std::{
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};

pub type SharedClient = Arc<AsyncClient>;

#[derive(Serialize)]
struct Batch<'a, T> {
    rows: &'a [T],
}

pub fn connect(url: &str, client_id: &str, packet_size: usize) -> Result<(AsyncClient, EventLoop)> {
    connect_with_identity(url, client_id, packet_size, None)
}

pub fn connect_for_device(
    url: &str,
    client_id: &str,
    packet_size: usize,
    cert_dir: &Path,
    device_id: &str,
) -> Result<(AsyncClient, EventLoop)> {
    if !url.starts_with("mqtts://") {
        anyhow::bail!("per-device client certificates require an mqtts:// URL");
    }
    let (certificate, key) = resolve_device_certificate_paths(cert_dir, device_id)?;
    connect_with_identity(
        url,
        client_id,
        packet_size,
        Some((certificate, key, device_id)),
    )
}

pub fn resolve_device_certificate_paths(
    cert_dir: &Path,
    device_id: &str,
) -> Result<(PathBuf, PathBuf)> {
    let certificate = cert_dir.join(format!("{device_id}.crt"));
    let key = cert_dir.join(format!("{device_id}.key"));
    for path in [&certificate, &key] {
        if !path.is_file() {
            anyhow::bail!(
                "missing per-device client certificate file for {device_id}: {}",
                path.display()
            );
        }
    }
    Ok((certificate, key))
}

pub fn per_device_identity_enabled(url: &str, cert_dir: Option<&Path>) -> bool {
    url.starts_with("mqtts://") && cert_dir.is_some()
}

fn connect_with_identity(
    url: &str,
    client_id: &str,
    packet_size: usize,
    device_identity: Option<(PathBuf, PathBuf, &str)>,
) -> Result<(AsyncClient, EventLoop)> {
    let (secure, parsed, default_port) = if let Some(parsed) = url.strip_prefix("mqtts://") {
        (true, parsed, "8883")
    } else if let Some(parsed) = url.strip_prefix("mqtt://") {
        (false, parsed, "1883")
    } else {
        (false, url, "1883")
    };
    let (host, port) = parsed.rsplit_once(':').unwrap_or((parsed, default_port));
    let mut options = MqttOptions::new(client_id, host, port.parse()?);
    options.set_keep_alive(Duration::from_secs(30));
    options.set_max_packet_size(packet_size, packet_size);
    if secure {
        let ca_path = std::env::var("OILGUARD_MQTT_CA")
            .context("mqtts:// requires OILGUARD_MQTT_CA to trust the broker")?;
        let ca = std::fs::read(ca_path).context("failed to read OILGUARD_MQTT_CA")?;
        let client_auth = if let Some((certificate, key, device_id)) = device_identity {
            Some((
                std::fs::read(&certificate).with_context(|| {
                    format!("failed to read client certificate for device {device_id}")
                })?,
                std::fs::read(&key)
                    .with_context(|| format!("failed to read client key for device {device_id}"))?,
            ))
        } else {
            let cert_path = std::env::var("OILGUARD_MQTT_CLIENT_CERT").ok();
            let key_path = std::env::var("OILGUARD_MQTT_CLIENT_KEY").ok();
            match (cert_path, key_path) {
                (Some(cert), Some(key)) => Some((
                    std::fs::read(cert).context("failed to read OILGUARD_MQTT_CLIENT_CERT")?,
                    std::fs::read(key).context("failed to read OILGUARD_MQTT_CLIENT_KEY")?,
                )),
                (None, None) => None,
                _ => anyhow::bail!(
                    "OILGUARD_MQTT_CLIENT_CERT and OILGUARD_MQTT_CLIENT_KEY must be set together"
                ),
            }
        };
        options.set_transport(Transport::tls(ca, client_auth, None));
    }
    Ok(AsyncClient::new(options, 256))
}

pub fn batch_payload<T: Serialize>(rows: &[T]) -> Result<Bytes> {
    Ok(Bytes::from(serde_json::to_vec(&Batch { rows })?))
}

pub async fn publish<T: Serialize>(
    client: &AsyncClient,
    device_id: &str,
    rows: &[T],
    qos: u8,
) -> Result<()> {
    let level = match qos {
        0 => QoS::AtMostOnce,
        1 => QoS::AtLeastOnce,
        _ => QoS::ExactlyOnce,
    };
    client
        .publish(
            format!("oilguard/signals/{device_id}"),
            level,
            false,
            batch_payload(rows)?,
        )
        .await?;
    Ok(())
}

pub async fn publish_payload(
    client: &SharedClient,
    device_id: &str,
    payload: Vec<u8>,
    qos: u8,
) -> Result<()> {
    let level = match qos {
        0 => QoS::AtMostOnce,
        1 => QoS::AtLeastOnce,
        _ => QoS::ExactlyOnce,
    };
    client
        .publish(
            format!("oilguard/signals/{device_id}"),
            level,
            false,
            payload,
        )
        .await?;
    Ok(())
}
