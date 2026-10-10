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

The executable currently uses the offline path directly; MQTT connection and
batch helpers are exposed by the library for the process-level publisher
integration. Fleet scheduling should shard devices rather than create one
Tokio task per device when the MQTT path is enabled.

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

## Performance and limitations

The parity/offline path has been validated at 1,000 devices × 10 Hz on the
development laptop; benchmark output is intentionally not committed. Run the
release benchmark with `/usr/bin/time -l` and record rows/s, CPU, and peak RSS
in the orchestration report.

The current checked-in executable is the deterministic offline generator.
The rumqttc connection, packet sizing, and batch serialization are implemented
as library helpers; production MQTT scheduling, reconnect backoff, jitter,
statistics, and full shard lifecycle remain integration work for the process
runner. MQTT QoS 0 is the intended default because the backend subscriber is
QoS 0.
