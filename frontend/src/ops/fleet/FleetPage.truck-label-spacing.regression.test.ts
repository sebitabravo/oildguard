import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import FleetPage from "./FleetPage";

describe("fleet truck count spacing regression", () => {
  test("separates the truck count from its translated label", () => {
    const html = renderToString(h(FleetPage, {}));

    expect(html).toMatch(/<div class="og-kpi-tile__value">\d+ <small>camiones<\/small>/);
  });
});
