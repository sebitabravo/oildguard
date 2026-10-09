import { describe, expect, test } from "bun:test";
import { PRESET_DEFAULTS, resolveQuality, sunDirection } from "./settings";

describe("resolveQuality", () => {
  test("low caps the pixel ratio at 1 and disables shadows", () => {
    const q = resolveQuality("low", 3);
    expect(q.pixelRatio).toBe(1);
    expect(q.shadows).toBe(false);
    expect(q.shadowMapSize).toBe(0);
  });

  test("high caps the pixel ratio at 2 and keeps a 2048 shadow map", () => {
    const q = resolveQuality("high", 3);
    expect(q.pixelRatio).toBe(2);
    expect(q.shadows).toBe(true);
    expect(q.shadowMapSize).toBe(2048);
  });

  test("medium uses a smaller shadow map", () => {
    expect(resolveQuality("medium", 1.5).shadowMapSize).toBe(1024);
    expect(resolveQuality("medium", 1.5).pixelRatio).toBe(1.5);
  });

  test("falls back to ratio 1 for invalid device pixel ratios", () => {
    expect(resolveQuality("high", 0).pixelRatio).toBe(1);
    expect(resolveQuality("high", Number.NaN).pixelRatio).toBe(1);
  });
});

describe("sunDirection", () => {
  test("is a unit vector", () => {
    const [x, y, z] = sunDirection(34, 135);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 12);
  });

  test("elevation 90 points straight up", () => {
    const [x, y, z] = sunDirection(90, 0);
    expect(x).toBeCloseTo(0, 12);
    expect(y).toBeCloseTo(1, 12);
    expect(z).toBeCloseTo(0, 12);
  });

  test("azimuth 0 at the horizon points along +Z", () => {
    const [x, y, z] = sunDirection(0, 0);
    expect(x).toBeCloseTo(0, 12);
    expect(y).toBeCloseTo(0, 12);
    expect(z).toBeCloseTo(1, 12);
  });
});

describe("preset defaults", () => {
  test("outdoor exposes a larger shadow box than studio", () => {
    expect(PRESET_DEFAULTS.outdoor.shadowBox).toBeGreaterThan(PRESET_DEFAULTS.studio.shadowBox);
  });

  test("outdoor exposure is lower to compensate the bright sky", () => {
    expect(PRESET_DEFAULTS.outdoor.exposure).toBeLessThan(PRESET_DEFAULTS.studio.exposure);
  });
});
