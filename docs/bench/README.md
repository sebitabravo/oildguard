# Benchmarks

The benchmark documents separate deterministic numerical precision from
end-to-end telemetry stress:

| Benchmark | Measures | Report |
|---|---|---|
| Precision | f64 aggregation and decimal comparison over 1,000,000 readings | [`precision.md`](precision.md) |
| Stress | Rust simulator → MQTT → backend throughput, latency, queueing, and drops | [`stress.md`](stress.md) |

## Run precision

Read the implementation and input contract in
[`bench/precision/README.md`](../../bench/precision/README.md), then run the
language-specific benchmark commands documented there. The committed raw
outputs are under `bench/precision/results/`.

## Run stress

Start the Compose stack and build the release simulator:

```bash
docker compose up -d --build -V
cargo build --release --manifest-path edge-sim/Cargo.toml
python3 bench/stress/run_matrix.py \
  --edge edge-sim/target/release/oilguard-edge \
  --out docs/bench/stress-results.json
```

The runner requires the backend at `http://localhost:8000`, Mosquitto at
`localhost:1883`, and the `oilguard-backend` container name for Docker stats.
Use `--devices`, `--seconds`, `--rate-hz`, and `--batch-rows` to select a
smaller local run. The committed baseline files are historical measurements;
do not overwrite them without recording the environment and method.
