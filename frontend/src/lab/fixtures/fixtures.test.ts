import { describe, expect, test } from "bun:test";
import scenarios from "./scenarios.json";
import validation from "./validation.json";

declare const Bun: { file(path: URL): { text(): Promise<string> } };

interface GoldenCase { scenario: string; seed: number; rows: string[][] }
interface Golden { header: string[]; cases: GoldenCase[] }

async function loadGolden(): Promise<Golden> {
  const url = new URL("../../../../tests/fixtures/generator_golden.json", import.meta.url);
  return JSON.parse(await Bun.file(url).text()) as Golden;
}

describe("lab fixtures", () => {
  test("scenarios.json keeps every golden row, column and seed", async () => {
    const golden = await loadGolden();
    expect(Object.keys(scenarios.scenarios)).toEqual(golden.cases.map((item) => item.scenario));
    for (const item of golden.cases) {
      const fixture = scenarios.scenarios[item.scenario as keyof typeof scenarios.scenarios];
      expect(fixture.seed).toBe(item.seed);
      expect(fixture.rows.length).toBe(item.rows.length);
      scenarios.columns.forEach((column, columnIndex) => {
        const goldenIndex = golden.header.indexOf(column);
        for (let rowIndex = 0; rowIndex < item.rows.length; rowIndex += 1) {
          const expected = item.rows[rowIndex][goldenIndex];
          const actual = fixture.rows[rowIndex][columnIndex];
          if (typeof actual === "string") expect(actual).toBe(expected);
          else expect(actual).toBe(Number(expected));
        }
      });
    }
  });

  test("validation.json truth matches the golden ground-truth level", async () => {
    const golden = await loadGolden();
    const levelIndex = golden.header.indexOf("level_liters");
    for (const item of golden.cases) {
      const fixture = validation.scenarios[item.scenario as keyof typeof validation.scenarios];
      expect(fixture.points.length).toBe(item.rows.length);
      fixture.points.forEach((point, index) => {
        expect(point[2]).toBe(Number(item.rows[index][levelIndex]));
      });
    }
  });

  test("validation.json estimates exist only on rest rows", () => {
    for (const fixture of Object.values(validation.scenarios)) {
      for (const point of fixture.points) {
        expect(point[1] === null).toBe(point[3] !== 1);
      }
      expect(fixture.sigma_l).toBeGreaterThan(0);
    }
  });
});
