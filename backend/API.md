# T8 Backend API Contract (S4 slice)

FastAPI ingestion + query API. Source: `backend/main.py`.
Field names match `SignalRow` in `frontend/src/sim/signals.ts` 1:1
(source of truth for names/rates/units: `sim/SCHEMA.md`).
OpenAPI: `GET /openapi.json`, interactive docs at `/docs`.

Base URL (local): `http://localhost:8000`.
In compose the dashboard uses `VITE_BACKEND_URL=http://localhost:8000`.

## Endpoints

| Method | Path | Status when real |
|---|---|---|
| GET | `/health` | `ok` (always; `store_rows`, `influx`, `mqtt` diagnostics) |
| POST | `/ingest` | `ok` — batch stored (memory + best-effort InfluxDB) |
| GET | `/level` | `ok` — latest row echoed; `confidence` stub `0.0` until T10 |
| GET | `/windows?limit=50` | `ok` — rest windows grouped from `recal_window` flags |
| GET | `/alerts` | `NOT_IMPLEMENTED_YET` (honest stub until S5 T10) |
| GET | `/rul` | `NOT_IMPLEMENTED_YET` (honest stub until S5 T10) |

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
      "pressure_kpa": 27.966,
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
  "influx": "fallback-memory (unreachable ...); rows kept in memory"
}
```

The `influx` string reports the write outcome per batch: either
`written (N points -> URL bucket=...)` or a `fallback-memory (reason)`
message that is also logged server-side. Rows are never dropped when
InfluxDB is down.

Migration note (breaking vs S0 stub): the S0 `POST /ingest` accepted a
single 4-field object (`device_id`, `pressure_kpa`, `temperature_c`,
`vibration_rms`). T8 requires the batch above; old payloads return
`422` with a per-field error. Republish T6 CSV rows instead
(`--publish-csv` below or the curl loop).

## GET /level

Latest ingested row by `seq` (echoes ground-truth level; the fused
estimate + confidence land in S5 T10):

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
    "source": "memory store (InfluxDB when reachable)"
  }
}
```

Empty store: returns the 95 L default with
`"source": "default (no rows ingested yet)"`.

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

# ingest 5 rows from a T6 CSV (needs python3, no extra deps)
python3 - <<'EOF'
import csv, json, urllib.request
rows = []
with open('/tmp/t8-sample.csv', newline='') as f:
    for i, r in enumerate(csv.DictReader(f)):
        if i >= 5:
            break
        for k in ('seq', 'moving', 'recal_window', 'engine_on', 'link_down'):
            r[k] = int(float(r[k]))
        for k in ('t_s', 'slope_deg', 'rotor_rpm', 'wheel_rpm', 'pressure_kpa',
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
curl -s localhost:8000/alerts   # NOT_IMPLEMENTED_YET until T10
curl -s localhost:8000/rul      # NOT_IMPLEMENTED_YET until T10
```

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
