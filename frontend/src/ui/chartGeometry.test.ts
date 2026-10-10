import { describe, expect, test } from "bun:test";
import { chartFrame, scaledPoints } from "./chartGeometry";

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
