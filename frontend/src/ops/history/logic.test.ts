import { describe, expect, test } from "bun:test";
import { demoDataset, type DemoWheel, type HistoryPoint } from "../../demo/dataset";
import {
  historyKpis,
  sliceHistory,
  type HistoryKpiInput,
} from "./logic";

const wheel = demoDataset.wheels[1] as DemoWheel;

describe("wheel history contracts", () => {
  test("slices the selected deterministic history window", () => {
    expect(sliceHistory(wheel, "250h")).toEqual(wheel.history["250h"]);
    expect(sliceHistory(wheel, "7d")).toEqual(wheel.history["7d"]);
  });

  test("computes level change, loss rate, alerts, and completeness", () => {
    const points: HistoryPoint[] = [
      { at: 0, liters: 90, sigma: 1 },
      { at: 3_600_000, liters: 89, sigma: 1, event: "alert" },
      { at: 7_200_000, liters: null, sigma: null },
      { at: 10_800_000, liters: 87, sigma: 1, event: "inspection" },
    ];
    const input: HistoryKpiInput = { points, hoursPerWindow: 3 };
    expect(historyKpis(input)).toEqual({
      levelChange: -3,
      meanLossRate: 100,
      alerts: 1,
      completeness: 75,
    });
  });

  test("history points are available for the demo wheel selected by the route", () => {
    expect(sliceHistory(wheel, "30d").length).toBeGreaterThan(0);
  });
});
