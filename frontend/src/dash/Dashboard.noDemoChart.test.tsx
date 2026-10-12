import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { LIVE_WHEEL_ID } from "../ops/wheel/logic";
import { DEMO_SERIES } from "./demoData";
import Dashboard, { dashboardLevelChartTitle, selectDashboardChartSeries } from "./Dashboard";
import LevelChart from "./LevelChart";

describe("Dashboard level chart without DEMO mode", () => {
  test("shows the empty state without a level line when the live store has no rows", () => {
    const html = renderToString(h(Dashboard, { wheelId: LIVE_WHEEL_ID }));

    expect(html).toContain("Sin filas ingeridas: no hay historial que dibujar.");
    expect(html).not.toContain('class="og-sync__line');
    expect(html).not.toContain('class="og-sync__band');
  });

  test("shows the DEMO level line with DEMO-labeled signals when DEMO mode is on", () => {
    const selected = selectDashboardChartSeries({
      demoActive: true,
      liveRows: 0,
      livePoints: [],
      demoPoints: DEMO_SERIES.slice(0, 3),
    });
    const html = renderToString(h(LevelChart, {
      points: selected.points,
      sigmaL: 1,
      windows: [],
      alerts: [],
      pressureValues: [2, 3, 4],
      temperatureValues: [60, 61, 62],
      signalSource: selected.signalSource,
    }));

    expect(selected.signalSource).toBe("DEMO");
    expect(dashboardLevelChartTitle(selected.signalSource === "DEMO" && selected.points.length > 0)).toContain("DEMO");
    expect(html).toContain('class="og-sync__line');
    expect(html).toContain("· DEMO");
  });
});
