import type { DemoTruck, DemoWheel } from "../../demo/dataset";
import { formatNumber } from "../../i18n/numberFormat";
import type { Lang } from "../../i18n";

export type FleetFilterState = "all" | "alert" | "no-link" | "out-of-service";
export type FleetRowState = "nominal" | "N1" | "N2" | "N4" | "stale" | "link-down" | "out-of-service";
export type FleetSource = "LIVE" | "DEMO";

export interface LiveFleetDevice {
  device_id: string;
  truck_id?: string;
  last_t_iso?: string | null;
  latest_level_liters?: number | null;
  latest_level_pct?: number | null;
  verified_ratio?: number | null;
  status?: string | null;
}

export interface FleetRow {
  id: string;
  truckId: string;
  truckModel: DemoTruck["model"];
  wheel: DemoWheel;
  source: FleetSource;
  levelL: number;
  lastComm: number | null;
  liveDevice?: LiveFleetDevice;
}

export interface FleetGroup {
  truckId: string;
  model: DemoTruck["model"];
  wheels: FleetRow[];
}

export function classifyRowState(wheel: DemoWheel, lastComm = wheel.lastComm): FleetRowState {
  if (wheel.state === "out-of-service") return "out-of-service";
  if (wheel.state === "link-down" || lastComm === null) return "link-down";
  if (wheel.state === "stale") return "stale";
  if (wheel.state === "N1" || wheel.state === "N2" || wheel.state === "N4") return wheel.state;
  return "nominal";
}

export function mergeLiveDevices(trucks: DemoTruck[], devices: LiveFleetDevice[]): FleetRow[] {
  const demoRows: FleetRow[] = trucks.flatMap((truck) => truck.wheels.map((wheel) => ({
    id: wheel.id,
    truckId: truck.id,
    truckModel: truck.model,
    wheel,
    source: "DEMO" as const,
    levelL: wheel.levelL,
    lastComm: wheel.lastComm,
  })));
  const byId = new Map(demoRows.map((row) => [row.id, row]));
  for (const device of devices) {
    const existing = byId.get(device.device_id);
    const parsedLastComm = device.last_t_iso ? Date.parse(device.last_t_iso) : null;
    if (existing) {
      byId.set(device.device_id, {
        ...existing,
        source: "LIVE",
        levelL: typeof device.latest_level_liters === "number" ? device.latest_level_liters : existing.levelL,
        lastComm: parsedLastComm,
        liveDevice: device,
      });
      continue;
    }
    const truckId = device.truck_id ?? device.device_id.split("-").slice(0, 2).join("-");
    const fallbackWheel = trucks.flatMap((truck) => truck.wheels).find((wheel) => wheel.id === device.device_id);
    if (fallbackWheel) continue;
    const truck = trucks.find((item) => item.id === truckId) ?? trucks[0];
    if (!truck) continue;
    const wheel = { ...truck.wheels[0], id: device.device_id, truckId, position: "LH" as const };
    byId.set(device.device_id, {
      id: device.device_id,
      truckId,
      truckModel: truck.model,
      wheel,
      source: "LIVE",
      levelL: typeof device.latest_level_liters === "number" ? device.latest_level_liters : wheel.levelL,
      lastComm: parsedLastComm,
      liveDevice: device,
    });
  }
  return [...byId.values()].map((row) => ({
    ...row,
    wheel: { ...row.wheel, state: classifyRowState(row.wheel, row.lastComm) === "stale" ? "stale" : row.wheel.state },
  })).sort((a, b) => a.truckId.localeCompare(b.truckId) || a.wheel.position.localeCompare(b.wheel.position));
}

export function groupFleetRows(rows: FleetRow[]): FleetGroup[] {
  const groups = new Map<string, FleetGroup>();
  for (const row of rows) {
    const group = groups.get(row.truckId) ?? { truckId: row.truckId, model: row.truckModel, wheels: [] };
    group.wheels.push(row);
    groups.set(row.truckId, group);
  }
  return [...groups.values()];
}

export function filterFleetRows(rows: FleetRow[], model: string, state: FleetFilterState, query: string): FleetRow[] {
  const normalized = query.trim().toLowerCase();
  return rows.filter((row) => {
    const rowState = classifyRowState(row.wheel, row.lastComm);
    const modelMatch = model === "all" || (model === "930E" ? row.truckModel.startsWith("930E") : row.truckModel.startsWith("980E"));
    const stateMatch = state === "all"
      || (state === "alert" && ["N1", "N2", "N4"].includes(rowState))
      || (state === "no-link" && ["stale", "link-down"].includes(rowState))
      || (state === "out-of-service" && rowState === "out-of-service");
    const queryMatch = !normalized || `${row.truckId} ${row.id} ${row.wheel.position}`.toLowerCase().includes(normalized);
    return modelMatch && stateMatch && queryMatch;
  });
}

export function fleetCounters(rows: FleetRow[]) {
  const states = rows.map((row) => classifyRowState(row.wheel, row.lastComm));
  return {
    trucks: new Set(rows.map((row) => row.truckId)).size,
    activeTrucks: new Set(rows.filter((row) => classifyRowState(row.wheel, row.lastComm) !== "out-of-service").map((row) => row.truckId)).size,
    wheels: rows.length,
    alerts: states.filter((state) => ["N1", "N2", "N4"].includes(state)).length,
    n4: states.filter((state) => state === "N4").length,
    n2: states.filter((state) => state === "N2").length,
    noLink: states.filter((state) => state === "stale" || state === "link-down").length,
    stale: states.filter((state) => state === "stale").length,
    linkDown: states.filter((state) => state === "link-down").length,
    outOfService: states.filter((state) => state === "out-of-service").length,
  };
}

export function relativeLastComm(lastComm: number | null, now: number, lang: Lang): string {
  if (lastComm === null) return "link-down";
  const seconds = Math.max(0, Math.round((now - lastComm) / 1000));
  if (seconds < 60) return `${formatNumber(seconds, lang, 0)} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${formatNumber(minutes, lang, 0)} min`;
  return `${formatNumber(Math.round(minutes / 60), lang, 0)} h`;
}

export function toCsv(rows: FleetRow[]): string {
  const header = ["truck_id", "model", "wheel_id", "position", "level_l", "state", "source", "last_comm"];
  const escape = (value: string | number) => `"${String(value).split('"').join('""')}"`;
  return [
    header,
    ...rows.map((row) => [
      row.truckId,
      row.truckModel,
      row.id,
      row.wheel.position,
      row.levelL,
      classifyRowState(row.wheel, row.lastComm),
      row.source,
      row.lastComm === null ? "" : new Date(row.lastComm).toISOString(),
    ]),
  ].map((line) => line.map(escape).join(",")).join("\n");
}

export function buildWheelDetailHref(wheelId: string): string {
  return `/monitoring?wheel=${encodeURIComponent(wheelId)}`;
}
