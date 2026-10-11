import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import Landing from "./Landing";

describe("landing responsive layout", () => {
  test("wraps the hardware table in a scroll region with a visible cue", () => {
    const html = renderToString(h(Landing, {}));

    expect(html.includes('class="landing__mount-table-wrap"')).toBe(true);
    expect(html.includes('class="landing__mount-table-scroll"')).toBe(true);
    expect(html.includes('class="landing__mount-table-cue"')).toBe(true);
  });
});
