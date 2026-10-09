import { describe, expect, test } from "bun:test";
import { createPitWorld } from "./pitLayout";
import { P, benchRunM, pitDepthM } from "./pitSpec";
import { marchRamp, stairHeight } from "./pitTerrain";

describe("pit terrain math", () => {
  test("clamps bench height at the surface and full pit depth", () => {
    expect(stairHeight(-1)).toBe(0);
    expect(stairHeight(0)).toBe(0);
    expect(stairHeight(P.bench.count * benchRunM())).toBe(-pitDepthM());
    expect(stairHeight(P.bench.count * benchRunM() + 1)).toBe(-pitDepthM());
  });

  test("keeps each bench face monotonic and ramps through full depth", () => {
    for (let bench = 0; bench < P.bench.count; bench++) {
      const start = bench * benchRunM();
      const faceRun = P.bench.height / Math.tan((P.bench.faceAngle * Math.PI) / 180);
      const heights = [0.1, 0.35, 0.7, 0.95].map((fraction) => stairHeight(start + fraction * faceRun));
      expect(heights.every((height, index) => index === 0 || height < heights[index - 1])).toBe(true);
    }

    const ramp = marchRamp();
    expect(ramp[0]?.h).toBe(0);
    expect(ramp[ramp.length - 1]?.h).toBeCloseTo(-pitDepthM(), 1);
    expect(ramp.slice(20, -20).every((sample) => sample.grade <= 0)).toBe(true);
    expect(Math.max(...ramp.slice(20, -20).map((sample) => Math.abs(sample.grade)))).toBeCloseTo(P.ramp.grade, 2);
  });

  test("seeded terrain stays deterministic at fixed coordinates", () => {
    const first = createPitWorld({ seed: 90210 });
    const second = createPitWorld({ seed: 90210 });
    for (const [x, z] of [[0, 0], [31, -47], [165, 72], [-120, 38]] as const) {
      expect(first.terrain.heightAt(x, z)).toBe(second.terrain.heightAt(x, z));
    }
  });
});
