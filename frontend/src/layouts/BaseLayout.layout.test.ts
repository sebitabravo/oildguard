import { describe, expect, test } from "bun:test";

declare const Bun: { file(url: URL): { text(): Promise<string> } };
const css = Bun.file(new URL("../theme.css", import.meta.url)).text();

describe("mobile shell breadcrumb layout", () => {
  test("wraps breadcrumb labels instead of clipping them on narrow screens", async () => {
    const source = await css;
    const mobileRule = source.match(/@media\s*\(max-width:\s*480px\)[\s\S]*?\.og-top__crumb\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(/flex-wrap:\s*wrap/.test(mobileRule)).toBe(true);
    expect(/white-space:\s*normal/.test(mobileRule)).toBe(true);
    expect(/overflow:\s*hidden/.test(mobileRule)).toBe(false);
  });
});
