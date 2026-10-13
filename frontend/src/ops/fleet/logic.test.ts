import { describe, expect, test } from "bun:test";
import { createDemoDataset, demoDataset } from "../../demo/demoData";
import {
  buildWheelDetailHref,
  classifyRowState,
  filterFleetRows,
  fleetCounters,
  fleetFieldSource,
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
    expect(relativeLastComm(1_000, 13_000)).toBe("12 s");
    expect(relativeLastComm(1_000, 241_000)).toBe("4 min");
    expect(relativeLastComm(1_000, 7_201_000)).toBe("2 h");
    for (const row of rows) {
      if (row.lastComm !== null) expect(demoDataset.referenceMs - row.lastComm).toBeLessThan(86_400_000);
    }
  });
});

describe("fleet per-field provenance in mergeLiveDevices", () => {
  // Cada campo conserva su procedencia: solo el nivel y la última
  // comunicación pueden venir del backend; el resto sigue siendo DEMO.
  test("demo rows mark every merged field DEMO", () => {
    for (const row of rows) {
      expect(row.fieldSources.level).toBe("DEMO");
      expect(row.fieldSources.trend).toBe("DEMO");
      expect(row.fieldSources.lossRate).toBe("DEMO");
      expect(row.fieldSources.temperature).toBe("DEMO");
      expect(row.fieldSources.vibration).toBe("DEMO");
      expect(row.fieldSources.regime).toBe("DEMO");
      expect(row.fieldSources.alert).toBe("DEMO");
      expect(row.fieldSources.lastComm).toBe("DEMO");
    }
  });

  test("live merge marks only level and last-comm LIVE, demo telemetry stays DEMO", () => {
    const live = mergeLiveDevices(dataset.trucks, [{
      device_id: "wheel-RH-01",
      truck_id: "OG-01",
      latest_level_liters: 91.2,
      last_t_iso: "2026-10-10T09:00:00.000Z",
    }]);
    const row = live.find((item) => item.id === "wheel-RH-01");
    expect(row?.source).toBe("LIVE");
    expect(row?.fieldSources.level).toBe("LIVE");
    expect(row?.fieldSources.lastComm).toBe("LIVE");
    expect(row?.fieldSources.trend).toBe("DEMO");
    expect(row?.fieldSources.lossRate).toBe("DEMO");
    expect(row?.fieldSources.temperature).toBe("DEMO");
    expect(row?.fieldSources.vibration).toBe("DEMO");
    expect(row?.fieldSources.regime).toBe("DEMO");
    expect(row?.fieldSources.alert).toBe("DEMO");
  });

  test("live device without a level keeps level DEMO while last-comm stays LIVE", () => {
    const live = mergeLiveDevices(dataset.trucks, [{
      device_id: "wheel-RH-01",
      truck_id: "OG-01",
      last_t_iso: "2026-10-10T09:00:00.000Z",
    }]);
    const row = live.find((item) => item.id === "wheel-RH-01");
    expect(row?.source).toBe("LIVE");
    expect(row?.fieldSources.level).toBe("DEMO");
    expect(row?.fieldSources.lastComm).toBe("LIVE");
    expect(row?.fieldSources.temperature).toBe("DEMO");
  });

  test("live-only devices mark synthesized telemetry DEMO", () => {
    const live = mergeLiveDevices(dataset.trucks, [{
      device_id: "wheel-XX-99",
      truck_id: "OG-01",
      latest_level_liters: 88.5,
      last_t_iso: "2026-10-10T09:00:00.000Z",
    }]);
    const row = live.find((item) => item.id === "wheel-XX-99");
    expect(row?.source).toBe("LIVE");
    expect(row?.fieldSources.level).toBe("LIVE");
    expect(row?.fieldSources.lastComm).toBe("LIVE");
    expect(row?.fieldSources.temperature).toBe("DEMO");
    expect(row?.fieldSources.vibration).toBe("DEMO");
    expect(row?.fieldSources.regime).toBe("DEMO");
    expect(row?.fieldSources.alert).toBe("DEMO");
  });

  test("negative: row-level LIVE alone would silently present demo telemetry as live", () => {
    // La fila es LIVE pero su temperatura sigue siendo DEMO; sin procedencia
    // por campo, el rótulo de fila bastaría para leerla como viva.
    const live = mergeLiveDevices(dataset.trucks, [{
      device_id: "wheel-RH-01",
      truck_id: "OG-01",
      latest_level_liters: 91.2,
      last_t_iso: "2026-10-10T09:00:00.000Z",
    }]);
    const row = live.find((item) => item.id === "wheel-RH-01");
    expect(row?.source).toBe("LIVE");
    expect(row?.fieldSources.temperature).toBe("DEMO");
  });

  test("fleetFieldSource reads the per-field provenance map", () => {
    const row = rows[0];
    if (!row) throw new Error("missing demo row");
    expect(fleetFieldSource(row, "level")).toBe("DEMO");
    expect(fleetFieldSource(row, "lastComm")).toBe("DEMO");
  });

  test("live merge keeps sigma DEMO while level goes LIVE", () => {
    // El sigma mostrado sigue siendo sintético; sin campo propio el rótulo LIVE del nivel lo cubriría.
    const live = mergeLiveDevices(dataset.trucks, [{
      device_id: "wheel-RH-01",
      truck_id: "OG-01",
      latest_level_liters: 91.2,
      last_t_iso: "2026-10-10T09:00:00.000Z",
    }]);
    const row = live.find((item) => item.id === "wheel-RH-01");
    expect(row?.fieldSources.level).toBe("LIVE");
    expect(row?.fieldSources.sigma).toBe("DEMO");
  });

  test("demo rows mark sigma DEMO", () => {
    // El sigma demo necesita procedencia propia para no leerse como vivo en una fila LIVE.
    expect(rows[0]?.fieldSources.sigma).toBe("DEMO");
  });
});
