import { describe, expect, test } from "bun:test";
import { createDemoDataset, demoDataset } from "../../demo/dataset";
import {
  buildWheelDetailHref,
  classifyRowState,
  filterFleetRows,
  fleetCounters,
  groupFleetRows,
  mergeLiveDevices,
  relativeLastComm,
  toCsv,
} from "./logic";

const dataset = createDemoDataset();
const rows = mergeLiveDevices(dataset.trucks, []);

describe("fleet overview logic", () => {
  test("groups demo wheels by truck and preserves both positions", () => {
    const groups = groupFleetRows(rows);
    expect(groups.length).toBe(6);
    expect(groups.every((group) => group.wheels.length === 2)).toBe(true);
  });

  test("counts alerts and communication states", () => {
    const counts = fleetCounters(rows);
    expect(counts.wheels).toBe(12);
    expect(counts.alerts).toBe(6);
    expect(counts.noLink).toBe(3);
    expect(counts.outOfService).toBe(2);
  });

  test("filters model, state, and wheel search", () => {
    expect(filterFleetRows(rows, "930E", "all", "").every((row) => row.truckModel.startsWith("930E"))).toBe(true);
    expect(filterFleetRows(rows, "all", "alert", "").every((row) => ["N1", "N2", "N4"].includes(classifyRowState(row.wheel, row.lastComm)))).toBe(true);
    expect(filterFleetRows(rows, "all", "all", "RH-03").length).toBe(1);
  });

  test("replaces matching demo rows with live levels and source", () => {
    const live = mergeLiveDevices(dataset.trucks, [{
      device_id: "wheel-RH-01",
      truck_id: "OG-01",
      latest_level_liters: 91.2,
      last_t_iso: "2026-10-10T09:00:00.000Z",
    }]);
    const row = live.find((item) => item.id === "wheel-RH-01");
    expect(row?.source).toBe("LIVE");
    expect(row?.levelL).toBe(91.2);
  });

  test("serializes visible rows as escaped CSV", () => {
    const csv = toCsv(rows.slice(0, 1));
    expect(csv.split("\n").length).toBe(2);
    expect(csv).toContain('"truck_id"');
    expect(csv).toContain('"DEMO"');
  });

  test("builds the monitoring detail link", () => {
    expect(buildWheelDetailHref("wheel RH/01")).toBe("/monitoring?wheel=wheel%20RH%2F01");
  });

  test("formats ages and keeps demo telemetry within the fixed reference day", () => {
    expect(relativeLastComm(1_000, 13_000, "en")).toBe("12 s");
    expect(relativeLastComm(1_000, 241_000, "es")).toBe("4 min");
    expect(relativeLastComm(1_000, 7_201_000, "en")).toBe("2 h");
    for (const row of rows) {
      if (row.lastComm !== null) expect(demoDataset.referenceMs - row.lastComm).toBeLessThan(86_400_000);
    }
  });
});
