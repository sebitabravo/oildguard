import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import PressurePlot from "./PressurePlot";

describe("pressure plot mobile layout regression", () => {
  test("constrains the oil data table inside a horizontal scroll region", () => {
    const html = renderToString(h(PressurePlot, {}));

    expect(html).toMatch(/<div class="landing__mount-table-scroll[^\"]*"><table class="landing__mount-table" data-oil-table="true">/);
  });
});
