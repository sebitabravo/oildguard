import { describe, expect, test } from "bun:test";
import { clampLabelCenterX } from "./labelLayout";

describe("clampLabelCenterX", () => {
  test("preserves the preferred center when the label already fits", () => {
    expect(clampLabelCenterX(200, 100, 0.5, 0, 390)).toBe(0.5);
  });

  test("moves a right-clipped label left without clipping its right edge", () => {
    const center = clampLabelCenterX(386.856, 150.11, 0.5, 0, 390);

    expect(center).toBeCloseTo(0.979, 3);
    expect(386.856 - center * 150.11).toBeGreaterThanOrEqual(0);
    expect(386.856 + (1 - center) * 150.11).toBeCloseTo(390, 3);
  });

  test("clamps a sensor label to the least-shifted position that fits", () => {
    const center = clampLabelCenterX(241.6, 256.11, 0, 0, 390);

    expect(center).toBeCloseTo(0.42056, 4);
    expect(241.6 - center * 256.11).toBeGreaterThanOrEqual(0);
    expect(241.6 + (1 - center) * 256.11).toBeCloseTo(390, 3);
  });
});
