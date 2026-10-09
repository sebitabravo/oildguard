import { describe, expect, test } from "bun:test";
import { shovelPose } from "./shovel";

describe("shovel cycle pose", () => {
  test("wraps negative and positive times into one repeatable cycle", () => {
    expect(shovelPose(-0.1).pitchDeg).toBeCloseTo(shovelPose(0.9).pitchDeg, 8);
    expect(shovelPose(-0.1).crowd).toBeCloseTo(shovelPose(0.9).crowd, 8);
    expect(shovelPose(1.25).pitchDeg).toBeCloseTo(shovelPose(0.25).pitchDeg, 8);
  });

  test("opens the dipper door only during its dump window", () => {
    expect(shovelPose(0.1).doorDeg).toBe(0);
    expect(shovelPose(0.62).doorDeg).toBeGreaterThan(65);
    expect(shovelPose(0.9).doorDeg).toBe(0);
  });
});
