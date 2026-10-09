import { describe, expect, test } from "bun:test";
import { normalizeMineCam, readMineUrl } from "./mineWorld";

describe("mine URL controls", () => {
  test("normalizes the shared camera preset set, including free camera", () => {
    expect(normalizeMineCam("free")).toBe("free");
    expect(normalizeMineCam("shovel")).toBe("shovel");
    expect(normalizeMineCam("unlisted")).toBe(null);
  });

  test("preserves an explicit zero seed for deterministic scene fixtures", () => {
    expect(readMineUrl("?seed=0").seed).toBe(0);
  });

  test("accepts only finite positive scale and known camera presets", () => {
    const supported = readMineUrl("?cam=shovel&scale=30");
    expect(supported.cam).toBe("shovel");
    expect(supported.scale).toBe(30);
    const invalid = readMineUrl("?cam=unlisted&scale=Infinity");
    expect(invalid.cam).toBe(null);
    expect(invalid.scale).toBe(null);
  });

  test("uses an explicit simulation time and pause flag", () => {
    const parsed = readMineUrl("?t=120&pause=1");
    expect(parsed.t).toBe(120);
    expect(parsed.pause).toBe(true);
  });
});
