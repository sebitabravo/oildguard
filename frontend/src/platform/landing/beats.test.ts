import { describe, expect, test } from "bun:test";
import { dict } from "../../i18n";
import {
  BEATS,
  MAX_BEAT_TOTAL_WORDS,
  MAX_BEAT_WORDS,
  beatById,
  countWords,
  type BeatId,
} from "./beats";

// El orden canónico del arco narrativo: ocho beats con una idea cada uno.
const EXPECTED_BEAT_ORDER: readonly BeatId[] = [
  "intro",
  "problem",
  "regimes",
  "sensing",
  "pipeline",
  "response",
  "evidence",
  "scope",
];

// Solo español (S05): la copia de cada beat es la española del diccionario.
function beatCopy(beatId: BeatId): string {
  const beat = beatById(beatId);
  return `${dict[beat.titleKey]} ${dict[beat.bodyKey]}`;
}

describe("landing beats", () => {
  test("defines exactly eight beats with one idea each", () => {
    expect(BEATS.map((beat) => beat.id)).toEqual([...EXPECTED_BEAT_ORDER]);
  });

  test("keeps anchors and dictionary keys unique", () => {
    expect(new Set(BEATS.map((beat) => beat.anchor)).size).toBe(BEATS.length);
    expect(new Set(BEATS.map((beat) => beat.titleKey)).size).toBe(BEATS.length);
    expect(new Set(BEATS.map((beat) => beat.bodyKey)).size).toBe(BEATS.length);
  });

  test("resolves every beat key to non-empty Spanish copy", () => {
    for (const beat of BEATS) {
      for (const key of [beat.titleKey, beat.bodyKey] as const) {
        expect(dict[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("keeps every beat within two screens of copy", () => {
    for (const beat of BEATS) {
      expect(countWords(beatCopy(beat.id))).toBeLessThanOrEqual(MAX_BEAT_WORDS);
    }
  });

  test("keeps the full arc near twelve screens", () => {
    const total = BEATS.reduce((sum, beat) => sum + countWords(beatCopy(beat.id)), 0);
    expect(total).toBeLessThanOrEqual(MAX_BEAT_TOTAL_WORDS);
  });

  test("carries no maturity-number claim", () => {
    const maturity = /\bTRL\b|readiness level|nivel de madurez/i;
    for (const beat of BEATS) {
      expect(maturity.test(beatCopy(beat.id))).toBe(false);
    }
  });

  test("keeps a non-marketing tone", () => {
    const hype =
      /\b(revolutionary|cutting-edge|game-chang|world-class|best-in-class|guaranteed|seamless|unlock|supercharg|disruptive|revolucionario|garantizado|sin precedentes)\b/i;
    for (const beat of BEATS) {
      const copy = beatCopy(beat.id);
      expect(hype.test(copy)).toBe(false);
      expect(copy.includes("!")).toBe(false);
    }
  });

  test("resolves every beat by id", () => {
    for (const id of EXPECTED_BEAT_ORDER) {
      expect(beatById(id).id).toBe(id);
    }
  });
});
