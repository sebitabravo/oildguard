import { describe, expect, test } from "bun:test";

declare const Bun: { file(url: URL): { text(): Promise<string> } };
const css = Bun.file(new URL("./alerts.css", import.meta.url)).text();

describe("alerts inbox layout contract", () => {
  test("reflows summary tiles before their labels become cramped", async () => {
    expect(/@media\s*\(max-width:\s*1100px\)\s*\{\s*\.og-alerts-tiles\s*\{[^}]*grid-template-columns:\s*repeat\(3,/.test(await css)).toBe(true);
  });

  test("allows mixed-source badges to wrap inside their tile", async () => {
    expect(/\.og-alerts-source-split\s*\{[^}]*flex-wrap:\s*wrap/.test(await css)).toBe(true);
  });
});
