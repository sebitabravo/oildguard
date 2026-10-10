# Historical oilguard-mining-sim API guide (T8 / S4 numbering)

This guide retains the `oilguard-mining-sim` feature's T8/S4 sequence labels.
The endpoint behavior below is checked against the current backend source;
the old slice numbering is historical, not the current pro-twin task sequence.

FastAPI ingestion + query API. Source: `backend/main.py`.
Field names match `SignalRow` in `frontend/src/sim/signals.ts` 1:1
(source of truth for names/rates/units: `sim/SCHEMA.md`).
OpenAPI: `GET /openapi.json`, interactive docs at `/docs`.

Base URL (local): `http://localhost:8000`.
The frontend reads `PUBLIC_BACKEND_URL`; Compose sets it to
`http://localhost:8000` for the local dashboard.

## Endpoints

| Method | Path | Status when real |
|---|---|---|
| GET | `/health` | `ok` or `degraded` (session store, persisted Influx count, MQTT, signing, ingest metrics, and analyzer availability diagnostics) |
| POST | `/ingest` | `ok` — accepted rows stored; per-row signature rejections returned in the ack |
| GET | `/metrics/ingest` | `ok` — rolling row counters, queue backpressure and ingest latency p50/p95/p99 |
| GET | `/level` | `ok` — latest ingested ground-truth row echoed; `confidence` remains the `0.0` placeholder on this endpoint (`backend/main.py:346-377`) |
| GET | `/level/series?limit=300` | `ok` — rest-gated fused level series from the session store, evenly downsampled when needed |
| GET | `/windows?limit=50` | `ok` — rest windows grouped from `recal_window` flags |
| GET | `/alerts` | `ok` — T10 N1–N4 ladder over the memory store; `unavailable` when the analyzer cannot load |
| GET | `/rul` | `ok` — T10 trend-extrapolated RUL or a precision-gated `suppressed` result; `unavailable` when the analyzer cannot load |
| GET | `/fleet/aggregates` | `ok` — Polars windowed percentiles across the fleet or per device; `reason: "no_rows"` when the window is empty |
| GET | `/fleet/devices` | `ok` — per-device retention, last sample and signing health; `reason: "no_rows"` when empty |
| WS | `/ws/fleet` | one `fleet_tick` per second; the client may change the window with `{"window_s": n}` |

## Device selection

`/level`, `/level/series`, `/windows`, `/alerts` and `/rul` accept an optional
`device_id`. Without it the backend resolves, in order:

1. `OILGUARD_DEFAULT_DEVICE` (default `wheel-RH-01`) when that device is in the store.
2. Otherwise the most recently updated device in the store.
3. Otherwise the empty/no-rows response.

An explicit `device_id` always wins, even when it has no rows, so querying a
quiet device returns its own honest empty answer instead of another device's
data. Responses for a single device are byte-compatible with the pre-fleet
behavior; each also reports the resolved `device_id` at the top level.

## Per-device store

Rows are held per `device_id` in a `collections.deque` with
`maxlen=OILGUARD_RETENTION_ROWS` (default `36000`, one hour at 10 Hz). The
replay seen-set is bounded by the same window: when a row is evicted its
identity is forgotten, so a legitimate store-and-forward replay from the edge
is re-ingested instead of being rejected forever. A previously unseen device
cannot be blocked by another device's history.

`GET /health` adds `devices` (count) and `retention_rows`.

## Batched ingest and backpressure

The MQTT bridge subscribes to **`oilguard/signals`** (legacy single topic) and
**`oilguard/signals/+`** (per device). It only decodes and enqueues; a single
worker verifies signatures, appends to the store, and flushes InfluxDB in the
background every 1 s or every 5000 points.

The queue is bounded (`OILGUARD_INGEST_QUEUE`, default 1000 batches). When it
is full the batch is **dropped and counted** — never silently: `enqueue_batch`
returns `{"status": "dropped", "reason": "queue_full"}` and
`GET /metrics/ingest` exposes `queue.dropped_batches`. A silent drop would be
indistinguishable from a healthy fleet. A slow consumer degrades into visible
loss rather than unbounded memory.

`POST /ingest` is unchanged: synchronous, same response shape, and it calls the
same `verify_and_store` core the worker uses. Signature rules are identical on
both paths.

Messages on a per-device topic only receive `device_id` from the topic when the
payload does not carry one. It is never overwritten, because `device_id` is a
signed field and overriding it would invalidate the HMAC of a correctly signed
row.

## GET /metrics/ingest

```json
{
  "status": "ok",
  "kind": "ingest-metrics",
  "as_of": "...",
  "ingest": {
    "rows": {
      "accepted_1s": 100000, "accepted_10s": 1000000,
      "accepted_total": 42000000,
      "rejected_1s": 0, "rejected_10s": 3, "rejected_total": 12
    },
    "queue": {
      "depth": 0, "capacity": 1000, "dropped_batches": 0,
      "accepted_batches": 42, "failed_batches": 0,
      "pending_influx_points": 0
    },
    "latency": {
      "count": 100000, "min_s": 0.004, "max_s": 0.19,
      "mean_s": 0.031, "p50_s": 0.028, "p95_s": 0.086, "p99_s": 0.14,
      "invalid_samples": 2, "dropped_samples": 0,
      "unit": "s", "definition": "receive time - t_iso",
      "percentile_method": "linear", "max_latency_s": 3600.0
    },
    "influx": {"enabled": true, "flush_rows": 5000, "flush_seconds": 1.0, "status": "..."},
    "window_s": 10.0, "resolution_s": 0.05, "retention_rows": 36000, "devices": 10000
  }
}
```

Latency is **`receive time - t_iso`**, measured on accepted rows whose `t_iso`
parses as ISO-8601. Values below `0` (emitter clock ahead) and above
`max_latency_s` (3600 s, emitter stalled) are excluded and counted in
`invalid_samples`, otherwise a single broken clock poisons p99 and makes the
metric unusable. Percentiles use **linear interpolation**, the same method as
`/fleet/aggregates`. The sample buffer is bounded by count as well as by time
(100000 samples); if it overflows the oldest are dropped and counted in
`dropped_samples`. Rows whose `t_iso` does not parse are simply not sampled,
which shows up as `latency.count` below `rows.accepted_*`.

`accepted_*s` and `rejected_*s` are counted over the window `(now - W, now]`,
including the current partial second, so `accepted_1s` reads the rate of the
last second rather than the rows that happened to arrive after the last
second boundary. Windows are summed from `resolution_s` (0.05 s) buckets, so a
reading carries up to one bucket of quantization error (<=5%) against real
time; `resolution_s` is echoed in the payload. Counters are pruned by their
own 10 s window on write as well as on read, so they stay bounded even if
nothing ever queries the endpoint.

`GET /health` carries a compact `ingest` object (`queue_depth`,
`dropped_batches`, `accepted_rows_10s`, `rejected_rows_10s`,
`latency_p50_s`, `latency_p95_s`, `latency_p99_s`); it deliberately does not
duplicate the full `/metrics/ingest` payload.

## GET /fleet/aggregates

`GET /fleet/aggregates?window_s=10&metrics=pressure_kpa,temperature_c,vib_rms_g,level_liters&group=fleet|device&limit=200`

- `window_s` — 1..300, default 10.
- `metrics` — comma separated, deduplicated, from `pressure_kpa`,
  `temperature_c`, `vib_rms_g`, `vib_kurtosis`, `level_liters`, `level_pct`.
  Defaults to the four documented above. An unknown metric returns `422`.
- `group=fleet` (default) — one block per metric. `group=device` — one block
  per device; `limit` (default 200) truncates the list, while `devices` keeps
  reporting the true distinct count.
- `quantile_interpolation` — always `"linear"`, echoed in the response.

The window is applied **per device** against each device's own latest `t_s`
(falling back to arrival time when `t_s` is absent), so a device that stopped
reporting does not push the active ones out of the window.

```json
{
  "status": "ok",
  "kind": "fleet-aggregates",
  "as_of": "...",
  "window_s": 10,
  "metrics": ["pressure_kpa"],
  "group": "fleet",
  "limit": 200,
  "rows": 600,
  "devices": 3,
  "quantile_interpolation": "linear",
  "aggregates": {
    "pressure_kpa": {"mean": 6.66, "p50": 3.5, "p95": 17.5, "p99": 19.5,
                     "min": 1.0, "max": 20.0, "count": 600, "devices": 3}
  },
  "reason": null,
  "code": null
}
```

With `group=device`, `aggregates` is a list of
`{"device_id", "rows", "metrics": {<metric>: <block>}}` and each block reports
`devices: 1`.

An empty window returns HTTP 200 with `aggregates` empty (`[]` for
`group=device`) and `reason: "no_rows"`, `code: "no_rows"` — zeros would be
indistinguishable from a fleet genuinely at rest.

## GET /fleet/devices

```json
{
  "status": "ok",
  "kind": "fleet-devices",
  "as_of": "...",
  "count": 2,
  "retention_rows": 36000,
  "devices": [
    {
      "device_id": "wheel-RH-01",
      "rows_retained": 600, "retention_rows": 36000,
      "last_t_iso": "2026-10-09T06:24:00+00:00", "last_t_s": 599.9,
      "rows_accepted": 600, "rows_verified": 600,
      "rows_rejected": 0, "rows_offered": 600, "verified_ratio": 1.0,
      "rejected_reasons": {},
      "latest_level_liters": 94.8, "latest_level_pct": 99.8
    }
  ],
  "reason": null,
  "code": null
}
```

`verified_ratio` is `rows_verified / rows_offered`, where `rows_offered` is
accepted **plus** rejected. Using only accepted rows would leave a device
sending tampered rows at `1.0`, since its rejections would be invisible.

A device whose rows are **all** rejected still appears (with `rows_retained: 0`
and `last_t_iso: null`): it never enters the store, and hiding it would hide
exactly the device most worth seeing.

An empty store returns `count: 0`, `devices: []` and `reason`/`code`
`no_rows`.

## WS /ws/fleet

Every second the server pushes:

```json
{
  "type": "fleet_tick",
  "as_of": "...",
  "window_s": 10,
  "rows": 600,
  "devices": 3,
  "quantile_interpolation": "linear",
  "aggregates": {"<metric>": {"mean": 0, "p50": 0, "p95": 0, "p99": 0,
                              "min": 0, "max": 0, "count": 0, "devices": 0}},
  "ingest": {"queue_depth": 0, "dropped_batches": 0, "latency_p95_s": 0.08}
}
```

`aggregates` is always the **fleet** group over the tick window. The client may
send `{"window_s": n}` with `n` between 1 and 300; invalid values are ignored
and the stream continues. Ticks are never buffered: at most one is in flight,
so a slow client misses samples instead of the server accumulating memory.
Disconnect is handled cleanly and cancels the reader task.

## Ingest performance

Measured in-process by `backend/bench_ingest.py`, which drives the same path
the MQTT worker uses — decode → verify → store → metrics, Influx disabled —
with realistic batches (10 rows per device per publish at 10 Hz). It runs
without Docker or a broker:

```bash
python -m backend.bench_ingest --devices 1000 --ticks 30 --repeat 5
python -m backend.bench_ingest --devices 1000 --profile     # cProfile, measured loop only
python -m backend.ab_ingest                                 # interleaved before/after
```

Two measurement rules matter, and both were learned the hard way:

- **`--profile` scopes cProfile to the measured loop.** Profiling the whole
  script attributes 394 s of 406 s to `build_batches`: you are timing the
  physics generator, not ingest.
- **`--repeat` reports the median of N passes.** A single pass varies ±20% on
  a busy machine, which is wider than several of the wins below. For the same
  reason, `backend/ab_ingest.py` alternates baseline and current code in one
  session instead of measuring them minutes apart.

### Before / after

Medians of 5 passes, interleaved against `41401bf` (the commit before this
work), 300,000 rows per configuration:

| Configuration | Before | After | Delta |
|---|---|---|---|
| unsigned, 100 devices | 80,643 | 136,038 | **+69 %** |
| unsigned, 1,000 devices | 77,073 | 115,260 | **+50 %** |
| unsigned, 5,000 devices | 68,728 | 91,373 | **+33 %** |
| signed, 1,000 devices | 20,797 | 29,855 | **+44 %** |

Throughput no longer falls off as devices grow: 1,000 → 5,000 devices moves
from 115,260 to 91,373 rows/s in-process, with the per-batch cost amortized
rather than paid per device.

### What the profile showed, and what was changed

| Cost | Evidence | Change |
|---|---|---|
| Per-row HMAC key derivation | `derive_device_key` 1.2 s of 13 s signed | cached per master key |
| Per-row `time.time()` in the store | visible in `commit` | one `received_at` per batch |
| Per-row `Counter` updates | inside `_append_locked` | accumulated per batch, flushed once |
| Per-row `datetime.fromisoformat` | `_parse_t_iso` 0.36 s + list-comp 0.61 s per 300k rows | `TisoClock` memo + one explicit pass |
| Per-row latency lock | `observe` 0.72 s of 5.1 s | `observe_many`, one lock per batch |
| JSON decode | 31 % of the path after the above | `orjson` when available |

### Rejected with data

**N worker threads sharded by device.** The remaining hot work is pure-Python
dict and deque manipulation, which does not release the GIL, so extra threads
add contention and queueing without adding parallelism:

| Workers | rows/s |
|---|---|
| 1 | 83,871 |
| 2 | 69,995 (−17 %) |
| 4 | 39,327 (−53 %) |

Sharding would also need per-device ordering to be preserved explicitly. Not
adopted: it is strictly slower here.

### Known cost not removed

The per-batch `INFO` log line (`ingest accepted=… rejected=…`) costs about
**8 %** of the path (100,899 → 109,694 rows/s when silenced). It was left as
is: at 1,000 devices it is 1,000 log lines per second, which is close to
useless, but log verbosity is an operational trade-off rather than a
correctness one, and the decision belongs to the maintainers. Setting the
`oilguard-backend` logger to `WARNING` recovers the 8 % without a code change.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `OILGUARD_RETENTION_ROWS` | `36000` | rows retained per device (1 h at 10 Hz) |
| `OILGUARD_DEFAULT_DEVICE` | `wheel-RH-01` | device used when `device_id` is omitted |
| `OILGUARD_INGEST_QUEUE` | `1000` | bounded ingest queue, in batches |
| `OILGUARD_INFLUX_WRITE` | `1` | `0` disables InfluxDB (load tests) |
| `OILGUARD_INFLUX_FLUSH_ROWS` | `5000` | points buffered before a forced flush |
| `OILGUARD_INFLUX_FLUSH_SECONDS` | `1` | max seconds a point waits in the buffer |
| `OILGUARD_INFLUX_COUNT_TTL_S` | `30` | how long `/health` reuses a cached `influx_points` |
| `OILGUARD_INFLUX_COUNT_PROBE_WAIT_S` | `0.1` | max seconds `/health` waits for a count probe |
| `OILGUARD_FLEET_TICK_SECONDS` | `1` | WebSocket tick period |
| `OILGUARD_DEVICE_KEYS` | _(empty)_ | explicit `device_id:hex_key` entries |
| `OILGUARD_DEVICE_MASTER_KEY` | _(empty)_ | hex master key for derived device keys |
| `OILGUARD_REQUIRE_SIGNATURE` | `0` | `1` rejects unsigned rows |

With `OILGUARD_INFLUX_WRITE=0` the backend never opens an InfluxDB client and
reports `disabled (OILGUARD_INFLUX_WRITE=0); rows kept in memory`. It reuses
the `influx_client_missing` message code: the client-visible contract is
identical (nothing written, rows kept in memory).

## GET /health

`/health` responds with HTTP 200 while reporting whether the analysis runtime
can be imported. `status` is `ok` when available and `degraded` when it is
not. The `analysis` object includes a boolean `available` and a diagnostic
`reason` (`null` on success):

```json
{
  "status": "ok",
  "analysis": {"available": true, "reason": null},
  "store_rows": 600,
  "devices": 1,
  "retention_rows": 36000,
  "influx_points": 1200,
  "influx": "unknown (no ingest yet)",
  "influx_message": {"code": "influx_unknown_no_ingest", "params": {}},
  "signing": {
    "enforced": false,
    "devices": 0,
    "verified_total": 0,
    "rejected_total": 0,
    "rejected_reasons": {}
  },
  "device_keys": {"explicit": 0, "master_key_configured": false},
  "ingest": {
    "queue_depth": 0, "dropped_batches": 0,
    "accepted_rows_10s": 600, "rejected_rows_10s": 0,
    "latency_p50_s": 0.002, "latency_p95_s": 0.004, "latency_p99_s": 0.005
  }
}
```

When the analyzer or one of its runtime packages cannot load, health remains
HTTP 200 but reports `status: "degraded"`, `analysis.available: false`, and
the import failure in `analysis.reason`. Do not interpret an empty alert list
as a clean analysis unless the corresponding response has `evaluated: true`.

`store_rows` counts rows accepted into this backend process's in-memory session;
it resets on backend restart and does not represent historical persistence.
`influx_points` is an independent count of persisted `_field == "seq"` values
for measurement `oilguard_signals` in the configured bucket across its retained
range. A successful empty query returns `0`. The count query has a 1,200 ms
client timeout and runs outside the in-memory store lock. If configuration,
the SDK, or the query is unavailable, `influx_points` is `null`; `/health`
still responds with HTTP 200.

`/health` never blocks on InfluxDB. Counting millions of points takes
seconds, and a health check that hangs does not report anything — it only
exhausts whoever asks. The count runs in a background probe cached for
`OILGUARD_INFLUX_COUNT_TTL_S` (30 s); a request reads the cache and waits at
most `OILGUARD_INFLUX_COUNT_PROBE_WAIT_S` (0.1 s) *only when it is the one
launching the probe*. A probe that overruns is not discarded — it fills the
cache for the next caller. Measured against an Influx endpoint that hangs on
connect: first call ~140 ms, subsequent calls ~2–5 ms.

Two extra fields describe the cached value:

| Field | Meaning |
|---|---|
| `influx_points_as_of` | ISO-8601 timestamp of the probe that produced the value, or `null` |
| `influx_points_reason` | `null` when known, else `not_probed`, `count_unavailable` or `probe_failed` |
| `influx_points_ttl_s` | configured TTL |

The cache is invalidated when the Influx URL/org/bucket/token, the installed
`influxdb_client` module, or the counting function itself changes — a cached
count from a different installation would misreport persistence.

Backend-generated prose/status fields retain their legacy English string and
add a sibling `<field>_message` object for clients that localize the text:
`{"code": "stable_snake_case", "params": {...}}`. Parameter values are
typed JSON scalars/lists; they are the values used by the corresponding
message template, not preformatted strings. The single code/parameter-name
catalog is `shared/message_codes.json`. `/level` is read from the in-memory
session store only; it does not read from InfluxDB.

## POST /ingest

Body: `{ "rows": [SignalRow, ...] }` (1–5000 rows per batch, 10 Hz rows
from `sim/generate.py`).

```json
{
  "rows": [
    {
      "t_iso": "2026-10-09T06:23:18.569142+00:00",
      "t_s": 0.0,
      "seq": 0,
      "device_id": "wheel-RH-01",
      "fsm_state": "LOAD",
      "moving": 0,
      "recal_window": 1,
      "engine_on": 1,
      "slope_deg": 0.13,
      "rotor_rpm": 113.6,
      "wheel_rpm": 3.48,
      "rotating_sensor_regime": "static_pool",
      "submerged_fraction_per_revolution": 1.0,
      "pressure_kpa": 2.579,
      "temperature_c": 74.94,
      "vib_rms_g": 0.324,
      "vib_kurtosis": 2.415,
      "level_liters": 95.0,
      "level_pct": 100.0,
      "link_down": 0,
      "label": "normal"
    }
  ]
}
```

Ack:

```json
{
  "status": "ok",
  "kind": "ingest-ack",
  "as_of": "2026-10-09T06:24:00+00:00",
  "ingested": 5,
  "latest_seq": 4,
  "store_rows": 5,
  "influx": "fallback-memory (unreachable ...); rows kept in memory",
  "influx_message": {"code": "influx_unreachable", "params": {}},
  "rejected": 0,
  "rejected_reasons": {}
}
```

The `influx` string reports the write outcome per batch: either
`written (N points -> URL bucket=...)` or a `fallback-memory (reason)`
message that is also logged server-side. Rows are never dropped when
InfluxDB is down.

### Per-row signatures

The edge mock can add `sig_v` and `sig` as the last two CSV columns. `sig_v`
is `ogs1`; `sig` is the HMAC-SHA256 digest over the complete canonical row
described in `sim/SCHEMA.md`. The HTTP model preserves those optional fields.
The backend verifies rows inside the shared ingest path before InfluxDB or
memory storage, including rows forwarded directly by the in-process MQTT
bridge.

Configure keys by device ID using `OILGUARD_DEVICE_KEYS` with comma-separated
`device_id:hex_key` entries. `OILGUARD_REQUIRE_SIGNATURE=1` rejects unsigned
rows; its default is `0`, which accepts unsigned demo rows. A present but
invalid signature is always rejected. A successful or partially rejected
batch returns HTTP 200 and includes `rejected` plus `rejected_reasons` counts.
When enforcement is enabled and every row is rejected, the backend returns
HTTP 401 with the same counts at the response body's top level. Stable reason
codes are `unsigned`, `unknown_device`, `bad_signature`, and `replay`.
Signed rows carry `sig_v: "ogs1"` and `sig: "<HMAC-SHA256 hex digest>"`;
the signature field is 64 lowercase hexadecimal characters for a SHA-256
digest. Unsigned rows omit both fields.

`GET /health` includes aggregate signing counters and analyzer diagnostics;
it never returns device IDs or keys:

```json
{
  "signing": {
    "enforced": true,
    "devices": 1,
    "verified_total": 10,
    "rejected_total": 1,
    "rejected_reasons": {"bad_signature": 1}
  },
  "analysis": {"available": true, "reason": null}
}
```

Create a local key without saving it in the repository, then use the same key
for the edge signer and backend device entry:

```bash
DEVICE_KEY="$(python3 -c "import secrets; print(secrets.token_hex(32))")"
export OILGUARD_DEVICE_KEYS="wheel-RH-01:${DEVICE_KEY}"
export OILGUARD_REQUIRE_SIGNATURE=1
docker compose up -d --build backend
OILGUARD_DEVICE_KEY="${DEVICE_KEY}" python3 sim/generate.py --sign --scenario clean --seconds 5 --out /tmp/t8-signed.csv
python3 backend/ingest_mqtt.py --publish-csv /tmp/t8-signed.csv --host localhost
```

The key is a local development secret: never paste it into docs, fixtures, or
commits. HMAC provides per-row integrity and shared-key origin verification,
not confidentiality, transport security, HTTP caller authentication, or IEC
62443 compliance. Provisioning, secure key storage, and key rotation remain
out of scope.

### Master key and derived device keys

Listing one key per device does not scale to thousands of devices, so
`OILGUARD_DEVICE_MASTER_KEY` (hex string) enables on-demand derivation.
For any device without an explicit `OILGUARD_DEVICE_KEYS` entry, the backend
derives its key with `shared.signing.derive_device_key(master, device_id)`
(HMAC-SHA256 over a domain-separated label plus the device id). The Rust
simulator derives the same key, so both ends agree without a per-device list.

Precedence, highest first:

1. An explicit `OILGUARD_DEVICE_KEYS` entry for that device always wins. This
   is the escape hatch during a rotation: pin one device to its old key while
   every other device keeps deriving from the master.
2. The derived key, when a master key is configured.
3. Otherwise the row is rejected as `unknown_device` (unchanged behavior).

Rows without a `device_id` are never derived and stay `unknown_device`.
Key material is never logged and never returned by any endpoint; a malformed
master key raises at startup instead of degrading silently.

`GET /health` reports derivation without exposing keys. `signing.devices`
counts explicit `OILGUARD_DEVICE_KEYS` entries only, so derived devices do not
inflate the number, and a sibling top-level object carries the flag:

```json
{
  "signing": {"enforced": true, "devices": 2},
  "device_keys": {"explicit": 2, "master_key_configured": true}
}
```

> **Deviation from the R2 addendum:** the flag is reported as a top-level
> `device_keys` object rather than inside the `signing` object, because
> `tests/test_signed_ingest.py` (outside the R2 file ownership) asserts strict
> equality on the whole `signing` dict. Adding a key there would break it.
> Move it inside `signing` once that assertion is updated.

Migration note (breaking vs S0 stub): the S0 `POST /ingest` accepted a
single 4-field object (`device_id`, `pressure_kpa`, `temperature_c`,
`vibration_rms`). T8 requires the batch above; old payloads return
`422` with a per-field error. Republish T6 CSV rows instead
(`--publish-csv` below or the curl loop).

## GET /level

Latest ingested row by `seq` (echoes ground-truth level; this endpoint still
returns placeholder `confidence: 0.0`):

```json
{
  "status": "ok",
  "kind": "oil-level",
  "as_of": "...",
  "data": {
    "level_liters": 95.0,
    "level_pct": 100.0,
    "capacity_liters": 95.0,
    "confidence": 0.0,
    "unit": "L",
    "t_iso": "...",
    "seq": 4,
    "device_id": "wheel-RH-01",
    "source": "memory store (InfluxDB when reachable)",
    "source_message": {"code": "source_memory_store", "params": {}},
    "note_message": {"code": "level_memory_store_note", "params": {}}
  }
}
```

T10 computes fused-level confidence in `ai/level.py:183-188`; the current
`/level` route does not serve that estimate. The computed level summary is
available under `/alerts` data, and RUL confidence is returned by `/rul`
(`backend/main.py:429-487`).

Empty store: returns the 95 L default with
`"source": "default (no rows ingested yet)"`, `source_message.code` set to
`source_no_rows`, and `note_message.code` set to `level_no_rows_note`.

## GET /level/series

Returns the fused level estimates from the process-local session store. The
route uses the same `ai.level.estimate()` calculation and `recal_window` rest
flag as the T10 analysis; it does not read from InfluxDB or echo the raw
ground-truth `level_liters` field. Results are sorted by input `seq` before
downsampling. The `limit` query parameter defaults to 300 and accepts values
from 1 through 2000. If the series is longer than the limit, evenly spaced
entries are selected with the first and last entry retained.

Each returned `series` item has `t_s`, fused `level_l` in liters, fitted
baseline uncertainty `sigma_l` in liters, and the source `moving` and
`recal_window` flags. Moving or otherwise gated samples keep their time and
flags but have `level_l: null`. The response `count` is the number of returned
items after downsampling.

An empty session store returns HTTP 200, an empty `series`, and
`reason: "no_rows"`. If rows exist but the estimator has no rest sample to
score, the route returns an empty series with
`reason: "insufficient_rest_samples"`.

## GET /windows

Consecutive `recal_window == 1` rows grouped into rest windows
(`zone` = majority-vote audit label only — the rule never reads it,
same contract as `sim/detect.py`). Full detector output:
`python3 sim/run_t7.py --in IN.csv --out windows.csv`
(see `docs/t7-windows.md`).

## MQTT bridge (`backend/ingest_mqtt.py`)

Subscribes to `oilguard/signals` (env `MQTT_HOST`, `MQTT_PORT`,
`MQTT_TOPIC`) **and** `oilguard/signals/+`. Message = JSON `{"rows": [...]}`
(single SignalRow object also accepted). Malformed messages are dropped with a
warning; broker outages retry with 1/2/5/10/30 s backoff. The backend starts
this bridge in a daemon thread on startup (best-effort: if the broker is down,
`POST /ingest` still works). See "Batched ingest and backpressure" above for
queueing and drop semantics.

```bash
# per-device topic (legacy single topic still works)
curl -s 'localhost:8000/fleet/aggregates?window_s=10&metrics=level_liters'
curl -s 'localhost:8000/fleet/devices'
curl -s localhost:8000/metrics/ingest
```

## curl examples

```bash
# health + docs
curl -s localhost:8000/health
curl -s localhost:8000/openapi.json | head -c 300

# ingest 5 unsigned demo rows from a T6 CSV (signing is permissive by default)
python3 - <<'EOF'
import csv, json, urllib.request
rows = []
with open('/tmp/t8-sample.csv', newline='') as f:
    for i, r in enumerate(csv.DictReader(f)):
        if i >= 5:
            break
        for k in ('seq', 'moving', 'recal_window', 'engine_on', 'link_down'):
            r[k] = int(float(r[k]))
        for k in ('t_s', 'slope_deg', 'rotor_rpm', 'wheel_rpm',
                  'submerged_fraction_per_revolution', 'pressure_kpa',
                  'temperature_c', 'vib_rms_g', 'vib_kurtosis',
                  'level_liters', 'level_pct'):
            r[k] = float(r[k])
        rows.append(r)
req = urllib.request.Request('http://localhost:8000/ingest',
                             data=json.dumps({'rows': rows}).encode(),
                             headers={'Content-Type': 'application/json'})
print(urllib.request.urlopen(req).read().decode())
EOF

curl -s localhost:8000/level
curl -s 'localhost:8000/windows?limit=5'
curl -s localhost:8000/alerts   # T10 ladder (fallback note when store empty)
curl -s localhost:8000/rul      # T10 RUL (suppressed + anomaly-only when gated)
```

## GET /alerts + GET /rul (T10)

Both evaluate the memory store with `ai/ladder.py` (rest runs grouped
by `recal_window`, same contract as `/windows`). Successful responses expose
top-level `evaluated: true`, including a precision-suppressed RUL result. A
precision-gated result is an evaluated output, not an analyzer outage.

Every response with `evaluated: false` includes a stable top-level `reason`:

| `reason` | Meaning | Endpoint `status` |
|---|---|---|
| `no_rows` | The process-local session store is empty; no analysis ran. | `ok` |
| `insufficient_rest_samples` | The analyzer loaded, but fewer than the required scored rest samples were available; the combined analysis was not considered evaluated. | `ok` |
| `analysis_unavailable` | The analyzer could not load or evaluation failed. | `unavailable` |

All three conditions return HTTP 200. `/rul` data preserves the suppressed or
unavailable shape as applicable. When the analyzer imports successfully but
the store is empty, the endpoints retain the existing empty-alert and
suppressed-RUL data shapes. If evaluation succeeds but precision or trend
gates suppress the RUL estimate, `evaluated` remains true and the endpoint
does not include a top-level `reason`.

`GET /alerts` returns `{status, kind, as_of, evaluated, reason?, data}` where
`reason` is present only when `evaluated` is false. The `data` object retains
its English `note` and `fallback` and adds `note_message` and
`fallback_message`. Every alert's existing English `reason` has a sibling
`reason_message`. `/rul` retains the English `reason`, `note`, and `fallback`
fields and adds `reason_message`, `note_message`, and `fallback_message` to
the data object. Analyzer diagnostics remain available in those legacy fields
for compatibility; clients should localize from message codes rather than
trying to parse or exact-match the prose. Full method, thresholds, and real
log excerpts: `docs/t10-rul-ladder.md`.

### Structured backend message catalog

Every backend-emitted message code is declared once in
`shared/message_codes.json`; each row lists the exact parameter names emitted
with that code. Empty parameters are shown as `—`.

| Code | Parameters |
|---|---|
| `alerts_analyzer_unavailable_fallback` | — |
| `alerts_evaluation_failed_fallback` | — |
| `alerts_memory_fallback` | — |
| `alerts_no_evaluation_note` | — |
| `alerts_no_rows_fallback` | — |
| `influx_client_missing` | — |
| `influx_unknown_no_ingest` | — |
| `influx_unreachable` | — |
| `influx_written` | `points` |
| `ladder_model_note` | — |
| `ladder_n1_trend_persistence` | `window`, `zone` |
| `ladder_n2_confirmed_persistence` | `windows` |
| `ladder_n2_same_window_confirmation` | `votes`, `window` |
| `ladder_n3_shift_window` | `warning_hours`, `shift_hours` |
| `ladder_n4_abrupt_drop` | `from_l`, `to_l`, `threshold_l` |
| `ladder_n4_critical_level` | `level_pct`, `critical_pct` |
| `ladder_n4_extreme_collapse` | `z`, `kurtosis` |
| `level_memory_store_note` | — |
| `level_no_rows_note` | — |
| `rul_analyzer_unavailable_note` | — |
| `rul_analyzer_unavailable_reason` | — |
| `rul_baseline_precision_insufficient` | `sigma_l`, `max_sigma_l` |
| `rul_model_note` | — |
| `rul_no_leak_trend` | `slope_l_per_h` |
| `rul_no_rows_note` | — |
| `rul_no_rows_reason` | — |
| `rul_significant_leak_trend` | — |
| `rul_suppressed_note` | — |
| `rul_suppressed_summary` | — |
| `rul_trend_too_weak` | `r2`, `minimum_r2` |
| `rul_insufficient_rest_samples` | `count`, `minimum` |
| `source_memory_store` | — |
| `source_no_rows` | — |

The backend verifies code membership and parameter names when creating a
message object. The Python regression test also compares every literal code
emission in `ai/ladder.py`, `ai/rul.py`, and `backend/main.py` with this table.

## Round-trip (generator -> MQTT -> backend -> query)

```bash
# 1. stack
docker compose up --build

# 2. synthetic signal batch
python3 sim/generate.py --scenario slow-leak --seconds 30 --out /tmp/t8-demo.csv

# 3a. direct HTTP ingest (no broker needed)
python3 - <<'EOF'
import csv, json, urllib.request
# ... same conversion as above, POST to http://localhost:8000/ingest
EOF

# 3b. via the MQTT mock (needs paho-mqtt: pip install paho-mqtt)
python3 backend/ingest_mqtt.py --publish-csv /tmp/t8-demo.csv --host localhost
# the backend bridge thread (or a standalone
#  python3 backend/ingest_mqtt.py --host localhost)
# forwards oilguard/signals -> POST /ingest automatically

# 4. query
curl -s localhost:8000/level
curl -s localhost:8000/windows | head -c 600
```

Expected: `ingested: 300`, `GET /level` 200 with the last row's
`level_liters`, `GET /windows` 200 with rest windows in LOAD/DUMP
zones. InfluxDB writes succeed under compose; standalone runs log
`fallback-memory` and keep every row in the memory store.
