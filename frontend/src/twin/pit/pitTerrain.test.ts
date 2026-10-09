import { describe, expect, test } from "bun:test";
import { createPitWorld } from "./pitLayout";
import { P, benchRunM, pitDepthM } from "./pitSpec";
import { bermToeHeights, marchRamp, stairHeight, terrainMeshHeightAt } from "./pitTerrain";

describe("pit terrain math", () => {
  test("seats berm toe just below terrain and buries the lower vertex", () => {
    expect(bermToeHeights(12.5)).toEqual({ exposed: 12.47, buried: 11.5 });
    expect(bermToeHeights(-7.25)).toEqual({ exposed: -7.28, buried: -8.25 });
  });

  test("samples the same triangulated surface used by the rendered terrain", () => {
    const plane = (x: number, z: number) => 2 * x - 3 * z + 4;
    expect(terrainMeshHeightAt(13.4, -21.7, plane)).toBeCloseTo(2 * 13.4 - 3 * -21.7 + 4, 9);
  });

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
