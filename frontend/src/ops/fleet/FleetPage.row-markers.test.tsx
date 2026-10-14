import { describe, expect, test } from "bun:test";
import { Fragment, h } from "preact";
import renderToString from "preact-render-to-string";
import { createDemoDataset } from "../../demo/demoData";
import { FleetTableLegend, FleetWheelRow } from "./FleetPage";
import { mergeLiveDevices } from "./logic";

const dataset = createDemoDataset();
const rows = mergeLiveDevices(dataset.trucks, [
  { device_id: "wheel-LIVE-01", truck_id: "OG-01", latest_level_liters: 88, last_t_iso: "2026-10-11T12:00:00Z" },
  { device_id: "wheel-LIVE-02", truck_id: "OG-02", latest_level_liters: 91, last_t_iso: "2026-10-11T12:00:00Z" },
]);
const selectedRows = [
  ...rows.filter((row) => row.source === "DEMO").slice(0, 11),
  ...rows.filter((row) => row.source === "LIVE" && !dataset.wheels.some((wheel) => wheel.id === row.id)),
];
const tableHtml = renderToString(h(Fragment, {},
  h("table", {}, h("tbody", {}, selectedRows.map((row) => h(FleetWheelRow, { key: row.id, row, now: dataset.referenceMs })))),
  h(FleetTableLegend, {}),
));
const rowHtml = [...tableHtml.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(([markup]) => markup);

function visibleDemoBadgeCount(markup: string): number {
  return [...markup.matchAll(/<small class="([^"]*)">([^<]*)<\/small>/g)]
    .filter(([, className]) => className.includes("og-fleet-source--demo") && !className.includes("og-fleet-source--sr-only"))
    .length;
}

describe("fleet row-level provenance markers", () => {
  test("keeps at most one visible DEMO marker per data row and one in the shared legend", () => {
    expect(rowHtml).toHaveLength(13);
    expect(rowHtml.every((markup) => visibleDemoBadgeCount(markup) <= 1)).toBe(true);
    expect(rowHtml.map(visibleDemoBadgeCount)).toEqual(Array(13).fill(1));

    const legend = tableHtml.match(/<div class="og-fleet-legend">[\s\S]*?<\/div>/)?.[0] ?? "";
    expect(visibleDemoBadgeCount(legend)).toBe(1);
  });

  test("retains both per-field EN VIVO markers on each live-device row", () => {
    const liveOnlyIds = ["wheel-LIVE-01", "wheel-LIVE-02"];

    expect(liveOnlyIds.every((id) => {
      const markup = rowHtml.find((item) => item.includes(id));
      return markup !== undefined && (markup.match(/EN VIVO/g) ?? []).length === 2;
    })).toBe(true);
  });

  test("does not label a fully LIVE row as DEMO", () => {
    const row = selectedRows[0];
    if (!row) throw new Error("Expected a row fixture");
    const fullyLiveRow = {
      ...row,
      fieldSources: Object.fromEntries(Object.keys(row.fieldSources).map((field) => [field, "LIVE"])) as typeof row.fieldSources,
    };
    const html = renderToString(h(FleetWheelRow, { row: fullyLiveRow, now: dataset.referenceMs }));

    expect(visibleDemoBadgeCount(html)).toBe(0);
  });
});
