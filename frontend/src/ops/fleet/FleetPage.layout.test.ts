import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import FleetPage from "./FleetPage";

describe("fleet responsive layout", () => {
  test("marks KPI and table regions for constrained-width layout", () => {
    const html = renderToString(h(FleetPage, {}));

    expect(html.includes('class="og-fleet-kpi-strip og-fleet-kpi-strip--tablet"')).toBe(true);
    expect(html.includes('class="og-fleet-table-wrap og-fleet-table-scroll"')).toBe(true);
  });
});
