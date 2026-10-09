// T8 backend API client types (S4 slice).
//
// Thin typed wrapper over backend/main.py (see backend/API.md).
// Consumed by the T11 dashboard; no UI changes in T8.
// Base URL defaults to VITE_BACKEND_URL (compose sets http://localhost:8000).

import type { RestWindow, SignalRow } from "./signals";

export const BACKEND_URL: string =
  (import.meta.env?.VITE_BACKEND_URL as string | undefined) ??
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

export interface NotImplementedYet {
  status: "NOT_IMPLEMENTED_YET";
  kind: string;
  as_of: string;
  data: Record<string, unknown>;
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
export const getAlerts = (): Promise<NotImplementedYet> => getJson("/alerts");
export const getRul = (): Promise<NotImplementedYet> => getJson("/rul");
