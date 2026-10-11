import { describe, expect, test } from "bun:test";
import { dict, t } from "./index";

declare const Bun: {
  Glob: new (pattern: string) => { scanSync(): Iterable<string> };
  file(path: string): { text(): Promise<string> };
};

describe("i18n copy migration", () => {
  test("dictionary copy keeps the Spanish honesty markers", () => {
    // Sin rama inglesa que comparar (S02): cada marcador de honestidad debe
    // aparecer en la copia española.
    const markers = [
      /sintétic[oa]s?/i,
      /SUSTITUTO SINTÉTICO/i,
      /SUPUESTO/i,
      /NO PROBADO/i,
      /sustituto/i,
    ];
    const copy = Object.values(dict).join("\n");
    const missing = markers
      .filter((marker) => !marker.test(copy))
      .map((marker) => `missing ${marker.source}`);

    expect(missing).toEqual([]);
  });

  test("parameterized mine captions interpolate fleet counts and the actual seed", () => {
    const fleet = t("mine.hud.fleet", { trucks: 5, queued: 0 });
    const seeded = t("mine.hud.seeded", { seed: 7 });

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
