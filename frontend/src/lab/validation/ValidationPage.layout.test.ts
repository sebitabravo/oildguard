import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./validation.css", import.meta.url), "utf8");

describe("lab validation layout contract", () => {
  test("reduces metric tiles to a readable three-column row on wide screens", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*1500px\)[\s\S]*?\.val-tiles\s*\{[^}]*grid-template-columns:\s*repeat\(3,/);
  });

  test("keeps metric tiles shrinkable within the responsive grid", () => {
    expect(css).toMatch(/\.val-tiles\s+\.og-kpi-tile\s*\{[^}]*min-width:\s*0/);
  });
});
