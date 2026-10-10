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
| GET | `/health` | `ok` or `degraded` (session store, persisted Influx count, MQTT, signing, and analyzer availability diagnostics) |
| POST | `/ingest` | `ok` — accepted rows stored; per-row signature rejections returned in the ack |
| GET | `/level` | `ok` — latest ingested ground-truth row echoed; `confidence` remains the `0.0` placeholder on this endpoint (`backend/main.py:346-377`) |
| GET | `/windows?limit=50` | `ok` — rest windows grouped from `recal_window` flags |
| GET | `/alerts` | `ok` — T10 N1–N4 ladder over the memory store; `unavailable` when the analyzer cannot load |
| GET | `/rul` | `ok` — T10 trend-extrapolated RUL or a precision-gated `suppressed` result; `unavailable` when the analyzer cannot load |

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
  "influx_points": 1200,
  "influx": "unknown (no ingest yet)",
  "influx_message": {"code": "influx_unknown_no_ingest", "params": {}},
  "signing": {
    "enforced": false,
    "devices": 0,
    "verified_total": 0,
    "rejected_total": 0,
    "rejected_reasons": {}
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

## GET /windows

Consecutive `recal_window == 1` rows grouped into rest windows
(`zone` = majority-vote audit label only — the rule never reads it,
same contract as `sim/detect.py`). Full detector output:
`python3 sim/run_t7.py --in IN.csv --out windows.csv`
(see `docs/t7-windows.md`).

## MQTT bridge (`backend/ingest_mqtt.py`)

Topic `oilguard/signals` (env `MQTT_HOST`, `MQTT_PORT`, `MQTT_TOPIC`).
Message = JSON `{"rows": [...]}` (single SignalRow object also
accepted). Malformed messages are dropped with a warning; broker
outages retry with 1/2/5/10/30 s backoff. The backend starts this
bridge in a daemon thread on startup (best-effort: if the broker is
down, `POST /ingest` still works).

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
