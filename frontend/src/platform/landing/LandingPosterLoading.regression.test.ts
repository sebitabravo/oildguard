import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import LandingScene from "./LandingScene";

describe("landing scene poster loading", () => {
  test("prioritizes the above-the-fold hero poster and leaves later posters lazy", () => {
    const hero = renderToString(h(LandingScene, { scene: "assembly" }));
    const later = renderToString(h(LandingScene, { scene: "sensors" }));
    const heroPoster = hero.match(/<img[^>]*class="landing__scene-poster"[^>]*>/)?.[0];
    const laterPoster = later.match(/<img[^>]*class="landing__scene-poster"[^>]*>/)?.[0];

    expect(heroPoster).toBeDefined();
    expect(heroPoster).not.toContain('loading="lazy"');
    expect(heroPoster).toContain('fetchpriority="high"');
    expect(laterPoster).toContain('loading="lazy"');
    expect(laterPoster).not.toContain("fetchpriority");
  });
});
