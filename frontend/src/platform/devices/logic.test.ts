import { describe, expect, test } from "bun:test";
import { deriveDeviceKpis, filterDevices, mapDeviceToWheel, type InventoryDevice, type WheelMapping } from "./logic";

const devices: InventoryDevice[] = [
  { id: "wheel-RH-01", lastSeenMs: 199_950, rowsRetained: 40, rowsVerified: 38, rowsOffered: 40, rejectedRows: 2, rejectedReasons: { bad_signature: 2 }, latest: null, alertLevel: "N1", alertLevelReason: null },
  { id: "edge-02", lastSeenMs: 70_000, rowsRetained: 20, rowsVerified: 20, rowsOffered: 20, rejectedRows: 0, rejectedReasons: {}, latest: null, alertLevel: null, alertLevelReason: null },
  { id: "edge-03", lastSeenMs: null, rowsRetained: 0, rowsVerified: 0, rowsOffered: 4, rejectedRows: 4, rejectedReasons: { unknown_device: 4 }, latest: null, alertLevel: null, alertLevelReason: null },
];

describe("device inventory logic", () => {
  test("derives reporting, weighted signing, rejected and stale KPIs", () => {
    expect(deriveDeviceKpis(devices, 200_000)).toEqual({ reporting: 1, signedRatio: 58 / 64, rejected: 2, stale: 2 });
  });

  test("filters by state and case-insensitive device identifier", () => {
    expect(filterDevices(devices, "reporting", "WHEEL", 200_000).map((device) => device.id)).toEqual(["wheel-RH-01"]);
    expect(filterDevices(devices, "stale", "", 200_000).map((device) => device.id)).toEqual(["edge-02", "edge-03"]);
    expect(filterDevices(devices, "rejected", "", 200_000).map((device) => device.id)).toEqual(["wheel-RH-01", "edge-03"]);
  });

  test("maps matching live wheel ids to dataset truck and wheel context only", () => {
    const mapping: WheelMapping[] = [{ id: "wheel-RH-01", truckId: "OG-01", position: "RH" }];
    expect(mapDeviceToWheel("wheel-RH-01", mapping)).toEqual({ truckId: "OG-01", position: "RH" });
    expect(mapDeviceToWheel("edge-02", mapping)).toBe(null);
  });
});
