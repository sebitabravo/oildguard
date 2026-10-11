import { describe, expect, test } from "bun:test";

declare const Bun: { file(url: URL): { text(): Promise<string> } };
const page = Bun.file(new URL("../pages/dev/ui.astro", import.meta.url)).text();

describe("developer UI page layout contract", () => {
  test("contains catalogue content within its route-specific wrapper", async () => {
    const content = await page;
    expect(content).toContain('class="dev-ui-page"');
    expect(/\.dev-ui-page\s*\{[^}]*min-width:\s*0/.test(content)).toBe(true);
    expect(/\.dev-ui-page\s+\.og-notice\s*\{[^}]*overflow-wrap:\s*anywhere/.test(content)).toBe(true);
  });
});
