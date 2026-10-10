export interface InventoryDevice {
  id: string;
  lastSeenMs: number | null;
  rowsRetained: number | null;
  rowsVerified: number;
  rowsOffered: number;
  signedRatio?: number | null;
  rejectedRows: number;
  rejectedReasons: Record<string, number>;
  latest: { temperatureC: number; vibrationRmsG: number; pressureKpa: number; fsmState: string; moving: number; linkDown: number; tIso: string } | null;
  alertLevel: string | null;
  alertLevelReason: string | null;
}

export interface WheelMapping {
  id: string;
  truckId: string;
  position: "LH" | "RH";
}

export type DeviceFilter = "all" | "reporting" | "stale" | "rejected";

function isStale(device: InventoryDevice, nowMs: number): boolean {
  return device.lastSeenMs === null || nowMs - device.lastSeenMs > 120_000;
}

export function deriveDeviceKpis(devices: InventoryDevice[], nowMs: number) {
  const totalVerified = devices.reduce((sum, device) => sum + device.rowsVerified, 0);
  const totalOffered = devices.reduce((sum, device) => sum + device.rowsOffered, 0);
  return {
    reporting: devices.filter((device) => !isStale(device, nowMs)).length,
    signedRatio: totalOffered > 0 ? totalVerified / totalOffered : null,
    rejected: devices.filter((device) => device.rejectedRows > 0).length,
    stale: devices.filter((device) => isStale(device, nowMs)).length,
  };
}

export function filterDevices(devices: InventoryDevice[], filter: DeviceFilter, query: string, nowMs: number): InventoryDevice[] {
  const needle = query.trim().toLocaleLowerCase();
  return devices.filter((device) => {
    if (filter === "reporting" && isStale(device, nowMs)) return false;
    if (filter === "stale" && !isStale(device, nowMs)) return false;
    if (filter === "rejected" && device.rejectedRows === 0) return false;
    return !needle || device.id.toLocaleLowerCase().includes(needle);
  });
}

export function mapDeviceToWheel(deviceId: string, mapping: WheelMapping[]): { truckId: string; position: "LH" | "RH" } | null {
  const wheel = mapping.find((item) => item.id === deviceId);
  return wheel ? { truckId: wheel.truckId, position: wheel.position } : null;
}

export function paginateDevices<T>(devices: T[], requestedPage: number, pageSize: number) {
  const size = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(devices.length / size));
  const page = Math.min(pageCount, Math.max(1, Math.floor(requestedPage)));
  return { items: devices.slice((page - 1) * size, page * size), page, pageCount, total: devices.length };
}
