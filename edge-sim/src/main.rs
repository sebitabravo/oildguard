use anyhow::{Context, Result};
use clap::Parser;
use oilguard_edge::{engine, generator, signing};
use std::{
    fs::File,
    io::{BufWriter, Write},
    sync::Arc,
};
use time::{format_description::well_known::Rfc3339, OffsetDateTime, UtcOffset};

#[derive(Parser, Debug, Clone)]
struct Args {
    #[arg(long, default_value_t = 1)]
    devices: usize,
    #[arg(long, default_value_t = 10.0)]
    rate_hz: f64,
    #[arg(long, default_value_t = 0.0)]
    seconds: f64,
    #[arg(long, default_value = "clean")]
    scenario: String,
    #[arg(long)]
    mix: Option<String>,
    #[arg(long, default_value_t = 7)]
    seed: i64,
    #[arg(long, default_value = "wheel")]
    device_prefix: String,
    #[arg(long, default_value_t = 0)]
    jitter_ms: u64,
    #[arg(long, default_value = "simulated")]
    mode: String,
    #[arg(long, default_value_t = 0)]
    shards: usize,
    #[arg(long, default_value = "mqtt://localhost:1883")]
    mqtt_url: String,
    #[arg(long, default_value_t = 0)]
    qos: u8,
    #[arg(long, default_value_t = 10)]
    batch_rows: usize,
    #[arg(long, default_value_t = 1)]
    connections: usize,
    #[arg(long, default_value_t = 10_000)]
    buffer_capacity: usize,
    #[arg(long)]
    buffer_dir: Option<std::path::PathBuf>,
    #[arg(long)]
    sign: bool,
    #[arg(long)]
    master_key_hex: Option<String>,
    #[arg(long, default_value = "stdout")]
    output: String,
    #[arg(long, default_value_t = 0)]
    stats_interval: u64,
    #[arg(long, default_value = "2026-01-01T00:00:00+00:00")]
    start: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    validate(&args)?;
    let start = OffsetDateTime::parse(&args.start, &Rfc3339)?.to_offset(UtcOffset::UTC);
    let realtime = args.mode == "realtime" && args.output == "stdout";
    let seconds = if realtime && args.seconds == 0.0 {
        0.0
    } else if args.seconds == 0.0 {
        1.0
    } else {
        args.seconds
    };
    let sign_key = if args.sign {
        let material = args
            .master_key_hex
            .clone()
            .or_else(|| std::env::var("OILGUARD_DEVICE_MASTER_KEY").ok())
            .context("--sign requires --master-key-hex or OILGUARD_DEVICE_MASTER_KEY")?;
        Some(hex::decode(material)?)
    } else {
        None
    };

    let shared_stats = Arc::new(engine::Stats::default());
    if realtime {
        let packet_size = args.batch_rows.saturating_mul(4096).max(64 * 1024);
        let cert_dir = std::env::var_os("OILGUARD_MQTT_CERT_DIR").map(std::path::PathBuf::from);
        let sink = if oilguard_edge::publisher::per_device_identity_enabled(
            &args.mqtt_url,
            cert_dir.as_deref(),
        ) {
            let cert_dir = cert_dir
                .as_deref()
                .expect("enabled only when cert directory exists");
            let mut clients = std::collections::HashMap::new();
            for index in 0..args.devices {
                let device_id = format!("{}-{:02}", args.device_prefix, index + 1);
                let (client, mut event_loop) = oilguard_edge::publisher::connect_for_device(
                    &args.mqtt_url,
                    &format!("oilguard-edge-{device_id}"),
                    packet_size,
                    cert_dir,
                    &device_id,
                )?;
                let shared = Arc::new(client);
                let event_stats = shared_stats.clone();
                tokio::spawn(async move {
                    let mut connected = false;
                    loop {
                        match event_loop.poll().await {
                            Ok(event) => {
                                engine::record_mqtt_event(&event_stats, &mut connected, &event);
                            }
                            Err(_) => {
                                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                            }
                        }
                    }
                });
                clients.insert(device_id, shared);
            }
            Arc::new(engine::MqttPoolSink::new_per_device(clients))
        } else {
            let mut clients = Vec::new();
            for index in 0..args.connections {
                let (client, mut event_loop) = oilguard_edge::publisher::connect(
                    &args.mqtt_url,
                    &format!("oilguard-edge-{index}"),
                    packet_size,
                )?;
                let shared = Arc::new(client);
                let event_stats = shared_stats.clone();
                tokio::spawn(async move {
                    let mut connected = false;
                    loop {
                        match event_loop.poll().await {
                            Ok(event) => {
                                engine::record_mqtt_event(&event_stats, &mut connected, &event);
                            }
                            Err(_) => {
                                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                            }
                        }
                    }
                });
                clients.push(shared);
            }
            Arc::new(engine::MqttPoolSink::new(clients))
        };
        let config = engine::EngineConfig {
            devices: args.devices,
            rate_hz: args.rate_hz,
            seconds,
            scenario: args.scenario.clone(),
            mix: args.mix.clone(),
            seed: args.seed,
            device_prefix: args.device_prefix.clone(),
            shards: args.shards,
            batch_rows: args.batch_rows,
            buffer_capacity: args.buffer_capacity,
            buffer_dir: args.buffer_dir.clone(),
            jitter_ms: args.jitter_ms,
            qos: args.qos,
            mode_realtime: true,
            sign_key: sign_key.clone(),
            start: Some(start),
        };
        let reporter_stats = shared_stats.clone();
        let reporter = if args.stats_interval > 0 {
            let interval = args.stats_interval;
            Some(tokio::spawn(async move {
                let mut ticker = tokio::time::interval(std::time::Duration::from_secs(interval));
                loop {
                    ticker.tick().await;
                    eprintln!(
                        "{}",
                        serde_json::to_string(&reporter_stats.snapshot().await).unwrap()
                    );
                }
            }))
        } else {
            None
        };
        let ((), stats) = {
            let cfg = config.clone();
            let sink = sink.clone();
            let stats = shared_stats.clone();
            let handle = tokio::spawn(async move {
                let (_, stats) = engine::run_with_stats(cfg, Some(sink), stats).await;
                stats
            });
            ((), handle.await?)
        };
        if let Some(reporter) = reporter {
            reporter.abort();
        }
        eprintln!("{}", serde_json::to_string(&stats.snapshot().await)?);
    } else {
        stream_offline(&args, start, seconds, sign_key.as_deref())?;
    }
    Ok(())
}

fn validate(args: &Args) -> Result<()> {
    if args.devices == 0 || args.devices > 10_000 {
        anyhow::bail!("--devices must be 1..10000");
    }
    if args.rate_hz <= 0.0 || args.batch_rows == 0 || args.connections == 0 {
        anyhow::bail!("rate, batch size, and connections must be positive");
    }
    Ok(())
}

fn stream_offline(
    args: &Args,
    start: OffsetDateTime,
    seconds: f64,
    master_key: Option<&[u8]>,
) -> Result<()> {
    let mut jsonl = match args.output.strip_prefix("jsonl:") {
        Some(path) => Some(BufWriter::new(File::create(path)?)),
        None => None,
    };
    let mut csv = match args.output.strip_prefix("csv:") {
        Some(path) => Some(BufWriter::new(File::create(path)?)),
        None => None,
    };
    if let Some(writer) = csv.as_mut() {
        writeln!(writer, "{}", generator::HEADER.join(","))?;
    }
    let config = engine::EngineConfig {
        devices: args.devices,
        scenario: args.scenario.clone(),
        mix: args.mix.clone(),
        ..Default::default()
    };
    let scenarios = engine::assign_scenarios(&config);
    for (index, scenario) in scenarios.iter().enumerate() {
        let id = format!("{}-{:02}", args.device_prefix, index + 1);
        let mut generator =
            generator::Generator::new(scenario, seconds, &id, args.seed + index as i64, start);
        while let Some(row) = generator.next_row() {
            let mut value = serde_json::to_value(&row)?;
            if let Some(master_key) = master_key {
                let device_key = signing::derive_device_key(master_key, &id)?;
                signing::sign(&mut value, &device_key)?;
            }
            if let Some(writer) = jsonl.as_mut() {
                serde_json::to_writer(&mut *writer, &value)?;
                writer.write_all(b"\n")?;
            } else if let Some(writer) = csv.as_mut() {
                let object = value.as_object().unwrap();
                for (index, field) in generator::HEADER.iter().enumerate() {
                    if index > 0 {
                        write!(writer, ",")?;
                    }
                    write!(writer, "{}", object.get(*field).unwrap())?;
                }
                writeln!(writer)?;
            } else {
                println!("{}", serde_json::to_string(&value)?);
            }
        }
    }
    if let Some(writer) = jsonl.as_mut() {
        writer.flush()?;
    }
    if let Some(writer) = csv.as_mut() {
        writer.flush()?;
    }
    Ok(())
}
