# OilGuard Mining Sim

Local prototype of the Komatsu 930E-4SE and GDY106 motorized wheel
(32.62:1). The validated scope is 930E/GDY106 only; the 980E-5 (GDY108-C,
35.02:1) remains future work. The app has mine, wheel-detail, and monitoring
pages, with a FastAPI backend, InfluxDB, and an MQTT mock.

Feature plan: [`odd/tasks/oilguard-pro-twin.md`](odd/tasks/oilguard-pro-twin.md).

## Prerequisites

- Docker with Compose (Docker Desktop or Engine 24+)
- Python 3.11+ and Bun 1.4+ to run checks or services outside Docker

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

- Mine: http://localhost:5173/mine
- Wheel detail: http://localhost:5173/wheel
- Monitoring: http://localhost:5173/monitoring
- Backend health: http://localhost:8000/health
- Backend API docs: http://localhost:8000/docs
- InfluxDB: http://localhost:8086 (user and org `oilguard`)
- MQTT mock: `localhost:1883` (anonymous, local demo only)

The `-V` option renews the frontend's anonymous `node_modules` volume when
rebuilding, so it does not mask dependencies in the image.

## Judge path (< 5 minutes)

1. Run the Compose commands above and confirm `/health` reports `status: ok`.
2. On `/mine`, inspect the five-truck fleet, PLM III state, and available camera
   and pause controls. Use **Open GDY106 wheel** to follow the truck-to-wheel
   handoff.
3. On `/wheel`, inspect the cutaway and exploded views, planetary ratio, and
   oil-pool response to the oil control. Values and reconstructed geometry are
   documented with their evidence labels; this is not a field-validated model.
4. On `/monitoring`, inspect the fleet table and use **Open wheel detail** to
   carry a truck/wheel selection into `/wheel`. The dashboard fleet metrics and
   combined-risk rule are synthetic proxies, not live calibrated wheel data.
5. Run the checks with `./test.sh`. CI runs the Python and frontend checks plus
   Compose validation in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
6. Compare the current EN/ES page captures below. The complete walkthrough is
   in [`docs/demo-script.md`](docs/demo-script.md).

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
