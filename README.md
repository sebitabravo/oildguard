# OilGuard Mining Sim (S0 scaffolding)

Local-only prototype slice for the Komatsu 930E with GDY106 motorized wheels (32.62:1).
Validated scope is 930E/GDY106 ONLY — the 980E-5 (GDY108-C, 35.02:1) stays future work without validation.
This S0 stub wires a Vite + React + Three.js placeholder, a FastAPI stub,
InfluxDB, and an MQTT mock via Docker Compose.

Feature plan: `odd/tasks/oilguard-mining-sim.md`.

## Prerequisites

- Docker + Docker Compose (Docker Desktop or Engine 24+)
- Node.js 20+ and npm (only for running the frontend outside Docker)
- Python 3.11+ (only for running the backend outside Docker)

No remote steps. No hardware. No push required.

## Run (Docker, recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173 (rotating-box Three.js stub)
- Backend health: http://localhost:8000/health
- Backend docs (OpenAPI): http://localhost:8000/docs
- InfluxDB: http://localhost:8086 (user `oilguard`, org `oilguard`)
- MQTT mock: localhost:1883 (anonymous, local demo only)

## Run (without Docker, optional)

Frontend:

```bash
cd frontend && npm install && npm run dev
```

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Judge path (< 5 minutes)

1. `docker compose up --build` (first build takes a few minutes).
2. Open http://localhost:5173, confirm the rotating box + orbit note.
3. Open http://localhost:8000/health, confirm `{"status": "ok", ...}`.
4. Open http://localhost:8000/docs, confirm the stub endpoints
   (`POST /ingest`, `GET /level`, `GET /alerts`, `GET /rul`).
5. `docker compose config` passes as a static check.

Full demo scenario (sim to alert) arrives with later slices; see the feature
doc forecast (T2 onward).
