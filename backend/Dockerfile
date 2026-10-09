FROM python:3.11-slim
WORKDIR /app
# Build context is the repo root (see docker-compose.yml): backend code +
# the stdlib-only ai/ estimators (T10 ladder/RUL) ship in one image.
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/main.py backend/ingest_mqtt.py ./
COPY ai ./ai
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
