import { describe, expect, test } from "bun:test";
import { createDemoDataset, demoDataset, type DemoWheel, type HistoryPoint } from "../../demo/dataset";
import {
  historyKpis,
  sliceHistory,
  timeAxisLabels,
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
      { at: 0, liters: 90, sigma: 1, temperatureC: 70 },
      { at: 3_600_000, liters: 89, sigma: 1, temperatureC: 71, event: "alert" },
      { at: 7_200_000, liters: null, sigma: null, temperatureC: null },
      { at: 10_800_000, liters: 87, sigma: 1, temperatureC: 72, event: "inspection" },
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

  test("demo history follows the wheel loss rate within the available level range", () => {
    const selected = createDemoDataset().wheels.find((item) => item.id === "wheel-LH-02") as DemoWheel;
    const points = sliceHistory(selected, "250h").filter((point) => point.liters !== null);
    const first = points[0]?.liters ?? 0;
    const last = points[points.length - 1]?.liters ?? 0;
    const observedLoss = first - last;
    const expectedLoss = Math.min(selected.lossRateLPer100h * 250 / 100, 95 - selected.levelL);
    expect(observedLoss).toBeGreaterThan(expectedLoss * 0.6);
    expect(observedLoss).toBeLessThan(expectedLoss * 1.4 + 0.5);
    expect(points.every((point) => (point.liters ?? 0) >= 0 && (point.liters ?? 0) <= 97)).toBe(true);
  });

  test("labels the 250 h window with hours before now", () => {
    const labels = timeAxisLabels("250h", sliceHistory(wheel, "250h"), "ahora");
    expect(labels.length).toBe(6);
    expect(labels[0]).toContain("250");
    expect(labels[0]).toContain("h");
    expect(labels[labels.length - 1]).toBe("ahora");
  });

  test("labels longer windows with Spanish calendar dates", () => {
    const es = timeAxisLabels("30d", sliceHistory(wheel, "30d"), "ahora");
    expect(es.length).toBe(5);
    expect(/ene|dic/i.test(es.join(" "))).toBe(true);
    expect(new Set(es).size).toBe(es.length);
  });
});
