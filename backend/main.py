"""OilGuard backend S0 stub.

FastAPI skeleton with clearly-labeled STUB payloads. Real ingestion
(MQTT mock -> InfluxDB) and fusion logic land in S3/S4 (T6/T8).
OpenAPI docs are served at /docs and /openapi.json.
"""

from datetime import datetime, timezone

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="OilGuard Mining Sim API (S0 stub)",
    version="0.1.0",
    description="S0 scaffolding stub. All data payloads are synthetic placeholders.",
)


class IngestPayload(BaseModel):
    device_id: str = Field(default="bench-stub-01")
    pressure_kpa: float = Field(default=101.3)
    temperature_c: float = Field(default=65.0)
    vibration_rms: float = Field(default=0.42)


def _stub_envelope(kind: str, data: dict) -> dict:
    return {
        "status": "STUB",
        "kind": kind,
        "as_of": datetime.now(timezone.utc).isoformat(),
        "note": "S0 placeholder. Real values land with S3/S4 slices.",
        "data": data,
    }


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "oilguard-backend",
        "stage": "S0-stub",
    }


@app.post("/ingest")
def ingest(payload: IngestPayload) -> dict:
    return _stub_envelope(
        "ingest-ack",
        {
            "device_id": payload.device_id,
            "received": payload.model_dump(),
            "persisted": False,
            "reason": "InfluxDB wiring lands in S4 (T8).",
        },
    )


@app.get("/level")
def level() -> dict:
    return _stub_envelope(
        "oil-level",
        {
            "level_liters": 95.0,
            "capacity_liters": 95.0,
            "confidence": 0.0,
            "unit": "L",
            "reference": "GDY106 nominal 95 L SAE 85W-140",
        },
    )


@app.get("/alerts")
def alerts() -> dict:
    return _stub_envelope(
        "alerts",
        {
            "alerts": [],
            "ladder": ["N1", "N2", "N3", "N4"],
            "note": "N1-N4 ladder logic lands in S5 (T10).",
        },
    )


@app.get("/rul")
def rul() -> dict:
    return _stub_envelope(
        "rul",
        {
            "hours": None,
            "haul_cycles": None,
            "shifts": None,
            "confidence": 0.0,
            "note": "Trend-extrapolated RUL lands in S5 (T10).",
        },
    )
