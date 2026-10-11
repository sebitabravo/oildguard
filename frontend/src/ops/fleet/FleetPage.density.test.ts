import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import FleetPage from "./FleetPage";
import { demoDataset } from "../../demo/dataset";
import { t } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { fleetCounters, mergeLiveDevices } from "./logic";

describe("fleet KPI density", () => {
  test("presents the three unchanged fleet KPIs in one compact strip", () => {
    const html = renderToString(h(FleetPage, {}));
    const strip = html.match(/<section[^>]*class="og-fleet-kpi-strip"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
    const counts = fleetCounters(mergeLiveDevices(demoDataset.trucks, []));

    expect(strip).not.toBe("");
    expect(strip.match(/class="og-fleet-kpi(?: [^"]*)?"/g)?.length).toBe(3);
    expect(strip).toContain(t("fleet.kpiMonitored"));
    expect(strip).toContain(formatNumber(counts.trucks, 0));
    expect(strip).toContain(t("fleet.trucks"));
    expect(strip).toContain(`${formatNumber(counts.wheels, 0)} ${t("fleet.gdy106Wheels")}`);
    expect(strip).toContain(`${t("fleet.activeCycle")}: ${formatNumber(counts.activeTrucks, 0)}`);
    expect(strip).toContain(t("fleet.kpiAlerts"));
    expect(strip).toContain(formatNumber(counts.alerts, 0));
    expect(strip).toContain(`${formatNumber(counts.n4, 0)} ${t("fleet.n4Word")}`);
    expect(strip).toContain(`${formatNumber(counts.n2, 0)} ${t("fleet.n2Word")}`);
    expect(strip).toContain(t("fleet.kpiLink"));
    expect(strip).toContain(formatNumber(counts.noLink, 0));
    expect(strip).toContain(`${formatNumber(counts.stale, 0)} ${t("fleet.staleWord")}`);
    expect(strip).toContain(`${formatNumber(counts.linkDown, 0)} ${t("fleet.linkDownWord")}`);
    expect(html).toContain(t("fleet.demoSource"));
  });
});
