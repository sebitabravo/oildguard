import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { createDemoDataset } from "../../demo/demoData";
import { t } from "../../i18n";
import { mergeLiveDevices, type FleetRow } from "./logic";
import FleetPage, { FleetWheelRow } from "./FleetPage";
import fleetCss from "./fleet.css?raw";

const dataset = createDemoDataset();
const NOW = Date.parse("2026-10-10T12:00:00.000Z");

function liveRow(): FleetRow {
  const rows = mergeLiveDevices(dataset.trucks, [{
    device_id: "wheel-RH-01",
    truck_id: "OG-01",
    latest_level_liters: 91.2,
    last_t_iso: "2026-10-10T09:00:00.000Z",
  }]);
  const row = rows.find((item) => item.id === "wheel-RH-01");
  if (!row) throw new Error("missing wheel-RH-01");
  return row;
}

function demoRow(): FleetRow {
  const row = mergeLiveDevices(dataset.trucks, []).find((item) => item.id === "wheel-RH-01");
  if (!row) throw new Error("missing wheel-RH-01");
  return row;
}

function renderRow(row: FleetRow): string {
  return renderToString(h(FleetWheelRow, { row, now: NOW }));
}

function visibleSourceBadges(markup: string, source: "demo" | "live"): string[] {
  return [...markup.matchAll(/<small class="([^"]*)">([^<]*)<\/small>/g)]
    .filter(([, className]) => className.includes(`og-fleet-source--${source}`) && !className.includes("og-fleet-source--sr-only"))
    .map(([, , label]) => label ?? "");
}

describe("fleet provenance presentation", () => {
  test("keeps at most one visible DEMO chip per live-mixed row and exposes live sources", () => {
    const html = renderRow(liveRow());
    const visibleDemoChips = visibleSourceBadges(html, "demo");
    const visibleLiveChips = visibleSourceBadges(html, "live");

    expect(visibleDemoChips.length).toBeLessThanOrEqual(1);
    expect(visibleLiveChips).toHaveLength(2);
    expect(html).toContain(`class="og-fleet-source og-fleet-source--demo og-fleet-source--sr-only"`);
    expect(html).toContain(t("fleet.source.live"));
    expect(html).toContain(t("fleet.source.demo"));
  });

  test("demo-only rows do not claim live data and keep DEMO labels accessible", () => {
    const html = renderRow(demoRow());

    expect(visibleSourceBadges(html, "demo").length).toBeLessThanOrEqual(1);
    expect(html).not.toContain(t("fleet.source.live"));
    expect(html).toContain(t("fleet.source.demo"));
  });

  test("uses the fleet accent token for the existing wheel-detail link", () => {
    expect(fleetCss).toMatch(/\.og-fleet-wheel-cell a\s*\{[^}]*color:\s*var\(--og-accent\)/);
  });

  test("shows one visible DEMO chip in the table legend", () => {
    const html = renderToString(h(FleetPage, {}));
    const legend = html.split('class="og-fleet-legend"')[1]?.split("</div>")[0] ?? "";
    const visibleDemoChips = visibleSourceBadges(legend, "demo");

    expect(visibleDemoChips).toHaveLength(1);
    expect((html.match(/og-fleet-demo-only-group/g) ?? [])).toHaveLength(1);
    expect(html).toContain(t("fleet.source.demo"));
    expect(html).toContain(t("fleet.demoOnlyRows"));
  });
});
