import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import FleetPage from "./FleetPage";

describe("fleet responsive layout", () => {
  test("marks KPI and table regions for constrained-width layout", () => {
    const html = renderToString(h(FleetPage, {}));

    expect(html.includes('class="og-fleet-kpi-strip" data-kpi-layout="tablet"')).toBe(true);
    expect(html.includes('class="og-fleet-table-wrap og-fleet-table-scroll"')).toBe(true);
  });

  test("renders a scroll cue before the wide fleet table", () => {
    const html = renderToString(h(FleetPage, {}));

    expect(html.includes('class="og-fleet-table-cue"')).toBe(true);
    expect(html.includes("Desliza para ver más")).toBe(true);
  });

  test("keeps level value and state separate from trend sparkline containers", () => {
    const html = renderToString(h(FleetPage, {}));
    const levelCell = html.match(/<td class="og-fleet-level-cell">([\s\S]*?)<\/td>/)?.[1] ?? "";
    const trendCell = html.match(/<td><div class="og-fleet-level__sparkline">([\s\S]*?)<\/div><\/td>/)?.[1] ?? "";

    expect(levelCell.includes('class="og-fleet-level__value og-mono"')).toBe(true);
    expect(levelCell.includes('class="og-fleet-level__state"')).toBe(true);
    expect(trendCell.includes("<svg")).toBe(true);
  });
});
