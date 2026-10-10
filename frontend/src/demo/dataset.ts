export const DEMO_REFERENCE_MS = Date.parse("2026-01-15T12:00:00.000Z");
export const NOMINAL_LITERS = 95;

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

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function historyFor(random: () => number, level: number, lossRateLPer100h: number): Record<HistoryWindow, HistoryPoint[]> {
  const windows: Array<[HistoryWindow, number, number]> = [["250h", 25, 250], ["7d", 21, 168], ["30d", 30, 720], ["90d", 36, 2160]];
  return Object.fromEntries(windows.map(([window, count, windowHours]) => [
    window,
    Array.from({ length: count }, (_, index) => {
      const elapsedHours = (index / (count - 1)) * windowHours;
      const baseline = Math.min(NOMINAL_LITERS, level + (lossRateLPer100h * (windowHours - elapsedHours)) / 100);
      const refill = index === Math.floor(count * 0.62);
      const noisyLevel = baseline + (refill ? 2.4 : 0) + (random() - 0.5) * 0.28;
      const isGap = index === Math.floor(count * 0.28) || index === Math.floor(count * 0.76);
      return {
        at: DEMO_REFERENCE_MS - ((count - 1 - index) * (windowHours / (count - 1)) * 60 * 60 * 1000),
        liters: isGap ? null : round(Math.max(0, Math.min(NOMINAL_LITERS + 2, noisyLevel))),
        sigma: round(0.35 + random() * 0.35),
        event: refill ? "refill" : index === Math.floor(count / 2) ? "inspection" : index === count - 3 ? "alert" : undefined,
      };
    }),
  ])) as Record<HistoryWindow, HistoryPoint[]>;
}

export function createDemoDataset(seed = 930106): DemoDataset {
  const random = seeded(seed);
  const states: DemoState[] = ["nominal", "N1", "N2", "N4", "stale", "link-down"];
  const alerts: DemoAlert[] = [];
  const trucks = Array.from({ length: 6 }, (_, truckIndex) => {
    const is980 = truckIndex === 5;
    const truckId = `OG-${String(truckIndex + 1).padStart(2, "0")}`;
    const wheels = (["LH", "RH"] as const).map((position, wheelIndex) => {
      const state = is980 ? "out-of-service" : states[(truckIndex + wheelIndex) % states.length];
      const alertLevel = state === "N1" || state === "N2" || state === "N4" ? state : null;
      const levelL = is980 ? 95 : round(82 + random() * 12);
      const lossRateLPer100h = round(alertLevel ? 1.2 + random() * 2 : random() * 0.3, 2);
      const wheel: DemoWheel = {
        id: `wheel-${position}-${String(truckIndex + 1).padStart(2, "0")}`,
        truckId,
        position,
        model: is980 ? "GDY108-C" : "GDY106",
        validated: !is980,
        levelL,
        sigmaL: round(0.8 + random() * 1.5),
        pressureKpa: round(2.1 + random() * 0.8, 2),
        temperatureC: round(48 + random() * 25),
        vibRms: round(0.18 + random() * 0.5, 2),
        regime: wheelIndex === 0 ? "rest" : "movement",
        validity: state === "stale" ? "stale" : state === "link-down" ? "estimate" : is980 ? "invalid" : "valid",
        state,
        alertLevel,
        lossRateLPer100h,
        lastComm: state === "stale" ? DEMO_REFERENCE_MS - 180_000 : state === "link-down" ? null : DEMO_REFERENCE_MS - 8_000,
        history: historyFor(random, levelL, lossRateLPer100h),
      };
      if (alertLevel) {
        const recipient: Recipient = alertLevel === "N1" ? "Reliability" : alertLevel === "N2" ? "Planning" : "Operator";
        alerts.push({
          id: `alert-${wheel.id}`,
          wheelId: wheel.id,
          level: alertLevel,
          lifecycle: (["open", "acknowledged", "escalated", "closed"] as const)[truckIndex % 4],
          recipient,
          channels: [
            { name: "pressure_drop", state: alertLevel === "N1" ? "fired" : "quiet" },
            { name: "level_trend", state: "fired" },
            { name: "vib_impact", state: alertLevel === "N2" ? "fired" : "quiet" },
            { name: "temp_drift_veto", state: "quiet" },
          ],
          audit: [
            { actor: recipient, action: "Alert created", at: DEMO_REFERENCE_MS - 3_600_000 },
            { actor: recipient, action: "Review recorded", at: DEMO_REFERENCE_MS - 1_800_000 },
          ],
        });
      }
      return wheel;
    });
    return {
      id: truckId,
      model: is980 ? ("980E-5" as const) : ("930E-4SE" as const),
      state: wheels[0].state,
      wheels,
    };
  });
  const wheels = trucks.flatMap((truck) => truck.wheels);
  const devices = wheels.map((wheel) => ({
    id: wheel.id,
    truckId: wheel.truckId,
    lastSeen: wheel.lastComm,
    signedRowRatio: wheel.validated ? 0.998 : 0,
    fw: wheel.validated ? "not reported" : null,
    cert: null,
    state: wheel.state === "link-down" ? "offline" as const : wheel.state === "stale" ? "buffering" as const : "online" as const,
  }));
  return {
    referenceMs: DEMO_REFERENCE_MS,
    trucks,
    wheels,
    alerts,
    devices,
    outages: [{ deviceId: "wheel-RH-03", start: DEMO_REFERENCE_MS - 900_000, end: null }],
  };
}

export const demoDataset = createDemoDataset();
