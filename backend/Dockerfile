FROM python:3.12-slim
WORKDIR /app
# Build context is the repo root (see docker-compose.yml): backend code +
# the stdlib-only ai/ estimators (T10 ladder/RUL) ship in one image.
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/main.py backend/ingest_mqtt.py backend/store.py backend/pipeline.py backend/metrics.py backend/aggregates.py backend/influx_writer.py backend/fleetagg.py backend/outages.py backend/device_access.py backend/fleet_routes.py backend/fleet_stream.py backend/health_routes.py backend/influx_probe.py backend/ingest_models.py backend/ingest_persistence.py backend/ingest_route.py backend/lifecycle.py backend/query_helpers.py backend/seen_view.py backend/store_access.py backend/verify_rows.py ./
COPY ai ./ai
COPY shared ./shared
COPY sim ./sim
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
