import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { BEATS, type BeatId } from "./beats";
import { ASSEMBLY_VIEW_LIMITS } from "./scenes/assembly";
import { CYCLE_TOTAL } from "../../sim/truck/cycle";
import * as storyProgressModule from "./storyProgress";
import {
  SCENE_FOR_BEAT,
  STORY_CAM_AZIMUTH_END,
  STORY_CAM_AZIMUTH_START,
  STORY_CAM_DISTANCE_END,
  STORY_CAM_DISTANCE_START,
  STORY_CAM_POLAR,
  STORY_SCROLL_CONTRACT,
  assemblyCameraForProgress,
  clamp01,
  cycleElapsedForProgress,
  resolveActiveBeatIndex,
  resolveBeatProgress,
  resolveStoryState,
  sceneForBeat,
  type StoryBeatRange,
} from "./storyProgress";
import Landing from "./Landing";

// El relato coordina beat, escena y cámara sobre scroll nativo reversible,
// sin secuestrar la rueda: el mismo scroll da el mismo estado en ambos sentidos.
const RANGES: readonly StoryBeatRange[] = [
  { id: "intro", top: 0, bottom: 800 },
  { id: "problem", top: 800, bottom: 1600 },
  { id: "regimes", top: 1600, bottom: 2400 },
  { id: "sensing", top: 2400, bottom: 3200 },
  { id: "pipeline", top: 3200, bottom: 4000 },
  { id: "response", top: 4000, bottom: 4800 },
  { id: "evidence", top: 4800, bottom: 5600 },
  { id: "scope", top: 5600, bottom: 6400 },
];

function centerFor(scrollY: number, viewport = 800): number {
  return scrollY + viewport / 2;
}

describe("storyProgress beat and scene agreement", () => {
  test("maps every beat to its story scene without inventing scenes", () => {
    expect(BEATS.map((beat) => beat.id)).toEqual([
      "intro",
      "problem",
      "regimes",
      "sensing",
      "pipeline",
      "response",
      "evidence",
      "scope",
    ]);
    expect(sceneForBeat("intro")).toBe("assembly");
    expect(sceneForBeat("regimes")).toBe("cycle");
    expect(sceneForBeat("sensing")).toBe("sensors");
    expect(sceneForBeat("evidence")).toBe("oil");
    expect(sceneForBeat("problem")).toBe(null);
    expect(sceneForBeat("pipeline")).toBe(null);
    expect(sceneForBeat("response")).toBe(null);
    expect(sceneForBeat("scope")).toBe(null);
    expect(SCENE_FOR_BEAT["intro"]).toBe("assembly");
    expect(() => sceneForBeat("unknown" as unknown as BeatId)).toThrow();
  });

  test("clamps progress so fast gestures never jump outside 0..1", () => {
    expect(clamp01(-40)).toBe(0);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(40)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(1);
    expect(clamp01(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  test("resolves the beat containing the viewport center and clamps at the edges", () => {
    expect(resolveActiveBeatIndex(centerFor(0), RANGES)).toBe(0);
    expect(resolveActiveBeatIndex(centerFor(400), RANGES)).toBe(1);
    expect(resolveActiveBeatIndex(centerFor(800), RANGES)).toBe(1);
    expect(resolveActiveBeatIndex(centerFor(6000), RANGES)).toBe(7);
    expect(resolveActiveBeatIndex(-2000, RANGES)).toBe(0);
    expect(resolveActiveBeatIndex(20000, RANGES)).toBe(7);
    expect(() => resolveActiveBeatIndex(100, [])).toThrow();
    expect(() => resolveActiveBeatIndex(Number.NaN, RANGES)).toThrow();
  });

  test("reports beat progress clamped at both edges with degenerate ranges held at zero", () => {
    expect(resolveBeatProgress(400, RANGES[0])).toBe(0.5);
    expect(resolveBeatProgress(-500, RANGES[0])).toBe(0);
    expect(resolveBeatProgress(5000, RANGES[0])).toBe(1);
    expect(resolveBeatProgress(100, { id: "intro", top: 200, bottom: 200 })).toBe(0);
    expect(() => resolveBeatProgress(Number.NaN, RANGES[0])).toThrow();
  });

  test("keeps story state in agreement: active beat, progress, and scene match", () => {
    const state = resolveStoryState(0, 800, RANGES);
    expect(state.activeBeat).toBe("intro");
    expect(state.activeIndex).toBe(0);
    expect(state.scene).toBe("assembly");
    expect(state.progress).toBeCloseTo(0.5, 9);
    const sensing = resolveStoryState(2000, 800, RANGES);
    expect(sensing.activeBeat).toBe("sensing");
    expect(sensing.scene).toBe("sensors");
    const tail = resolveStoryState(6000, 800, RANGES);
    expect(tail.activeBeat).toBe("scope");
    expect(tail.scene).toBe(null);
    expect(() => resolveStoryState(0, 0, RANGES)).toThrow();
    expect(() => resolveStoryState(Number.NaN, 800, RANGES)).toThrow();
  });

  test("is reversible: the same scroll resolves the same state forward and in reverse", () => {
    const scrolls = [0, 350, 800, 1450, 2100, 3000, 4200, 5200, 6000];
    const forward = scrolls.map((scrollY) => resolveStoryState(scrollY, 800, RANGES));
    const reverse = [...scrolls].reverse().map((scrollY) => resolveStoryState(scrollY, 800, RANGES));
    expect([...reverse].reverse()).toEqual(forward);
    for (const scrollY of scrolls) {
      const first = resolveStoryState(scrollY, 800, RANGES);
      const second = resolveStoryState(scrollY, 800, RANGES);
      expect(second).toEqual(first);
    }
  });

  test("absorbs fast gestures: a full jump lands on the edge beat without throwing", () => {
    const top = resolveStoryState(-1000, 800, RANGES);
    expect(top.activeIndex).toBe(0);
    expect(top.progress).toBe(0);
    const bottom = resolveStoryState(30000, 800, RANGES);
    expect(bottom.activeIndex).toBe(RANGES.length - 1);
    expect(bottom.progress).toBe(1);
    const jumpForward = resolveStoryState(6000, 800, RANGES);
    const jumpBack = resolveStoryState(0, 800, RANGES);
    expect(jumpForward.activeBeat).toBe("scope");
    expect(jumpBack.activeBeat).toBe("intro");
    expect(jumpBack.progress).toBeCloseTo(0.5, 9);
  });

  test("advances monotonically through consecutive scroll positions", () => {
    let previous = -1;
    for (let scrollY = -400; scrollY <= 6800; scrollY += 100) {
      const state = resolveStoryState(scrollY, 800, RANGES);
      expect(state.activeIndex).toBeGreaterThanOrEqual(previous);
      previous = state.activeIndex;
    }
  });
});

describe("storyProgress camera agreement", () => {
  test("interpolates the assembly camera inside its view limits with no jumps", () => {
    const start = assemblyCameraForProgress(0);
    const end = assemblyCameraForProgress(1);
    expect(start.azimuth).toBeCloseTo(STORY_CAM_AZIMUTH_START, 9);
    expect(end.azimuth).toBeCloseTo(STORY_CAM_AZIMUTH_END, 9);
    expect(start.polar).toBe(STORY_CAM_POLAR);
    expect(end.polar).toBe(STORY_CAM_POLAR);
    expect(start.distance).toBeCloseTo(STORY_CAM_DISTANCE_START, 9);
    expect(end.distance).toBeCloseTo(STORY_CAM_DISTANCE_END, 9);
    for (const progress of [0, 0.25, 0.5, 0.75, 1, -3, 42]) {
      const camera = assemblyCameraForProgress(progress);
      expect(camera.distance).toBeGreaterThanOrEqual(ASSEMBLY_VIEW_LIMITS.minDistance);
      expect(camera.distance).toBeLessThanOrEqual(ASSEMBLY_VIEW_LIMITS.maxDistance);
      expect(camera.polar).toBeGreaterThanOrEqual(ASSEMBLY_VIEW_LIMITS.minPolarAngle);
      expect(camera.polar).toBeLessThanOrEqual(ASSEMBLY_VIEW_LIMITS.maxPolarAngle);
    }
    const mid = assemblyCameraForProgress(0.5);
    expect(mid.azimuth).toBeGreaterThan(start.azimuth);
    expect(mid.azimuth).toBeLessThan(end.azimuth);
    expect(mid.distance).toBeLessThan(start.distance);
    expect(mid.distance).toBeGreaterThan(end.distance);
    expect(assemblyCameraForProgress(0.5)).toEqual(assemblyCameraForProgress(0.5));
    expect(assemblyCameraForProgress(-5).distance).toBe(start.distance);
    expect(assemblyCameraForProgress(5).distance).toBe(end.distance);
  });

  test("keeps camera steps bounded so scrubbing cannot jump", () => {
    const samples = 64;
    let maxAzimuthStep = 0;
    let maxDistanceStep = 0;
    let previous = assemblyCameraForProgress(0);
    for (let step = 1; step <= samples; step += 1) {
      const next = assemblyCameraForProgress(step / samples);
      maxAzimuthStep = Math.max(maxAzimuthStep, Math.abs(next.azimuth - previous.azimuth));
      maxDistanceStep = Math.max(maxDistanceStep, Math.abs(next.distance - previous.distance));
      previous = next;
    }
    expect(maxAzimuthStep).toBeLessThanOrEqual(
      Math.abs(STORY_CAM_AZIMUTH_END - STORY_CAM_AZIMUTH_START) / samples + 1e-9,
    );
    expect(maxDistanceStep).toBeLessThanOrEqual(
      Math.abs(STORY_CAM_DISTANCE_END - STORY_CAM_DISTANCE_START) / samples + 1e-9,
    );
  });

  test("maps scroll progress linearly onto the haul-cycle clock, reversibly", () => {
    expect(CYCLE_TOTAL).toBe(29);
    expect(cycleElapsedForProgress(0)).toBe(0);
    expect(cycleElapsedForProgress(1)).toBe(CYCLE_TOTAL);
    expect(cycleElapsedForProgress(0.5)).toBeCloseTo(CYCLE_TOTAL / 2, 9);
    expect(cycleElapsedForProgress(-2)).toBe(0);
    expect(cycleElapsedForProgress(2)).toBe(CYCLE_TOTAL);
    expect(cycleElapsedForProgress(0.25)).toEqual(cycleElapsedForProgress(0.25));
    expect(() => cycleElapsedForProgress(0.5, 0)).toThrow();
  });
});

describe("storyProgress native scroll contract", () => {
  test("keeps native scroll and exposes no scroll-hijack control", () => {
    expect(STORY_SCROLL_CONTRACT).toBe("native");
    const exports = storyProgressModule as unknown as Record<string, unknown>;
    expect(exports["scrollTo"]).toBe(undefined);
    expect(exports["scrollIntoView"]).toBe(undefined);
    expect(exports["hijackScroll"]).toBe(undefined);
    expect(exports["onWheel"]).toBe(undefined);
    expect(exports["handleWheel"]).toBe(undefined);
    expect("hijackScroll" in storyProgressModule).toBe(false);
  });

  test("landing keeps native anchors with per-beat sections and no wheel hijack", () => {
    const html = renderToString(h(Landing, {}));
    for (const beat of BEATS) {
      expect(html.includes(`data-beat="${beat.id}"`)).toBe(true);
    }
    expect(html.includes("data-active-beat")).toBe(true);
    expect(html.includes("onWheel")).toBe(false);
  });
});
