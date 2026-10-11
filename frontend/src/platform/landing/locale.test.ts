import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { dict } from "../../i18n";
import Landing from "./Landing";
import { BEATS } from "./beats";

// Solo español (S05): el respaldo de idioma lo fija el contrato esOnly;
// aquí solo se verifica el render español.

describe("landing locale", () => {
  test("every beat carries complete Spanish copy", () => {
    for (const beat of BEATS) {
      for (const key of [beat.titleKey, beat.bodyKey] as const) {
        expect(dict[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("the default render is Spanish", () => {
    const html = renderToString(h(Landing, {}));
    expect(html.includes(dict["landing.heroTitle"])).toBe(true);
  });

  test("all eight beats render pre-hydration with their Spanish headings", () => {
    const html = renderToString(h(Landing, {}));
    for (const beat of BEATS) {
      expect(html.includes(`data-beat="${beat.id}"`)).toBe(true);
      expect(html.includes(`id="${beat.anchor}"`)).toBe(true);
      expect(html.includes(dict[beat.titleKey])).toBe(true);
      expect(html.includes(dict[beat.bodyKey])).toBe(true);
    }
  });

  test("serves Spanish with native anchors and no language switcher", () => {
    const html = renderToString(h(Landing, {}));
    expect(html.includes("?lang=")).toBe(false);
    expect(html.includes("hreflang=")).toBe(false);
  });
});
