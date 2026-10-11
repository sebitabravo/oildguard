import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("./ui.astro", import.meta.url), "utf8");

describe("developer UI page layout contract", () => {
  test("contains catalogue content within its route-specific wrapper", () => {
    expect(page).toContain('class="dev-ui-page"');
    expect(page).toMatch(/\.dev-ui-page\s*\{[^}]*min-width:\s*0/);
    expect(page).toMatch(/\.dev-ui-page\s+\.og-notice\s*\{[^}]*overflow-wrap:\s*anywhere/);
  });
});
