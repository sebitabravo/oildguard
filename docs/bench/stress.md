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

Pending: rerun after R2b
