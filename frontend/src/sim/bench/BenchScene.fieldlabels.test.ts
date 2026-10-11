import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import BenchScene from "./BenchScene";

describe("wheel HUD per-field provenance", () => {
  test("labels the simulated oil level beside its value", () => {
    const markup = renderToString(h(BenchScene, {
      selectedId: null,
      onSelect: () => undefined,
      oilLevel: 0.7,
      viscosityProxy: 1,
      mode: "rest",
      cutaway: false,
      exploded: false,
    }));
    const title = markup.match(/<div class="og-hud__title">[\s\S]*?<\/div>/)?.[0] ?? "";
    expect(title).toContain("66,5 L · 70%");
    expect(/og-badge--source-demo[\s\S]*?DEMO/.test(title)).toBe(true);
  });
});
