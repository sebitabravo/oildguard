import { BACKEND_URL } from "../sim/api";
import { deriveFleetWebSocketUrl } from "../dash/fleetLive/logic";

export interface BackendDevice {
  device_id: string;
  rows_retained: number;
  rows_verified: number;
  rows_offered: number;
  rows_rejected: number;
  verified_ratio: number | null;
  rejected_reasons: Record<string, number>;
  last_t_iso: string | null;
  latest: {
    temperature_c: number;
    vib_rms_g: number;
    pressure_kpa: number;
    fsm_state: string;
    moving: number;
    link_down: number;
    t_iso: string;
  } | null;
  alert_level: string | null;
  alert_level_reason: string | null;
}

export interface FleetDevicesResponse {
  status: "ok";
  kind: "fleet-devices";
  as_of: string;
  count: number;
  devices: BackendDevice[];
  reason: string | null;
}

export interface PlatformHealthResponse {
  status: "ok" | "degraded";
  mqtt: { host: string; port: number; topic: string };
  signing?: { enforced: boolean; devices: number };
  device_keys?: { explicit: number; master_key_configured: boolean };
}

export interface IngestMetricsResponse {
  status: "ok";
  kind: "ingest-metrics";
  as_of: string;
  ingest: {
    rows: { accepted_1s: number; rejected_1s: number; accepted_total: number; rejected_total: number };
    queue: { depth: number; capacity: number; dropped_batches: number };
    latency: { p50_s: number | null; p99_s: number | null };
  };
}

export interface FleetOutage {
  device_id: string;
  start_t_iso: string;
  end_t_iso: string | null;
  duration_s: number;
  rows_buffered: number;
  forwarded: boolean | null;
}

export interface FleetOutagesResponse {
  status: "ok";
  kind: "fleet-outages";
  count: number;
  outages_total: number;
  outages: FleetOutage[];
  reason: string | null;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, { signal });
  if (!response.ok) throw new Error(`GET ${path} -> ${response.status}`);
  return (await response.json()) as T;
}

export const getPlatformHealth = (signal?: AbortSignal) => getJson<PlatformHealthResponse>("/health", signal);
export const getFleetDevices = (signal?: AbortSignal) => getJson<FleetDevicesResponse>("/fleet/devices", signal);
export const getIngestMetrics = (signal?: AbortSignal) => getJson<IngestMetricsResponse>("/metrics/ingest", signal);
export const getFleetOutages = (signal?: AbortSignal) => getJson<FleetOutagesResponse>("/fleet/outages?limit=1000", signal);
export const fleetWebSocketUrl = () => deriveFleetWebSocketUrl(BACKEND_URL);
