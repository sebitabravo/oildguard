// T8 backend API client types (S4 slice).
//
// Thin typed wrapper over backend/main.py (see backend/API.md).
// Consumed by the T11 dashboard; no UI changes in T8.
// Base URL defaults to PUBLIC_BACKEND_URL (compose sets http://localhost:8000).

import type { RestWindow, SignalRow } from "./signals";

export interface SigningStatus {
  enforced: boolean;
  devices: number;
  verified_total: number;
  rejected_total: number;
  rejected_reasons: Record<string, number>;
}

export interface BackendMessage {
  code: string;
  params: Record<string, unknown>;
}

export const BACKEND_URL: string =
  (import.meta.env?.PUBLIC_BACKEND_URL as string | undefined) ??
  "http://localhost:8000";

export interface HealthResponse {
  status: "ok" | "degraded";
  service: string;
  stage: string;
  analysis: { available: boolean; reason: string | null };
  store_rows: number;
  influx_points: number | null;
  influx: string;
  influx_message?: BackendMessage;
  mqtt: { host: string; port: number; topic: string };
  signing?: SigningStatus;
}

export interface IngestAck {
  status: "ok";
  kind: "ingest-ack";
  as_of: string;
  ingested: number;
  latest_seq: number;
  store_rows: number;
  influx: string;
  influx_message?: BackendMessage;
  rejected?: number;
  rejected_reasons?: Record<string, number>;
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
  source_message?: BackendMessage;
  note_message?: BackendMessage;
}

export interface LevelResponse {
  status: "ok";
  kind: "oil-level";
  as_of: string;
  data: LevelData;
}

export interface LevelSeriesPoint {
  t_s: number;
  level_l: number | null;
  sigma_l: number | null;
  moving: number;
  recal_window: number;
}

export interface LevelSeriesResponse {
  status: "ok";
  kind: "oil-level-series";
  as_of: string;
  count: number;
  reason: string | null;
  series: LevelSeriesPoint[];
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
  reason_message?: BackendMessage;
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
  note_message?: BackendMessage;
  fallback: string;
  fallback_message?: BackendMessage;
}

export interface AlertsResponse {
  status: "ok" | "unavailable";
  kind: "alerts";
  as_of: string;
  evaluated: boolean;
  reason?: string;
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
  reason?: string;
  slope_L_per_h: number;
  r2: number;
  current_level_L: number;
  model: string;
  note: string;
  note_message?: BackendMessage;
  reason_message?: BackendMessage;
  fallback: string;
  fallback_message?: BackendMessage;
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
  note_message?: BackendMessage;
  reason_message?: BackendMessage;
  fallback: string;
  fallback_message?: BackendMessage;
  hours_to_warning?: number | null;
  reason?: string;
}

export interface RulDataUnavailable {
  hours: null;
  haul_cycles: null;
  shifts: null;
  confidence: number;
  status: "unavailable";
  anomaly_only: true;
  reason?: string;
  model: string;
  note: string;
  note_message?: BackendMessage;
  reason_message?: BackendMessage;
  fallback: string;
  fallback_message?: BackendMessage;
}

export type RulData = RulDataOk | RulDataSuppressed | RulDataUnavailable;

export interface RulResponse {
  status: "ok" | "unavailable";
  kind: "rul";
  as_of: string;
  evaluated: boolean;
  reason?: string;
  data: RulData;
}

export interface FleetMetricSummary {
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  count: number;
  devices: number;
}

export interface FleetAggregatesResponse {
  status: "ok";
  kind: "fleet-aggregates";
  as_of: string;
  window_s: number;
  rows: number;
  devices: number;
  aggregates: Record<string, FleetMetricSummary>;
  reason: string | null;
  code: string | null;
}

export interface IngestMetricsResponse {
  status: "ok";
  kind: "ingest-metrics";
  as_of: string;
  ingest: {
    rows: {
      accepted_1s: number;
      rejected_1s: number;
      accepted_total: number;
      rejected_total: number;
    };
    queue: {
      depth: number;
      capacity: number;
      dropped_batches: number;
    };
    latency: {
      p50_s: number | null;
      p99_s: number | null;
    };
  };
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
export const getLevelSeries = (limit = 300): Promise<LevelSeriesResponse> =>
  getJson(`/level/series?limit=${limit}`);
export const getWindows = (limit = 50): Promise<WindowsResponse> =>
  getJson(`/windows?limit=${limit}`);
/** T10 N1–N4 ladder over the memory store (honest fallback when empty). */
export const getAlerts = (): Promise<AlertsResponse> => getJson("/alerts");
/** T10 trend-extrapolated RUL (suppressed + anomaly-only when gated). */
export const getRul = (): Promise<RulResponse> => getJson("/rul");
export const getFleetAggregates = (windowS = 10): Promise<FleetAggregatesResponse> =>
  getJson(`/fleet/aggregates?window_s=${windowS}&group=fleet`);
export const getIngestMetrics = (): Promise<IngestMetricsResponse> =>
  getJson("/metrics/ingest");
