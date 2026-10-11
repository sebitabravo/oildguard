import { describe, expect, test } from "bun:test";

declare const Bun: { file(url: URL): { text(): Promise<string> } };
const css = Bun.file(new URL("./sim.css", import.meta.url)).text();

describe("lab simulation layout contract", () => {
  test("stacks parameter labels when the simulation panel is narrow", async () => {
    expect(/@media\s*\(max-width:\s*1180px\)[\s\S]*?\.sim-page__fields\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(await css)).toBe(true);
  });
});
