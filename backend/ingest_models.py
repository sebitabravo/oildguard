"""Ingest request schemas retained as backend.main compatibility exports."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

class SignalRow(BaseModel):
    t_iso: str
    t_s: float
    seq: int | None = Field(default=None, ge=0)
    device_id: str | None = None
    fsm_state: Literal["LOAD", "HAUL", "DUMP", "WAIT"]
    moving: Literal[0, 1]
    recal_window: Literal[0, 1]
    engine_on: Literal[0, 1]
    slope_deg: float
    rotor_rpm: float
    wheel_rpm: float
    rotating_sensor_regime: Literal["static_pool", "slosh", "centrifugal_rimming"]
    submerged_fraction_per_revolution: float = Field(ge=0, le=1)
    pressure_kpa: float
    temperature_c: float
    vib_rms_g: float
    vib_kurtosis: float
    level_liters: float
    level_pct: float
    link_down: Literal[0, 1]
    label: Literal[
        "normal", "slow-leak", "abrupt-drop", "sensor-drift", "link-outage-buffered"
    ]
    speed_kmh: float | None = None
    load_pct: float | None = None
    sig_v: str | None = None
    sig: str | None = None


class IngestBatch(BaseModel):
    rows: list[SignalRow] = Field(min_length=1, max_length=5000)

