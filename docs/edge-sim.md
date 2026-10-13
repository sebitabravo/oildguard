# OilGuard edge simulator

`oilguard-edge` is the Rust edge-side signal generator. It preserves the
existing OilGuard row schema while providing deterministic offline output for
parity, fleet generation, and performance measurements. Physics is evaluated
with `f64`; values are formatted only when a row is emitted.

```mermaid
flowchart LR
    D[Devices] --> S[Tokio shards]
    S --> B[Per-device bounded buffer]
    B --> M[MQTT / Mosquitto]
    M --> K[OilGuard backend]
```

## Architecture

The library separates the pure parity-critical components:

- `rng.rs` implements CPython's MT19937 `init_by_array`, 53-bit `random()`,
  and cached Box-Muller `gauss()`.
- `physics.rs` ports the annular gear-case geometry, hydrostatics, rotating
  sensor regime, submerged fraction, and gear train arithmetic.
- `generator.rs` implements the 29-second LOAD/HAUL/DUMP/WAIT state machine,
  hold-up drain-back, scenarios, exact field formatting, and UTC timestamps.
- `signing.rs` produces `ogs1` canonical JSON bytes and HMAC-SHA256 signatures,
  including master-key device derivation.
- `buffer.rs` is a bounded FIFO store-and-forward queue with drop-oldest
  accounting.
- `publisher.rs` provides rumqttc batching with an explicitly configured
  packet limit.

The runtime creates one Tokio task per shard (default:
`available_parallelism() * 4`, configurable with `--shards`). Each task owns
the generators for its devices and advances them on a shared interval with
`MissedTickBehavior::Delay`. MQTT connections are pooled and devices are
assigned to connections by a stable round-robin hash. Each device has a
bounded FIFO buffer; failed batches are retained, flushed before live rows
after recovery, and counted when drop-oldest overflow occurs.

## CLI

Build and run from `edge-sim/`:

```bash
cargo run --release -- \
  --devices 3 --seconds 2 --output jsonl:/tmp/edge.jsonl
```

Important options:

| Option | Default | Meaning |
| --- | --- | --- |
| `--devices` | `1` | Number of devices, from 1 to 10,000 |
| `--rate-hz` | `10` | Configured emission rate |
| `--seconds` | `0` | Simulation horizon; offline mode uses one second when omitted |
| `--scenario` | `clean` | `clean`, `slow-leak`, `abrupt-drop`, `sensor-drift`, or `link-outage` |
| `--mix` | none | Comma-separated scenario weights; deterministic fleet selection |
| `--seed` | `7` | Device `i` uses `seed + i` |
| `--device-prefix` | `wheel` | Device IDs are `<prefix>-NN` |
| `--mode` | `simulated` | Simulation timestamps use `--start` |
| `--output` | `stdout` | `stdout`, `jsonl:<path>`, or `csv:<path>` |
| `--sign` | off | Sign rows with a derived per-device HMAC key |
| `--master-key-hex` | env | Master key; alternatively `OILGUARD_DEVICE_MASTER_KEY` |
| `--mqtt-url` | `mqtt://localhost:1883` | MQTT endpoint for publisher integration |
| `--qos` | `0` | MQTT QoS |
| `--batch-rows` | `10` | Rows per MQTT batch |
| `--shards` | CPU × 4 | Tokio device shards |
| `--connections` | `1` | MQTT connection pool size |
| `--buffer-capacity` | `10000` | Per-device buffered rows |
| `--jitter-ms` | `0` | Uniform pre-publish delay; separate deterministic RNG |
| `--stats-interval` | `0` | JSON stats lines on stderr, in seconds |

Keys are never printed. The signed topic convention is
`oilguard/signals/<device_id>`.

## Parity guarantees

`cargo test` checks:

- CPython random and Gaussian values for seed 7.
- Every row in `tests/fixtures/generator_golden.json` (five 30-second cases).
- All signing vectors and derived device keys in
  `tests/fixtures/signing_vectors.json`.
- Geometry, hydrostatics, mass pressure, inverse pressure, and gear-case
  values in `tests/fixtures/physics_parity.json` to `1e-9`.
- FIFO flush order and bounded drop-oldest behavior.

The generator is byte-compatible for canonical signing input and row values.
Timestamp formatting uses Python's `isoformat()` shape: `+00:00`, with no
fraction when microseconds are zero and six digits otherwise.

`--mode simulated` uses the configured `--start` timestamp and remains covered
by the golden fixtures. `--mode realtime` preserves the same simulated `t_s`
and sequence values but stamps each row with the UTC wall clock at creation.
Jitter never consumes the generator RNG, so simulated row values are unchanged
when `--jitter-ms` changes.

## Measurements

Release measurements on the shared Apple M3/macOS development machine:

| Run | Generated rows | Approx. throughput | Peak RSS |
| --- | ---: | ---: | ---: |
| Offline, 10,000 devices × 10 Hz × 10 s | 1,000,000 | 8.6k rows/s | 3.4 MB |
| MQTT, 1,000 devices × 10 Hz × 30 s | 300,000 | 10.0k generated rows/s | 21.5 MB |
| MQTT, 5,000 devices × 10 Hz × 30 s | 1,500,000 | 50.0k generated rows/s | 64.0 MB |

The MQTT runs used `localhost:1883`, QoS 0, ten rows per batch, and one
connection. Final p50/p99 send latency was 0.000625/14.37 ms for 1,000
devices and 0.000542/3.46 ms for 5,000 devices. `/usr/bin/time -l` reported
the peak RSS above; CPU was shared with other builds, so these are throughput
measurements rather than isolated capacity guarantees.

Stats intentionally omit RSS from the JSON line because the crate does not
add a platform-specific libc dependency. Peak RSS is measured externally with
`/usr/bin/time -l`. MQTT QoS 0 remains the intended default because the
backend subscriber is QoS 0.

## Limitations

The MQTT event loop relies on rumqttc's reconnect behavior; failed publishes
are handled by the edge buffer and retried on subsequent batches. The current
stats latency sample is capped at 100,000 observations to avoid per-row
allocation. `--seconds 0` runs indefinitely in realtime mode; offline mode
uses a one-second smoke horizon when no finite horizon is supplied.

### MQTT security limits

Port 1883 permits anonymous connections and is bound to localhost for development
only. Port 8883 requires a client certificate (`require_certificate true`), but
has no per-topic ACL: any holder of a valid client certificate can publish or
subscribe on any topic. This is a documented prototype limit; per-topic ACLs
are planned.

Start the realtime simulator with `docker compose --profile sim up -d --build edge-sim`.
