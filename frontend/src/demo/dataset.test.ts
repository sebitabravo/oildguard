import { describe, expect, test } from "bun:test";
import { DEMO_REFERENCE_MS, NOMINAL_LITERS, createDemoDataset } from "./dataset";

describe("demo dataset", () => {
  test("is deterministic for a seed", () => {
    expect(createDemoDataset(42)).toEqual(createDemoDataset(42));
  });

  test("models six trucks and rear LH/RH wheels", () => {
    const data = createDemoDataset();
    expect(data.trucks.length).toBe(6);
    expect(data.wheels.length).toBe(12);
    expect(data.wheels.every((wheel) => ["LH", "RH"].includes(wheel.position))).toBe(true);
    expect(data.wheels.filter((wheel) => wheel.model === "GDY108-C").every((wheel) => !wheel.validated)).toBe(true);
  });

  test("keeps levels at or below nominal plus confidence band", () => {
    const data = createDemoDataset();
    expect(data.wheels.every((wheel) => wheel.levelL <= NOMINAL_LITERS + wheel.sigmaL)).toBe(true);
    expect(data.wheels.filter((wheel) => wheel.validity === "stale").every((wheel) => DEMO_REFERENCE_MS - (wheel.lastComm ?? 0) > 120_000)).toBe(true);
    expect(data.alerts.every((alert) => {
      const wheel = data.wheels.find((item) => item.id === alert.wheelId);
      return wheel?.alertLevel === alert.level;
    })).toBe(true);
  });

  test("includes all history windows, lifecycle states and device metadata", () => {
    const data = createDemoDataset();
    expect(data.wheels.every((wheel) => Object.keys(wheel.history).sort().join(",") === "250h,30d,7d,90d")).toBe(true);
    expect(new Set(data.alerts.map((alert) => alert.lifecycle))).toEqual(new Set(["open", "acknowledged", "escalated", "closed"]));
    expect(data.devices.some((device) => device.fw === null && device.cert === null)).toBe(true);
    expect(data.outages.length).toBeGreaterThan(0);
  });
});
