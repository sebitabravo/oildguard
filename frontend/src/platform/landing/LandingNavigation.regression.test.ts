import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import Landing from "./Landing";

describe("landing section navigation", () => {
  test("does not mark the approach link current while the intro beat is active", () => {
    const html = renderToString(h(Landing, {}));
    const approachLink = html.match(/<a[^>]*href="#approach"[^>]*>/)?.[0];

    expect(approachLink).toBeDefined();
    expect(approachLink).not.toContain("aria-current");
  });
});
