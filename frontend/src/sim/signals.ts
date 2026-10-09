// T6 shared signal types (S3 slice).
//
// Mirrors sim/SCHEMA.md (source of truth for field names/rates/units).
// FSM zone type reuses HaulState from truck/cycle.ts so T7 (move/rest +
// settling) and T8 (FastAPI/MQTT/InfluxDB) consume one zone vocabulary.
// Backend IngestPayload mapping: device_id, pressure_kpa, temperature_c,
// vib_rms_g (backend stub calls it vibration_rms) — see SCHEMA.md.

import type { HaulState } from "./truck/cycle";
export type { HaulState } from "./truck/cycle";

/** FSM zone of a sample. Alias of HaulState (LOAD | HAUL | DUMP | WAIT). */
export type FsmState = HaulState;

/** Generator scenarios (sim/generate.py --scenario). */
export type ScenarioName =
  | "clean"
  | "slow-leak"
  | "abrupt-drop"
  | "sensor-drift"
  | "link-outage";

/** Ground-truth label values in the label column. */
export type SignalLabel =
  | "normal"
  | "slow-leak"
  | "abrupt-drop"
  | "sensor-drift"
  | "link-outage-buffered";

/** One 10 Hz CSV row. Numeric CSV fields parse to number. */
export interface SignalRow {
  t_iso: string;
  t_s: number;
  seq: number;
  device_id: string;
  fsm_state: FsmState;
  /** 1 when FSM state is HAUL/WAIT (isMovingState). */
  moving: 0 | 1;
  /** 1 when FSM state is LOAD/DUMP (isRecalState). */
  recal_window: 0 | 1;
  /** Always 1 in the demo loop (engine stays on). */
  engine_on: 0 | 1;
  slope_deg: number;
  rotor_rpm: number;
  wheel_rpm: number;
  pressure_kpa: number;
  temperature_c: number;
  /** Decimated 1 kHz RMS per 100 ms window (raw stream never transported). */
  vib_rms_g: number;
  /** Decimated 1 kHz kurtosis per 100 ms window. */
  vib_kurtosis: number;
  /** Ground-truth oil volume. */
  level_liters: number;
  level_pct: number;
  /** 1 while the link is down (buffered by store_forward.py). */
  link_down: 0 | 1;
  label: SignalLabel;
}

/** CSV header order written by sim/generate.py. */
export const SIGNAL_CSV_HEADER: readonly string[] = [
  "t_iso",
  "t_s",
  "seq",
  "device_id",
  "fsm_state",
  "moving",
  "recal_window",
  "engine_on",
  "slope_deg",
  "rotor_rpm",
  "wheel_rpm",
  "pressure_kpa",
  "temperature_c",
  "vib_rms_g",
  "vib_kurtosis",
  "level_liters",
  "level_pct",
  "link_down",
  "label",
];

/** Transport rates. */
export const SAMPLE_RATE_HZ = 10;
export const VIB_RAW_HZ = 1000;
export const VIB_WINDOW_S = 0.1;

/** Physics anchors (do not contradict without evidence). */
export const CAPACITY_L = 95;
export const GEAR_RATIO = 32.62;
export const ROTOR_MAX_RPM = 3000;
export const LEAK_PCT_PER_H = 0.5;
export const PRESSURE_AT_FULL_KPA = 28;
