import rawDemoData from "./demo-data.json";

const appData = rawDemoData.demo;

export const DEMO_REFERENCE_MS = appData.referenceMs;
export const NOMINAL_LITERS = rawDemoData.physics.constants.capacityL;

export type DemoState =
  | "nominal"
  | "N1"
  | "N2"
  | "N4"
  | "stale"
  | "link-down"
  | "out-of-service";
export type WheelPosition = "LH" | "RH";
export type Validity = "valid" | "estimate" | "stale" | "invalid";
export type AlertLifecycle = "open" | "acknowledged" | "escalated" | "closed";
export type Recipient = "Reliability" | "Planning" | "Dispatch & supervisor" | "Operator";
export type HistoryWindow = "250h" | "7d" | "30d" | "90d";

export interface DemoChannel {
  name: "pressure_drop" | "level_trend" | "vib_impact" | "temp_drift_veto";
  state: "fired" | "quiet" | "no-data";
}

export interface AuditEntry {
  actor: Recipient;
  action: string;
  at: number;
}

export interface DemoAlert {
  id: string;
  wheelId: string;
  level: "N1" | "N2" | "N3" | "N4";
  lifecycle: AlertLifecycle;
  recipient: Recipient;
  channels: DemoChannel[];
  audit: AuditEntry[];
}

export interface HistoryPoint {
  at: number;
  liters: number | null;
  sigma: number | null;
  temperatureC: number | null;
  event?: "outage" | "alert" | "inspection" | "refill";
}

export interface DemoWheel {
  id: string;
  truckId: string;
  position: WheelPosition;
  model: "GDY106" | "GDY108-C";
  validated: boolean;
  levelL: number;
  sigmaL: number;
  pressureKpa: number;
  temperatureC: number;
  vibRms: number;
  regime: "movement" | "rest";
  validity: Validity;
  state: DemoState;
  alertLevel: "N1" | "N2" | "N4" | null;
  lossRateLPer100h: number;
  lastComm: number | null;
  history: Record<HistoryWindow, HistoryPoint[]>;
}

export interface DemoTruck {
  id: string;
  model: "930E-4SE" | "980E-5";
  state: DemoState;
  wheels: DemoWheel[];
}

export interface DemoDevice {
  id: string;
  truckId: string;
  lastSeen: number | null;
  signedRowRatio: number;
  fw: string | null;
  cert: string | null;
  state: "online" | "buffering" | "offline";
}

export interface DemoDataset {
  referenceMs: number;
  trucks: DemoTruck[];
  wheels: DemoWheel[];
  alerts: DemoAlert[];
  devices: DemoDevice[];
  outages: Array<{ deviceId: string; start: number; end: number | null }>;
}

const appDataset = {
  referenceMs: appData.referenceMs,
  trucks: appData.trucks,
  wheels: appData.wheels,
  alerts: appData.alerts,
  devices: appData.devices,
  outages: appData.outages,
} as unknown as DemoDataset;

export function createDemoDataset(_seed = 930106): DemoDataset {
  return structuredClone(appDataset);
}

export const demoDataset: DemoDataset = structuredClone(appDataset);
