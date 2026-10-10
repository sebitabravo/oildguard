# Stress benchmark

This benchmark measures the path from the Rust simulator through Mosquitto to
the backend. The committed baseline is reported without reinterpretation; the
optimization section is intentionally left for the next backend pass.

## Method

[`bench/stress/run_matrix.py`](../../bench/stress/run_matrix.py) runs each
fleet size with the Rust binary in realtime mode, at 10 Hz by default, with
10 rows per device batch. It samples `/metrics/ingest` once per second and
records backend container CPU and memory when Docker stats are available.

The stable interval begins after a 5-second warmup. Accepted throughput is the
slope of the cumulative `accepted_total` counter, not a single one-second
counter. Latency is the backend's `receive time - t_iso` definition. Because
each device publishes a batch of 10 rows at 10 Hz, a batch spans about 1
second; the median therefore includes roughly 0.5 seconds of batching delay.
The runner writes raw samples and the derived summary to the selected JSON
output.

## Environment

The committed baseline reports `arm64`, macOS 15.8.1, and Python 3.11.16 in
both source JSON files. The development machine is an Apple M3. Docker
resource settings are host configuration rather than benchmark output and are
not asserted as a portable capacity limit here; reruns should record the
Docker resources alongside their raw JSON.

## Baseline (before ingest optimization)

Values below are copied from
[`stress-baseline.json`](stress-baseline.json) and
[`stress-baseline-noinflux.json`](stress-baseline-noinflux.json). Throughput is
accepted rows/s; latency columns are the steady-state median of sampled p50
values and the maximum sampled p99.

| Influx | Devices × rate | Expected rows/s | Accepted rows/s | Accepted ratio | Latency p50 (s) | Latency p99 max (s) | Queue max | Dropped batches | Backend CPU median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| on | 100 × 10 Hz | 1,000 | 992.4646 | 0.9925 | 0.4941 | 1.1056 | 3 | 0 | 22.84% |
| on | 1,000 × 10 Hz | 10,000 | 5,149.9632 | 0.5150 | 2.2052 | 7.1787 | 1,000 | 23,274 | 77.51% |
| on | 5,000 × 10 Hz | 50,000 | 2,550.0911 | 0.0510 | 12.0662 | 17.3326 | 1,000 | 68,855 | 78.05% |
| on | 10,000 × 10 Hz | 100,000 | 1,630.3284 | 0.0163 | 7.3640 | 19.3900 | 1,000 | 103,876 | 67.50% |
| off | 1,000 × 10 Hz | 10,000 | 6,472.3529 | 0.6472 | 1.0094 | 12.3499 | 416 | 0 | 44.415% |

## Interpretation

The simulator publishes its offered workload in every case. With InfluxDB
enabled, accepted backend throughput is near 5–6k rows/s at the 1,000-device
case and falls as device count grows. Once the bounded queue reaches capacity,
backpressure is visible as counted dropped batches. Disabling InfluxDB removes
drops in the committed 1,000-device comparison and raises accepted throughput,
but it does not remove queueing: the queue still reaches 416 and the p99
sample remains 12.3499 s. These statements describe only the committed rows
above; they are not extrapolations to production hardware.

## After optimization

Values below are copied from [`stress-results.json`](stress-results.json),
measured on the same machine (arm64, macOS 15.8.1, Python 3.11.16 for the
runner) after the ingest work documented in
[`backend/API.md` — Ingest performance](../../backend/API.md): per-batch instead
of per-row work on the hot path (R2b), Influx writes moved to a dedicated
writer thread with coalescing (R2c), and an incremental fleet tick and outage
tracker so dashboard polling no longer rescans the store (R2d). InfluxDB was
enabled and no other agent or dev-server load was running during the run.

| Influx | Devices × rate | Expected rows/s | Accepted rows/s | Accepted ratio | Latency p50 (s) | Latency p99 max (s) | Queue max | Dropped batches | Backend CPU median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| on | 100 × 10 Hz | 1,000 | 995.5752 | 0.9956 | 0.4826 | 0.9432 | 0 | 0 | 7.50% |
| on | 1,000 × 10 Hz | 10,000 | 9,698.8481 | 0.9699 | 0.7940 | 3.1177 | 946 | 957 | 77.76% |
| on | 5,000 × 10 Hz | 50,000 | 3,642.4642 | 0.0728 | 5.5913 | 19.3844 | 1,000 | 73,583 | 80.47% |
| on | 10,000 × 10 Hz | 100,000 | 1,014.1997 | 0.0101 | 9.1271 | 25.6417 | 1,000 | 115,030 | 73.29% |

The simulator published every row in every case (`simulator_final.dropped`
is 0; 93,373 rows/s at 10,000 devices).

### Before vs after (Influx on)

| Devices | Accepted rows/s before → after | Dropped batches before → after | p99 before → after |
|---:|---|---|---|
| 100 | 992 → 996 | 0 → 0 | 1.11 s → 0.94 s |
| 1,000 | 5,150 → 9,699 (+88 %) | 23,274 → 957 | 7.18 s → 3.12 s |
| 5,000 | 2,550 → 3,642 (+43 %) | 68,855 → 73,583 | 17.3 s → 19.4 s |
| 10,000 | 1,630 → 1,014 | 103,876 → 115,030 | 19.4 s → 25.6 s |

### Reading

- At the design point of this prototype (hundreds to ~1,000 wheels at 10 Hz)
  one backend process now keeps up: 97 % of the offered rows are accepted,
  drops fall by 96 %, and p99 latency is ~3 s, of which ~0.5 s is the
  10-row batching window of the simulator.
- Beyond that, a single Python process is CPU-bound (~80 % of the container)
  and the bounded queue sheds load as counted drops instead of growing
  memory. 5,000 and 10,000 devices at 10 Hz are 5–10× above that ceiling;
  their numbers show the backpressure behaving as designed, not a supported
  operating point. The 10,000-device case also has fewer samples (22)
  because `/metrics/ingest` itself responds slowly under saturation.
- Scaling past one process (several ingest workers sharded by device, or
  per-site edge aggregation) is an ASSUMPTION for future work; it was not
  measured here. N threads inside one process were measured and rejected
  (GIL contention, see `backend/API.md`).
- Single 60 s runs on a shared laptop vary by roughly ±20 %; treat the table
  as indicative.
