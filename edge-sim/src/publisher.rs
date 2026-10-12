use anyhow::{Context, Result};
use bytes::Bytes;
use rumqttc::{AsyncClient, EventLoop, MqttOptions, QoS, Transport};
use serde::Serialize;
use std::{sync::Arc, time::Duration};

pub type SharedClient = Arc<AsyncClient>;

#[derive(Serialize)]
struct Batch<'a, T> {
    rows: &'a [T],
}

pub fn connect(url: &str, client_id: &str, packet_size: usize) -> Result<(AsyncClient, EventLoop)> {
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
        options.set_transport(Transport::tls(ca, None, None));
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
