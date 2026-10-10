import { BACKEND_URL } from "../sim/api";

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

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, { signal });
  if (!response.ok) throw new Error(`GET ${path} -> ${response.status}`);
  return (await response.json()) as T;
}

export const getPlatformHealth = (signal?: AbortSignal) => getJson<PlatformHealthResponse>("/health", signal);
export const getFleetDevices = (signal?: AbortSignal) => getJson<FleetDevicesResponse>("/fleet/devices", signal);
