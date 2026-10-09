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
