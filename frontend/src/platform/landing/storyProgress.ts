// Progreso reversible del relato (B08): el scroll nativo manda y el
// módulo solo calcula beat, escena y cámara, sin dirigir el scroll.
import type { BeatId } from "./beats";
import type { LandingSceneId } from "./sceneHost";
import { CYCLE_TOTAL } from "../../sim/truck/cycle";

// El scroll siempre es nativo: este módulo no toca el DOM ni la rueda.
export const STORY_SCROLL_CONTRACT = "native" as const;

export type StoryBeatRange = {
  readonly id: BeatId;
  readonly top: number;
  readonly bottom: number;
};

// Qué escena acompaña a cada beat; null deja el beat sin 3D propio.
export const SCENE_FOR_BEAT: Record<BeatId, LandingSceneId | null> = {
  intro: "assembly",
  problem: null,
  regimes: "cycle",
  sensing: "sensors",
  pipeline: null,
  response: null,
  evidence: "oil",
  scope: null,
};

export function sceneForBeat(beat: BeatId): LandingSceneId | null {
  const scene = SCENE_FOR_BEAT[beat];
  if (scene === undefined) throw new Error(`Unknown story beat: ${String(beat)}`);
  return scene;
}

// Sujeta el progreso a 0..1 para que los gestos rápidos no salten.
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value === Number.POSITIVE_INFINITY) return 1;
  if (value === Number.NEGATIVE_INFINITY) return 0;
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function assertRanges(ranges: readonly StoryBeatRange[]): void {
  if (ranges.length === 0) throw new Error("Story needs at least one beat range");
  for (const range of ranges) {
    if (!Number.isFinite(range.top) || !Number.isFinite(range.bottom)) {
      throw new Error(`Story range for ${range.id} needs finite edges`);
    }
  }
  for (let index = 1; index < ranges.length; index += 1) {
    if (ranges[index].top < ranges[index - 1].top) {
      throw new Error("Story ranges must be sorted by top edge");
    }
  }
}

// El centro del viewport decide el beat activo: función pura del scroll,
// así avanzar y retroceder por el mismo punto dan el mismo beat.
export function resolveActiveBeatIndex(
  centerY: number,
  ranges: readonly StoryBeatRange[],
): number {
  if (!Number.isFinite(centerY)) throw new Error("Story center must be finite");
  assertRanges(ranges);
  for (let index = 0; index < ranges.length; index += 1) {
    if (centerY < ranges[index].bottom) return index;
  }
  return ranges.length - 1;
}

// Progreso dentro del beat, sujeto para gestos rápidos y rebotes.
export function resolveBeatProgress(centerY: number, range: StoryBeatRange): number {
  if (!Number.isFinite(centerY)) throw new Error("Story center must be finite");
  if (!Number.isFinite(range.top) || !Number.isFinite(range.bottom)) {
    throw new Error(`Story range for ${range.id} needs finite edges`);
  }
  if (range.bottom <= range.top) return 0;
  return clamp01((centerY - range.top) / (range.bottom - range.top));
}

export type StoryState = {
  readonly activeIndex: number;
  readonly activeBeat: BeatId;
  readonly progress: number;
  readonly scene: LandingSceneId | null;
};

// Estado completo del relato desde el scroll: reversible porque solo
// depende de scrollY y del viewport, nunca de la dirección previa.
export function resolveStoryState(
  scrollY: number,
  viewportHeight: number,
  ranges: readonly StoryBeatRange[],
): StoryState {
  if (!Number.isFinite(scrollY)) throw new Error("Story scroll must be finite");
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    throw new Error("Story viewport must be a finite height above zero");
  }
  const centerY = scrollY + viewportHeight / 2;
  const activeIndex = resolveActiveBeatIndex(centerY, ranges);
  const activeBeat = ranges[activeIndex].id;
  return {
    activeIndex,
    activeBeat,
    progress: resolveBeatProgress(centerY, ranges[activeIndex]),
    scene: sceneForBeat(activeBeat),
  };
}

export type StoryCamera = {
  readonly azimuth: number;
  readonly polar: number;
  readonly distance: number;
};

// Recorrido de cámara del corte dentro de sus límites: interpola con el
// progreso para que el gesto rápido no produzca saltos.
export const STORY_CAM_AZIMUTH_START = 0.25;
export const STORY_CAM_AZIMUTH_END = 1.05;
export const STORY_CAM_POLAR = 1.1;
export const STORY_CAM_DISTANCE_START = 7.5;
export const STORY_CAM_DISTANCE_END = 5.5;

export function assemblyCameraForProgress(progress: number): StoryCamera {
  const clamped = clamp01(progress);
  return {
    azimuth: STORY_CAM_AZIMUTH_START + clamped * (STORY_CAM_AZIMUTH_END - STORY_CAM_AZIMUTH_START),
    polar: STORY_CAM_POLAR,
    distance:
      STORY_CAM_DISTANCE_START +
      clamped * (STORY_CAM_DISTANCE_END - STORY_CAM_DISTANCE_START),
  };
}

// El ciclo se lee sobre su reloj de 29 s: el progreso mapea lineal al
// tiempo del loop, reversible en ambos sentidos.
export function cycleElapsedForProgress(progress: number, total: number = CYCLE_TOTAL): number {
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Cycle total must be finite seconds above zero");
  }
  return clamp01(progress) * total;
}
