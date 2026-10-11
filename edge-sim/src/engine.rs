use crate::{
    buffer::EdgeBuffer,
    generator::{Generator, Row},
    publisher, signing,
};
use ::time::OffsetDateTime;
use anyhow::Result;
use serde::Serialize;
use std::{
    future::Future,
    pin::Pin,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, OnceLock,
    },
    time::{Duration, Instant},
};
use tokio::{
    sync::Mutex,
    time::{self, MissedTickBehavior},
};

pub type SinkFuture<'a> = Pin<Box<dyn Future<Output = Result<()>> + Send + 'a>>;

pub trait Sink: Send + Sync {
    fn send<'a>(&'a self, device_id: &'a str, payload: Vec<u8>, qos: u8) -> SinkFuture<'a>;
}

pub struct MqttSink {
    client: publisher::SharedClient,
}

impl MqttSink {
    pub fn new(client: publisher::SharedClient) -> Self {
        Self { client }
    }
}

impl Sink for MqttSink {
    fn send<'a>(&'a self, device_id: &'a str, payload: Vec<u8>, qos: u8) -> SinkFuture<'a> {
        Box::pin(
            async move { publisher::publish_payload(&self.client, device_id, payload, qos).await },
        )
    }
}

pub struct MqttPoolSink {
    clients: Vec<publisher::SharedClient>,
}

impl MqttPoolSink {
    pub fn new(clients: Vec<publisher::SharedClient>) -> Self {
        Self { clients }
    }
}

impl Sink for MqttPoolSink {
    fn send<'a>(&'a self, device_id: &'a str, payload: Vec<u8>, qos: u8) -> SinkFuture<'a> {
        let index = device_id
            .bytes()
            .fold(0usize, |sum, byte| sum.wrapping_add(byte as usize))
            % self.clients.len().max(1);
        let client = self.clients[index].clone();
        Box::pin(async move { publisher::publish_payload(&client, device_id, payload, qos).await })
    }
}

#[derive(Clone, Debug)]
pub struct EngineConfig {
    pub devices: usize,
    pub rate_hz: f64,
    pub seconds: f64,
    pub scenario: String,
    pub mix: Option<String>,
    pub seed: i64,
    pub device_prefix: String,
    pub shards: usize,
    pub batch_rows: usize,
    pub buffer_capacity: usize,
    pub jitter_ms: u64,
    pub qos: u8,
    pub mode_realtime: bool,
    pub sign_key: Option<Vec<u8>>,
    pub start: Option<OffsetDateTime>,
}

impl Default for EngineConfig {
    fn default() -> Self {
        Self {
            devices: 1,
            rate_hz: 10.0,
            seconds: 1.0,
            scenario: "clean".into(),
            mix: None,
            seed: 7,
            device_prefix: "wheel".into(),
            shards: 0,
            batch_rows: 10,
            buffer_capacity: 10_000,
            jitter_ms: 0,
            qos: 0,
            mode_realtime: true,
            sign_key: None,
            start: None,
        }
    }
}

#[derive(Default)]
pub struct Stats {
    started: OnceLock<Instant>,
    pub rows_generated: AtomicU64,
    pub rows_published: AtomicU64,
    pub buffered: AtomicU64,
    pub dropped: AtomicU64,
    pub reconnects: AtomicU64,
    pub latency_samples: Mutex<Vec<f64>>,
}

impl Stats {
    fn elapsed_seconds(&self) -> f64 {
        self.started
            .get_or_init(Instant::now)
            .elapsed()
            .as_secs_f64()
            .max(1e-9)
    }
    async fn record_latency(&self, value: f64) {
        let mut samples = self.latency_samples.lock().await;
        if samples.len() < 100_000 {
            samples.push(value);
        }
    }

    pub async fn snapshot(&self) -> StatsSnapshot {
        let mut samples = self.latency_samples.lock().await.clone();
        samples.sort_by(f64::total_cmp);
        let percentile = |p: f64| {
            samples
                .get(((samples.len().saturating_sub(1)) as f64 * p) as usize)
                .copied()
                .unwrap_or(0.0)
        };
        StatsSnapshot {
            rows_generated: self.rows_generated.load(Ordering::Relaxed),
            rows_published: self.rows_published.load(Ordering::Relaxed),
            rows_per_s: self.rows_generated.load(Ordering::Relaxed) as f64 / self.elapsed_seconds(),
            buffered: self.buffered.load(Ordering::Relaxed),
            dropped: self.dropped.load(Ordering::Relaxed),
            reconnects: self.reconnects.load(Ordering::Relaxed),
            p50_ms: percentile(0.50),
            p99_ms: percentile(0.99),
        }
    }
}

#[derive(Serialize, Clone, Debug)]
pub struct StatsSnapshot {
    pub rows_generated: u64,
    pub rows_published: u64,
    pub rows_per_s: f64,
    pub buffered: u64,
    pub dropped: u64,
    pub reconnects: u64,
    pub p50_ms: f64,
    pub p99_ms: f64,
}

pub fn assign_scenarios(config: &EngineConfig) -> Vec<String> {
    let mix = config.mix.as_deref().and_then(parse_mix);
    (0..config.devices)
        .map(|index| {
            let Some(items) = &mix else {
                return config.scenario.clone();
            };
            let target = (index as f64 + 0.5) / config.devices as f64;
            let mut cumulative = 0.0;
            for (name, weight) in items {
                cumulative += weight;
                if target < cumulative {
                    return name.clone();
                }
            }
            items
                .last()
                .map(|item| item.0.clone())
                .unwrap_or_else(|| config.scenario.clone())
        })
        .collect()
}

fn parse_mix(spec: &str) -> Option<Vec<(String, f64)>> {
    let mut items = Vec::new();
    for part in spec.split(',') {
        let (name, weight) = part.split_once(':')?;
        items.push((name.to_owned(), weight.parse().ok()?));
    }
    let total: f64 = items.iter().map(|(_, weight)| *weight).sum();
    if items.is_empty() || (total - 1.0).abs() > 1e-9 {
        None
    } else {
        Some(items)
    }
}

struct Device {
    id: String,
    generator: Generator,
    buffer: EdgeBuffer<Row>,
    batch: Vec<Row>,
}

async fn publish_rows(
    sink: &dyn Sink,
    device_id: &str,
    rows: &[Row],
    config: &EngineConfig,
    stats: &Stats,
    key: Option<&[u8]>,
) -> Result<()> {
    let mut values = Vec::with_capacity(rows.len());
    for row in rows {
        let mut value = serde_json::to_value(row)?;
        if let Some(master) = key {
            let device_key = signing::derive_device_key(master, &row.device_id)?;
            signing::sign(&mut value, &device_key)?;
        }
        values.push(value);
    }
    let payload = publisher::batch_payload(&values)?.to_vec();
    let started = Instant::now();
    sink.send(device_id, payload, config.qos).await?;
    stats
        .rows_published
        .fetch_add(rows.len() as u64, Ordering::Relaxed);
    stats
        .record_latency(started.elapsed().as_secs_f64() * 1000.0)
        .await;
    Ok(())
}

async fn send_batch(
    sink: &dyn Sink,
    device: &mut Device,
    config: &EngineConfig,
    stats: &Stats,
    _created: Instant,
) {
    if device.batch.is_empty() {
        return;
    }
    let pending = device.buffer.flush();
    let result = if pending.is_empty() {
        publish_rows(
            sink,
            &device.id,
            &device.batch,
            config,
            stats,
            config.sign_key.as_deref(),
        )
        .await
    } else {
        let flushed = publish_rows(
            sink,
            &device.id,
            &pending,
            config,
            stats,
            config.sign_key.as_deref(),
        )
        .await;
        if flushed.is_ok() {
            publish_rows(
                sink,
                &device.id,
                &device.batch,
                config,
                stats,
                config.sign_key.as_deref(),
            )
            .await
        } else {
            for row in pending {
                device.buffer.enqueue(row);
            }
            flushed
        }
    };
    match result {
        Ok(()) => {
            device.batch.clear();
        }
        Err(_) => {
            for row in device.batch.drain(..) {
                device.buffer.enqueue(row);
            }
            stats
                .buffered
                .store(device.buffer.pending() as u64, Ordering::Relaxed);
            stats
                .dropped
                .store(device.buffer.dropped_total, Ordering::Relaxed);
        }
    }
}

async fn run_shard(
    mut devices: Vec<Device>,
    config: EngineConfig,
    sink: Option<Arc<dyn Sink>>,
    stats: Arc<Stats>,
) -> Vec<Row> {
    let mut output = Vec::new();
    let period = Duration::from_secs_f64(1.0 / config.rate_hz);
    let mut interval = time::interval(period);
    interval.set_missed_tick_behavior(MissedTickBehavior::Delay);
    let ticks = if config.seconds > 0.0 {
        Some((config.seconds * config.rate_hz).round_ties_even() as usize)
    } else {
        None
    };
    let mut jitter = crate::rng::PythonRng::new(config.seed.wrapping_add(0x5eed));
    let mut tick_count = 0usize;
    loop {
        if let Some(ticks) = ticks {
            if tick_count >= ticks {
                break;
            }
        }
        tick_count += 1;
        interval.tick().await;
        for device in &mut devices {
            let now = if config.mode_realtime {
                Some(OffsetDateTime::now_utc())
            } else {
                None
            };
            if let Some(row) = device.generator.next_row_with_time(now) {
                let created = Instant::now();
                stats.rows_generated.fetch_add(1, Ordering::Relaxed);
                if config.jitter_ms > 0 {
                    time::sleep(Duration::from_secs_f64(
                        jitter.random() * config.jitter_ms as f64 / 1000.0,
                    ))
                    .await;
                }
                if let Some(sink) = sink.as_ref() {
                    device.batch.push(row);
                    if device.batch.len() >= config.batch_rows {
                        send_batch(sink.as_ref(), device, &config, &stats, created).await;
                    }
                } else {
                    output.push(row);
                }
            }
        }
    }
    if let Some(sink) = sink {
        for device in &mut devices {
            send_batch(sink.as_ref(), device, &config, &stats, Instant::now()).await;
        }
    }
    output
}

pub async fn run(config: EngineConfig, sink: Option<Arc<dyn Sink>>) -> (Vec<Row>, Arc<Stats>) {
    run_with_stats(config, sink, Arc::new(Stats::default())).await
}

pub async fn run_with_stats(
    config: EngineConfig,
    sink: Option<Arc<dyn Sink>>,
    stats: Arc<Stats>,
) -> (Vec<Row>, Arc<Stats>) {
    let _ = stats.started.set(Instant::now());
    let shard_count = if config.shards == 0 {
        std::thread::available_parallelism()
            .map(|n| n.get() * 4)
            .unwrap_or(4)
    } else {
        config.shards
    };
    let scenarios = assign_scenarios(&config);
    let mut shards: Vec<Vec<Device>> = (0..shard_count).map(|_| Vec::new()).collect();
    let start = OffsetDateTime::now_utc();
    for index in 0..config.devices {
        let id = format!("{}-{:02}", config.device_prefix, index + 1);
        let generator = if config.mode_realtime && config.seconds == 0.0 {
            Generator::new_unbounded(
                &scenarios[index],
                &id,
                config.seed + index as i64,
                config.start.unwrap_or(start),
            )
        } else {
            Generator::new(
                &scenarios[index],
                config.seconds,
                &id,
                config.seed + index as i64,
                config.start.unwrap_or(start),
            )
        };
        shards[index % shard_count].push(Device {
            id,
            generator,
            buffer: EdgeBuffer::new(config.buffer_capacity),
            batch: Vec::with_capacity(config.batch_rows),
        });
    }
    let mut handles = Vec::new();
    for devices in shards.into_iter().filter(|devices| !devices.is_empty()) {
        let shard_config = config.clone();
        let shard_sink = sink.clone();
        let shard_stats = stats.clone();
        handles.push(tokio::spawn(async move {
            run_shard(devices, shard_config, shard_sink, shard_stats).await
        }));
    }
    let mut rows = Vec::new();
    for handle in handles {
        if let Ok(mut shard_rows) = handle.await {
            rows.append(&mut shard_rows);
        }
    }
    rows.sort_by_key(|row| (row.device_id.clone(), row.seq));
    (rows, stats)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicUsize;

    struct TestSink {
        failures: AtomicUsize,
        payloads: Mutex<Vec<Vec<u8>>>,
    }

    impl Sink for TestSink {
        fn send<'a>(&'a self, _device_id: &'a str, payload: Vec<u8>, _qos: u8) -> SinkFuture<'a> {
            if self
                .failures
                .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |value| {
                    if value > 0 {
                        Some(value - 1)
                    } else {
                        None
                    }
                })
                .is_ok()
            {
                Box::pin(async { Err(anyhow::anyhow!("simulated outage")) })
            } else {
                Box::pin(async move {
                    self.payloads.lock().await.push(payload);
                    Ok(())
                })
            }
        }
    }

    #[tokio::test(start_paused = true)]
    async fn shards_generate_contiguous_rows() {
        let config = EngineConfig {
            devices: 5,
            seconds: 2.0,
            shards: 2,
            mode_realtime: false,
            ..Default::default()
        };
        let (rows, stats) = run(config, None).await;
        assert_eq!(rows.len(), 100);
        assert_eq!(stats.rows_generated.load(Ordering::Relaxed), 100);
        for device in 1..=5 {
            let id = format!("wheel-{device:02}");
            let seqs: Vec<_> = rows
                .iter()
                .filter(|row| row.device_id == id)
                .map(|row| row.seq)
                .collect();
            assert_eq!(seqs, (0..20).collect::<Vec<_>>());
        }
    }

    #[test]
    fn mix_assignment_is_exact_and_stable() {
        let config = EngineConfig {
            devices: 100,
            mix: Some("clean:0.7,slow-leak:0.2,abrupt-drop:0.1".into()),
            ..Default::default()
        };
        let first = assign_scenarios(&config);
        let second = assign_scenarios(&config);
        assert_eq!(first, second);
        assert_eq!(first.iter().filter(|x| x.as_str() == "clean").count(), 70);
        assert_eq!(
            first.iter().filter(|x| x.as_str() == "slow-leak").count(),
            20
        );
        assert_eq!(
            first.iter().filter(|x| x.as_str() == "abrupt-drop").count(),
            10
        );
    }

    #[tokio::test(start_paused = true)]
    async fn failed_batches_flush_in_order_after_recovery() {
        let sink = Arc::new(TestSink {
            failures: AtomicUsize::new(2),
            payloads: Mutex::new(Vec::new()),
        });
        let config = EngineConfig {
            devices: 1,
            seconds: 0.5,
            shards: 1,
            batch_rows: 1,
            mode_realtime: false,
            ..Default::default()
        };
        let (_, stats) = run(config, Some(sink.clone())).await;
        assert_eq!(stats.rows_generated.load(Ordering::Relaxed), 5);
        let payloads = sink.payloads.lock().await;
        let mut seqs = Vec::new();
        for payload in payloads.iter() {
            let rows: serde_json::Value = serde_json::from_slice(payload).unwrap();
            seqs.extend(
                rows["rows"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|row| row["seq"].as_u64().unwrap()),
            );
        }
        assert_eq!(seqs, vec![0, 1, 2, 3, 4]);
    }

    #[tokio::test(start_paused = true)]
    async fn buffer_overflow_counts_drops() {
        let sink = Arc::new(TestSink {
            failures: AtomicUsize::new(100),
            payloads: Mutex::new(Vec::new()),
        });
        let config = EngineConfig {
            devices: 1,
            seconds: 0.5,
            shards: 1,
            batch_rows: 1,
            buffer_capacity: 2,
            mode_realtime: false,
            ..Default::default()
        };
        let (_, stats) = run(config, Some(sink)).await;
        assert_eq!(stats.dropped.load(Ordering::Relaxed), 3);
    }
}
