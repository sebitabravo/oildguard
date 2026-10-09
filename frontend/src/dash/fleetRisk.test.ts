import { describe, expect, test } from "bun:test";
import { DEMO_FLEET_WHEELS, evaluateCombinedRisk, latestWheelMetrics, type WheelProxyMetrics } from "./fleetRisk";

const baseline: WheelProxyMetrics = {
  oilLitres: 70,
  temperatureC: 72,
  vibrationMmS: 3.2,
  currentA: 410,
};

describe("fleet demo combined-risk rule", () => {
  test("does not alert unless at least two of three proxy channels cross their assumptions", () => {
    expect(evaluateCombinedRisk(baseline).alert).toBe(false);
    expect(evaluateCombinedRisk({ ...baseline, oilLitres: 47.49 }).alert).toBe(false);
    expect(evaluateCombinedRisk({ ...baseline, temperatureC: 90 }).alert).toBe(false);
    expect(evaluateCombinedRisk({ ...baseline, vibrationMmS: 7 }).alert).toBe(false);
  });

  test("alerts at two crossed boundaries and reports the contributing channels", () => {
    expect(evaluateCombinedRisk({ ...baseline, oilLitres: 47.5, temperatureC: 90 })).toEqual({
      alert: true,
      channels: ["low-oil", "high-temperature"],
    });
    expect(evaluateCombinedRisk({ ...baseline, temperatureC: 90, vibrationMmS: 7 })).toEqual({
      alert: true,
      channels: ["high-temperature", "high-vibration"],
    });
  });

  test("does not treat current as a fourth alert channel", () => {
    expect(evaluateCombinedRisk({ ...baseline, currentA: 999 }).alert).toBe(false);
  });

  test("uses the latest sample in each series for the combined rule", () => {
    expect(latestWheelMetrics({
      truckId: "OG-03",
      wheelId: "RH",
      oilLitres: 46.8,
      temperatureC: [84, 91],
      vibrationMmS: [4.1, 4.7],
      currentA: [425, 443],
    })).toEqual({ oilLitres: 46.8, temperatureC: 91, vibrationMmS: 4.7, currentA: 443 });
  });
});

describe("fleet demo wheel positions", () => {
  test("lists the same four positions for every truck and marks the GDY106 wheel separately", () => {
    const wheelsByTruck = new Map<string, typeof DEMO_FLEET_WHEELS>();
    for (const wheel of DEMO_FLEET_WHEELS) {
      wheelsByTruck.set(wheel.truckId, [...(wheelsByTruck.get(wheel.truckId) ?? []), wheel]);
    }

    for (const wheels of wheelsByTruck.values()) {
      expect(wheels.map((wheel) => wheel.wheelId).sort()).toEqual(["FL", "FR", "RL", "RR"]);
    }
    expect(DEMO_FLEET_WHEELS.find((wheel) => wheel.truckId === "OG-03" && wheel.wheelId === "RR")?.instrumented).toBe(true);
  });
});
