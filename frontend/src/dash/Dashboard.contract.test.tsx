import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { demoDataset } from "../demo/dataset";
import { t } from "../i18n";
import { FleetWheelRow } from "../ops/fleet/FleetPage";
import { buildWheelDetailHref, mergeLiveDevices } from "../ops/fleet/logic";
import Dashboard from "./Dashboard";

describe("dashboard series and navigation contract", () => {
  test("level_history_precedes_sensor_series_and_unsourced_current_is_gap", () => {
    const dashboard = renderToString(h(Dashboard, { wheelId: undefined }));
    const levelHistory = dashboard.indexOf('data-dashboard-series="level-history-label"');
    const temperature = dashboard.indexOf('data-dashboard-series="temperature"');
    const vibration = dashboard.indexOf('data-dashboard-series="vibration"');
    const current = dashboard.indexOf('data-dashboard-series="current"');

    expect(levelHistory).toBeGreaterThanOrEqual(0);
    expect(temperature).toBeGreaterThan(levelHistory);
    expect(vibration).toBeGreaterThan(temperature);
    expect(current).toBeGreaterThan(vibration);
    expect(dashboard.slice(current, current + 160)).toContain(`>${t("dash.series.gap")}</p>`);
    expect(/>[^<]*\d[^<]*</.test(dashboard.slice(current, current + 160))).toBe(false);

    const row = mergeLiveDevices(demoDataset.trucks, []).find((item) => item.id === demoDataset.wheels[0].id);
    expect(row !== undefined).toBe(true);
    const fleetRow = renderToString(h(FleetWheelRow, { row: row!, now: demoDataset.referenceMs }));
    expect(fleetRow).toContain(`href="${buildWheelDetailHref(row!.id)}"`);
  });
});
