import { describe, expect, test } from "bun:test";
import { chartFrame, confidenceBand, evenPositions, niceTicks, percentAlong, percentFromTop, scaledPoints, monotoneCurvePath, nextCursorIndex } from "./chartGeometry";

describe("chart geometry", () => {
  test("keeps axes inside a padded frame", () => {
    const frame = chartFrame(360, 180);
    const points = scaledPoints([0, 10], frame.width, frame.height, frame.padding);
    expect(points[0]?.x).toBe(frame.padding.left);
    expect(points[1]?.x).toBe(frame.width - frame.padding.right);
    expect(points[0]?.y).toBe(frame.height - frame.padding.bottom);
    expect(points[1]?.y).toBe(frame.padding.top);
  });
});

describe("axis ticks", () => {
  test("generates round ascending ticks inside the domain", () => {
    expect(niceTicks(0, 95)).toEqual([0, 25, 50, 75]);
    expect(niceTicks(60, 85)).toEqual([60, 70, 80]);
    const ticks = niceTicks(0.1, 0.9, 4);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks.every((tick, index) => tick >= 0.1 && tick <= 0.9 && (index === 0 || tick > ticks[index - 1]))).toBe(true);
  });

  test("handles degenerate and invalid domains", () => {
    expect(niceTicks(5, 5)).toEqual([5]);
    expect(niceTicks(Number.NaN, 5)).toEqual([]);
  });

  test("maps values and labels to percentages of the plot area", () => {
    expect(percentFromTop(95, 0, 95)).toBe(0);
    expect(percentFromTop(0, 0, 95)).toBe(100);
    expect(evenPositions(3)).toEqual([0, 50, 100]);
    expect(evenPositions(1)).toEqual([0]);
    expect(percentAlong(2, 5)).toBe(50);
  });

  test("keeps the band on the same domain as the line", () => {
    const band = confidenceBand([10, 20], [1, 1], 100, 100, { left: 0, right: 0, top: 0, bottom: 0 }, [0, 40]);
    expect(Math.max(...band.map((point) => point.y))).toBeCloseTo(100 - 9 / 40 * 100);
  });
});

describe("synchronized chart interaction geometry", () => {
  test("creates monotone cubic paths without changing sample order", () => {
    const path = monotoneCurvePath([
      { x: 0, y: 10 },
      { x: 1, y: 8 },
      { x: 2, y: 9 },
      { x: 3, y: 5 },
    ]);
    expect(path.startsWith("M 0 10")).toBe(true);
    expect(path).toContain(" C ");
    expect(path.endsWith("3 5")).toBe(true);
  });

  test("moves an accessible cursor within the sample range", () => {
    expect(nextCursorIndex(1, "ArrowRight", 4)).toBe(2);
    expect(nextCursorIndex(1, "ArrowLeft", 4)).toBe(0);
    expect(nextCursorIndex(1, "Home", 4)).toBe(0);
    expect(nextCursorIndex(1, "End", 4)).toBe(3);
    expect(nextCursorIndex(3, "ArrowRight", 4)).toBe(3);
    expect(nextCursorIndex(2, "Escape", 4)).toBe(2);
    expect(nextCursorIndex(0, "ArrowRight", 0)).toBe(-1);
  });
});
