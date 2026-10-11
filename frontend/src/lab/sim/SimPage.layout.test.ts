import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./sim.css", import.meta.url), "utf8");

describe("lab simulation layout contract", () => {
  test("stacks parameter labels when the simulation panel is narrow", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*1180px\)[\s\S]*?\.sim-page__fields\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });
});
