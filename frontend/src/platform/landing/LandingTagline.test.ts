import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import Landing from "./Landing";

describe("landing tagline", () => {
  test("renders the full Spanish claim as individually addressable words", () => {
    const html = renderToString(h(Landing, {}));

    expect(html).toContain("Presión, temperatura y vibración estiman el nivel y la condición del lubricante.");
    expect(html).toContain('class="landing__tagline-word"');
    expect(html).toContain('aria-label="Presión, temperatura y vibración estiman el nivel y la condición del lubricante."');
  });
});
