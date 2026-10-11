import { describe, expect, test } from "bun:test";

declare const Bun: { file(url: URL): { text(): Promise<string> } };
const css = Bun.file(new URL("./validation.css", import.meta.url)).text();

describe("lab validation layout contract", () => {
  test("reduces metric tiles to a readable three-column row on wide screens", async () => {
    expect(/@media\s*\(max-width:\s*1500px\)[\s\S]*?\.val-tiles\s*\{[^}]*grid-template-columns:\s*repeat\(3,/.test(await css)).toBe(true);
  });

  test("keeps metric tiles shrinkable within the responsive grid", async () => {
    expect(/\.val-tiles\s+\.og-kpi-tile\s*\{[^}]*min-width:\s*0/.test(await css)).toBe(true);
  });
});
