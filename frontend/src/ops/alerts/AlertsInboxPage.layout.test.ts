import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./alerts.css", import.meta.url), "utf8");

describe("alerts inbox layout contract", () => {
  test("reflows summary tiles before their labels become cramped", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*1100px\)\s*\{\s*\.og-alerts-tiles\s*\{[^}]*grid-template-columns:\s*repeat\(3,/);
  });

  test("allows mixed-source badges to wrap inside their tile", () => {
    expect(css).toMatch(/\.og-alerts-source-split\s*\{[^}]*flex-wrap:\s*wrap/);
  });
});
