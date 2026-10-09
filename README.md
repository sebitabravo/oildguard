# OilGuard Mining Sim

Local-only prototype for the Komatsu 930E with GDY106 motorized wheels
(32.62:1). Validated scope is 930E/GDY106 ONLY; the 980E-5 (GDY108-C,
35.02:1) remains future work without validation. The Astro + Preact frontend
provides three independent pages for the mining truck, wheel simulation, and
monitoring dashboard, alongside the FastAPI backend, InfluxDB, and MQTT mock.

Feature plan: `odd/tasks/oilguard-mining-sim.md`.

## Prerequisites

- Docker + Docker Compose (Docker Desktop or Engine 24+)
- Bun 1.4+ (only for running the frontend outside Docker)
- Python 3.11+ (only for running the backend outside Docker)

No remote steps. No hardware. No push required.

## Run with Docker Compose

```bash
docker compose up --build
```

If you change frontend dependencies, renew the frontend service's anonymous
`node_modules` volume so it cannot mask the dependencies in the rebuilt image:

```bash
docker compose up -d --build -V frontend
```

- Frontend pages: http://localhost:5173/mine, http://localhost:5173/wheel,
  and http://localhost:5173/monitoring
- Backend health: http://localhost:8000/health
- Backend docs (OpenAPI): http://localhost:8000/docs
- InfluxDB: http://localhost:8086 (user `oilguard`, org `oilguard`)
- MQTT mock: localhost:1883 (anonymous, local demo only)

### Optional signed-measurement demo

By default, unsigned rows remain accepted for the local demo
(`OILGUARD_REQUIRE_SIGNATURE=0`). To exercise the per-device HMAC-SHA256
integrity path, generate a local-only key and use it at both the edge mock and
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

The backend verifies each row before storage; unsigned rows are rejected while
enforcement is enabled, and signed rows that fail verification are rejected
even in permissive mode. The signature provides row integrity/shared-key
origin verification only. It does not provide confidentiality, MQTT/TLS,
device provisioning or key rotation, HTTP caller authentication, or IEC 62443
compliance. See [`backend/API.md`](backend/API.md) and
[`sim/SCHEMA.md`](sim/SCHEMA.md) for the contract and canonicalization limits.

## Run without Docker (optional)

Frontend:

```bash
cd frontend
bun install
bun run dev
```

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Judge path (< 5 minutes)

1. Start the services with `docker compose up --build`.
2. Open `/mine`, `/wheel`, and `/monitoring` at `http://localhost:5173`.
3. Open http://localhost:8000/health and confirm `{"status": "ok", ...}`.
4. Open http://localhost:8000/docs and inspect `POST /ingest`, `GET /level`,
   `GET /alerts`, and `GET /rul`.
5. Run `docker compose config` as a static configuration check.

See `docs/demo-script.md` for the complete dashboard scenario.
