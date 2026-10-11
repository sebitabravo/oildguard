import { describe, expect, test } from "bun:test";
import { createGearOutline, generateGearGeometry } from "./gears";

describe("parametric gear geometry", () => {
  test("rejects non-finite and non-positive radii", () => {
    const invalidRadii: ReadonlyArray<readonly [number, number]> = [
      [Number.NaN, 2],
      [1, Number.NaN],
      [Number.POSITIVE_INFINITY, 2],
      [1, Number.POSITIVE_INFINITY],
      [0, 2],
      [-1, 2],
      [1, 0],
      [1, -1],
    ];

    for (const [rootRadius, tipRadius] of invalidRadii) {
      expect(() => createGearOutline(8, rootRadius, tipRadius)).toThrow();
    }
  });

  test("generates the requested number of tooth tips and closes the outline", () => {
    const teeth = 18;
    const outline = createGearOutline(teeth, 0.42, 0.5);

    expect(outline.length).toBe(teeth * 4 + 1);
    expect(outline[0]).toEqual(outline[outline.length - 1]);
    expect(outline.slice(0, -1).filter((point) => Math.abs(Math.hypot(point.x, point.y) - 0.5) < 1e-9).length).toBe(teeth * 2);
  });

  test("emits a finite, non-empty extruded mesh", () => {
    const geometry = generateGearGeometry({ teeth: 24, rootRadius: 0.56, tipRadius: 0.64, width: 0.18 });
    const positions = geometry.getAttribute("position");

    expect(positions.count).toBeGreaterThan(0);
    for (let i = 0; i < positions.count; i += 1) {
      expect(Number.isFinite(positions.getX(i))).toBe(true);
      expect(Number.isFinite(positions.getY(i))).toBe(true);
      expect(Number.isFinite(positions.getZ(i))).toBe(true);
    }
    expect(geometry.index?.count).toBeGreaterThan(0);
  });
});
