use anyhow::{Context, Result};
use clap::Parser;
use oilguard_edge::{generator, signing};
use std::{
    fs::File,
    io::{BufWriter, Write},
};
use time::{format_description::well_known::Rfc3339, OffsetDateTime, UtcOffset};

#[derive(Parser, Debug)]
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
    #[arg(long, default_value = "mqtt://localhost:1883")]
    mqtt_url: String,
    #[arg(long, default_value_t = 0)]
    qos: u8,
    #[arg(long, default_value_t = 10)]
    batch_rows: usize,
    #[arg(long, default_value_t = 1)]
    connections: usize,
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

fn main() -> Result<()> {
    let args = Args::parse();
    if args.devices == 0 || args.devices > 10_000 {
        anyhow::bail!("--devices must be 1..10000");
    }
    if args.rate_hz <= 0.0 {
        anyhow::bail!("--rate-hz must be positive");
    }
    let start = OffsetDateTime::parse(&args.start, &Rfc3339)?.to_offset(UtcOffset::UTC);
    let seconds = if args.seconds == 0.0 {
        1.0
    } else {
        args.seconds
    };
    let mut output = if let Some(path) = args.output.strip_prefix("jsonl:") {
        Some(BufWriter::new(File::create(path)?))
    } else {
        None
    };
    let mut csv = if let Some(path) = args.output.strip_prefix("csv:") {
        Some(BufWriter::new(File::create(path)?))
    } else {
        None
    };
    if let Some(w) = csv.as_mut() {
        writeln!(w, "{}", generator::HEADER.join(","))?;
    }
    let mut total = 0usize;
    for device in 0..args.devices {
        let scenario = args
            .mix
            .as_deref()
            .and_then(|m| m.split(',').next())
            .and_then(|x| x.split(':').next())
            .unwrap_or(&args.scenario);
        let id = format!("{}-{:02}", args.device_prefix, device + 1);
        let generated = generator::rows(scenario, seconds, &id, args.seed + device as i64, start);
        for row in generated {
            let mut value = serde_json::to_value(row.clone())?;
            if args.sign {
                let material = match args.master_key_hex.as_deref() {
                    Some(value) => value.to_owned(),
                    None => std::env::var("OILGUARD_DEVICE_MASTER_KEY").context(
                        "--sign requires --master-key-hex or OILGUARD_DEVICE_MASTER_KEY",
                    )?,
                };
                let key = hex::decode(material)?;
                let key = signing::derive_device_key(&key, &id)?;
                signing::sign(&mut value, &key)?;
            }
            total += 1;
            if let Some(w) = output.as_mut() {
                serde_json::to_writer(&mut *w, &value)?;
                w.write_all(b"\n")?;
            } else if let Some(w) = csv.as_mut() {
                let obj = value.as_object().unwrap();
                for (i, field) in generator::HEADER.iter().enumerate() {
                    if i > 0 {
                        write!(w, ",")?;
                    }
                    write!(
                        w,
                        "{}",
                        obj.get(*field)
                            .unwrap()
                            .as_str()
                            .unwrap_or(&obj.get(*field).unwrap().to_string())
                    )?;
                }
                writeln!(w)?;
            } else {
                println!("{}", serde_json::to_string(&value)?);
            }
        }
    }
    if let Some(w) = output.as_mut() {
        w.flush()?;
    }
    if let Some(w) = csv.as_mut() {
        w.flush()?;
    }
    eprintln!(
        "rows={total} rate_hz={} devices={} mqtt_url={} qos={} batch_rows={} connections={}",
        args.rate_hz, args.devices, args.mqtt_url, args.qos, args.batch_rows, args.connections
    );
    Ok(())
}
