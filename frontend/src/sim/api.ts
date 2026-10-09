// T8 backend API client types (S4 slice).
//
// Thin typed wrapper over backend/main.py (see backend/API.md).
// Consumed by the T11 dashboard; no UI changes in T8.
// Base URL defaults to PUBLIC_BACKEND_URL (compose sets http://localhost:8000).

import type { RestWindow, SignalRow } from "./signals";

export const BACKEND_URL: string =
  (import.meta.env?.PUBLIC_BACKEND_URL as string | undefined) ??
  "http://localhost:8000";

export interface HealthResponse {
  status: "ok";
  service: string;
  stage: string;
  store_rows: number;
  influx: string;
  mqtt: { host: string; port: number; topic: string };
}

export interface IngestAck {
  status: "ok";
  kind: "ingest-ack";
  as_of: string;
  ingested: number;
  latest_seq: number;
  store_rows: number;
  influx: string;
}

export interface LevelData {
  level_liters: number;
  level_pct: number;
  capacity_liters: number;
  confidence: number;
  unit: string;
  t_iso?: string;
  seq?: number;
  device_id?: string;
  source: string;
}

export interface LevelResponse {
  status: "ok";
  kind: "oil-level";
  as_of: string;
  data: LevelData;
}

export interface WindowsResponse {
  status: "ok";
  kind: "rest-windows";
  as_of: string;
  count: number;
  windows: RestWindow[];
  note: string;
}

export interface DashAlert {
  alert_id: string;
  level: string;
  severity: string;
  t_s: number;
  window_id: number;
  zone: string;
  reason: string;
  model: string;
  inputs: Record<string, number | string | null>;
  thresholds: Record<string, number>;
  channels: Record<string, boolean> | null;
  baseline?: string | null;
}

export interface AlertsLevelSummary {
  confidence: number;
  sigma_liters: number | null;
  n_rest: number;
  n_scored: number;
}

export interface AlertsData {
  alerts: DashAlert[];
  escalation: string[];
  ladder: string[];
  level?: AlertsLevelSummary;
  rul_status?: string;
  model: string;
  note: string;
  fallback: string;
}

export interface AlertsResponse {
  status: "ok";
  kind: "alerts";
  as_of: string;
  data: AlertsData;
}

export interface RulDataOk {
  hours: number;
  hours_to_warning: number;
  hours_to_critical: number;
  haul_cycles: number;
  shifts: number;
  confidence: number;
  status: "ok";
  anomaly_only: false;
  slope_L_per_h: number;
  r2: number;
  current_level_L: number;
  model: string;
  note: string;
  fallback: string;
}

export interface RulDataSuppressed {
  hours: null;
  haul_cycles: null;
  shifts: null;
  confidence: number;
  status: "suppressed";
  anomaly_only: true;
  model: string;
  note: string;
  fallback: string;
  hours_to_warning?: number | null;
  reason?: string;
}

export type RulData = RulDataOk | RulDataSuppressed;

export interface RulResponse {
  status: "ok";
  kind: "rul";
  as_of: string;
  data: RulData;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

/** POST a SignalRow batch (10 Hz rows from sim/generate.py). */
export async function postIngest(rows: SignalRow[]): Promise<IngestAck> {
  const res = await fetch(`${BACKEND_URL}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) throw new Error(`POST /ingest -> ${res.status}`);
  return (await res.json()) as IngestAck;
}

export const getHealth = (): Promise<HealthResponse> => getJson("/health");
export const getLevel = (): Promise<LevelResponse> => getJson("/level");
export const getWindows = (limit = 50): Promise<WindowsResponse> =>
  getJson(`/windows?limit=${limit}`);
/** T10 N1–N4 ladder over the memory store (honest fallback when empty). */
export const getAlerts = (): Promise<AlertsResponse> => getJson("/alerts");
/** T10 trend-extrapolated RUL (suppressed + anomaly-only when gated). */
export const getRul = (): Promise<RulResponse> => getJson("/rul");
