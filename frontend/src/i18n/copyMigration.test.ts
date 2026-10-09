import { describe, expect, test } from "bun:test";
import { dict, t } from "./index";

declare const Bun: {
  Glob: new (pattern: string) => { scanSync(): Iterable<string> };
  file(path: string): { text(): Promise<string> };
};

describe("i18n copy migration", () => {
  test("dictionary copy preserves matching honesty markers in Spanish", () => {
    const markers = [
      { en: /synthetic/i, es: /sintétic[oa]s?/i },
      { en: /SYNTHETIC-PROXY/i, es: /SUSTITUTO SINTÉTICO/i },
      { en: /ASSUMPTION/i, es: /SUPUESTO/i },
      { en: /UNPROVEN/i, es: /NO PROBADO/i },
      { en: /proxy/i, es: /sustituto/i },
    ];
    const violations = Object.entries(dict).flatMap(([key, copy]) =>
      markers
        .filter((marker) => marker.en.test(copy.en) && !marker.es.test(copy.es))
        .map((marker) => `${key}: ${marker.en.source} is missing ${marker.es.source}`),
    );

    expect(violations).toEqual([]);
  });

  test("parameterized mine captions interpolate fleet counts and the actual seed", () => {
    const fleet = t("mine.hud.fleet", "es", { trucks: 5, queued: 0 });
    const seeded = t("mine.hud.seeded", "es", { seed: 7 });

    expect(fleet).toBe("5 camiones · 0 en cola · PLM III · sustituto sintético, datos de campo pendientes");
    expect(seeded.includes("semilla 7")).toBe(true);
    expect(seeded.includes("?seed=")).toBe(false);
  });

  test("TSX components do not embed Spanish-copy ternaries", async () => {
    const files = new Bun.Glob("src/**/*.tsx").scanSync();
    const violations: string[] = [];
    const copyTernary = /\blang\s*===\s*["']es["']\s*\?|\bes\s*\?/g;

    for (const file of files) {
      const source = await Bun.file(file).text();
      for (const match of source.matchAll(copyTernary)) {
        const line = source.slice(0, match.index).split("\n").length;
        violations.push(`${file}:${line}: ${source.split("\n")[line - 1].trim()}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
