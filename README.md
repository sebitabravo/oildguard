# OilGuard Mining Sim

Local prototype of the Komatsu 930E-4SE and GDY106 motorized wheel
(32.62:1). The validated scope is 930E/GDY106 only; the 980E-5 (GDY108-C,
35.02:1) remains future work. The frontend includes operational, 3D-twin, platform, and lab pages backed by FastAPI, InfluxDB, and a local MQTT mock. Most operational pages use live backend data when available and explicitly labeled deterministic demo data otherwise; lab outputs are synthetic, not field measurements.

Feature plan: [`odd/tasks/oilguard-pro-twin.md`](odd/tasks/oilguard-pro-twin.md). The current route inventory and data classes are listed in [PRODUCT.md](PRODUCT.md#capabilities-and-constraints).

## Prerequisites

- Docker with Compose (Docker Desktop or Engine 24+)
- Python 3.12 and Bun 1.4+ to run checks or services outside Docker

Install the Python runtime and test dependencies from the repository root:

```bash
python3 -m pip install -r requirements-dev.txt
```

No remote steps, hardware, or push are required.

## Run with Docker Compose

```bash
docker compose config --quiet
docker compose up -d --build -V
```

- Landing: http://localhost:5173/
- Fleet: http://localhost:5173/fleet
- Wheel monitoring: http://localhost:5173/monitoring
- GDY106 cutaway: http://localhost:5173/wheel
- Link health: http://localhost:5173/link
- Backend health: http://localhost:8000/health
- Backend API docs: http://localhost:8000/docs
- InfluxDB: http://localhost:8086 (user and org `oilguard`)
- MQTT mock: `localhost:1883` (anonymous, local demo only)

The `-V` option renews the frontend's anonymous `node_modules` volume when
rebuilding, so it does not mask dependencies in the image.

## Route map

“Live backend” means data returned by the local API; pages label deterministic demo fallback as `DEMO`. `SYNTHETIC-PROXY` means modeled values, not field measurements. Three reserved alert routes are currently registered but have no frontend page (HTTP 404).

| Route | What it shows | Data class |
|---|---|---|
| `/` | Product landing page and demo navigation | Static; no telemetry |
| `/login` | Demo-only sign-in form; no authentication service | Deterministic demo UI |
| `/fleet` | Device/wheel fleet table with live rows and local fallback rows | Live backend + deterministic demo |
| `/monitoring` | Selected-wheel levels, sensors, alert ladder, RUL, and local leak walkthrough | Live backend when available + deterministic demo |
| `/wheel/history` | Selectable wheel history windows and event timeline | Deterministic demo |
| `/rul` | Wheel lubricant-condition forecasts | Live backend when available + deterministic demo |
| `/calibration` | Pause-window status and settling-curve model | Live backend windows when available + synthetic model/demo fallback |
| `/mine` | Procedural mine scene and simulated truck cycles | Deterministic demo |
| `/wheel` | GDY106 cutaway and interactive oil-pool model | Synthetic-proxy demo |
| `/alerts` | Reserved alert inbox; no frontend page is implemented (HTTP 404) | No page/data |
| `/alerts/detail` | Reserved alert detail; no frontend page is implemented (HTTP 404) | No page/data |
| `/alerts/rules` | Reserved read-only rules page; no frontend page is implemented (HTTP 404) | No page/data |
| `/devices` | Device inventory and signing/link context | Live backend + deterministic demo fallback |
| `/link` | Ingest, availability, outage, and link-health view | Live backend + deterministic demo fallback |
| `/lab/sim` | Generated scenario fixture and playback controls | Synthetic lab |
| `/lab/validation` | Estimate-versus-generator-truth comparison; optional live rows are labeled | Synthetic lab; backend rows only when available |
| `/lab/bench` | Parameterized bench protocol calculations | Synthetic lab |
| `/report` | Read-only post-incident example | Deterministic synthetic demo |
| `/dev/ui` | Shared component catalogue and states | Synthetic catalogue |

## Load simulation

The Rust edge simulator emits the existing signal schema over MQTT. Build it
locally from the repository root:

```bash
cd edge-sim
cargo build --release
./target/release/oilguard-edge \
  --devices 100 --rate-hz 10 --mode realtime \
  --mqtt-url mqtt://localhost:1883 --batch-rows 10 \
  --seconds 60
```

With the Compose broker and backend, start the simulator profile instead:

```bash
EDGE_SIM_DEVICES=100 OILGUARD_DEVICE_MASTER_KEY="$(python3 -c 'import secrets; print(secrets.token_hex(32))')" \
  docker compose --profile sim up edge-sim
```

`EDGE_SIM_DEVICES` controls the fleet size. `OILGUARD_DEVICE_MASTER_KEY`
enables the same derived per-device signing keys in the Rust simulator and
backend; keep it local and do not commit it. The simulator architecture,
parity evidence, and benchmark method are documented in
[`docs/architecture-telemetry.md`](docs/architecture-telemetry.md),
[`docs/bench/README.md`](docs/bench/README.md), and
[`docs/edge-sim.md`](docs/edge-sim.md).

## Judge path (< 5 minutes)

Follow [`docs/demo-script.md`](docs/demo-script.md) for the exact five-minute
navigation and the simulator option. The walkthrough distinguishes backend
`LIVE` values from deterministic `DEMO` data and synthetic lab fixtures. The
alert inbox routes are reserved but not implemented; use the alert ladder on
`/monitoring` instead. Nothing in this prototype is field-calibrated or able
to control a truck.

### Current screenshots (1600 × 1000)

| Page | English | Español |
|------|---------|---------|
| Mine | [Mine EN](docs/screenshots/pro-twin-mine-en.png) | [Mina ES](docs/screenshots/pro-twin-mine-es.png) |
| Wheel detail | [Wheel EN](docs/screenshots/pro-twin-wheel-en.png) | [Rueda ES](docs/screenshots/pro-twin-wheel-es.png) |
| Monitoring | [Monitoring EN](docs/screenshots/pro-twin-monitoring-en.png) | [Monitoreo ES](docs/screenshots/pro-twin-monitoring-es.png) |

## Optional signed-measurement demo

Unsigned rows are accepted by default for the local demo
(`OILGUARD_REQUIRE_SIGNATURE=0`). To exercise per-device HMAC-SHA256 row
integrity, create a local-only key and use it at both the edge mock and
backend. Do not commit or share the key:

```bash
DEVICE_KEY="$(python3 -c "import secrets; print(secrets.token_hex(32))")"
export OILGUARD_DEVICE_KEYS="wheel-RH-01:${DEVICE_KEY}"
export OILGUARD_REQUIRE_SIGNATURE=1
docker compose up -d --build backend
OILGUARD_DEVICE_KEY="${DEVICE_KEY}" python3 sim/generate.py --sign --scenario clean --seconds 5 --out /tmp/t8-signed.csv
python3 backend/ingest_mqtt.py --publish-csv /tmp/t8-signed.csv --host localhost
curl -s localhost:8000/health
unset OILGUARD_DEVICE_KEYS OILGUARD_REQUIRE_SIGNATURE DEVICE_KEY
docker compose up -d backend
```

The backend verifies rows before storage; unsigned rows are rejected while
enforcement is enabled, and signed rows that fail verification are rejected
even in permissive mode. Signing verifies row integrity/shared-key origin only.
It does not provide confidentiality, MQTT/TLS, device provisioning or key
rotation, HTTP caller authentication, or IEC 62443 compliance. See
[`backend/API.md`](backend/API.md) and [`sim/SCHEMA.md`](sim/SCHEMA.md) for
the contract and canonicalization limits.

## Run without Docker (optional)

Install the Python runtime and test dependencies at the repository root with
`python3 -m pip install -r requirements-dev.txt`. Then start the frontend and
backend in separate terminals:

```bash
cd frontend
bun install
bun run dev
```

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Run all configured local checks from the repository root with `./test.sh`.
