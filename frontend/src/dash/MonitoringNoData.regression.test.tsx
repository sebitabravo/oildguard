import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { DashboardLevelSourceBadge, DashboardStatusNotices, NoTelemetryContextLayout } from "./Dashboard";
import { TelemetryRow, WheelContext } from "../ops/wheel/WheelPanels";

describe("monitoring live wheel with no telemetry", () => {
  test("renders a clear no-data message without inventing confidence", () => {
    const html = renderToString(h("div", {},
      h(DashboardStatusNotices, {
        activeLevel: null,
        backendOutage: false,
        analyzerNotice: null,
        live: true,
        demoActive: false,
        lastUpdateMs: null,
        nowMs: 1_000,
        noTelemetry: true,
      }),
      h(WheelContext, {
        truckId: "TRUCK-01",
        wheelId: "WHEEL-01",
        position: "LH",
        regime: "rest",
        sourceBadge: h(DashboardLevelSourceBadge, {
          live: true,
          source: "live",
          validity: "invalid",
          noTelemetry: true,
        }),
        lastUpdate: "—",
        wheelOptions: [{ id: "WHEEL-01", label: "WHEEL-01" }],
        onSelectWheel: () => {},
      }),
      h(TelemetryRow, {
        level: 0,
        sigma: 0,
        confidence: 0,
        validity: "invalid",
        levelSource: "LIVE",
        hasLevelReading: false,
        hasConfidenceReading: false,
        noTelemetry: true,
        sigmaSource: "DEMO",
        confidenceSource: "DEMO",
        pressureKpa: 0,
        temperatureC: 0,
        vibrationG: 0,
        tauS: 0,
        pressureLive: false,
        temperatureLive: false,
        vibrationLive: false,
      }),
    ));

    expect(html.match(/Sin telemetría disponible para esta rueda\./g)).toHaveLength(1);
    expect(html).not.toContain("Lectura inválida");
    expect(html).not.toContain("sin lectura");
    expect(html).not.toContain("og-chip--invalid");
    expect(html).not.toContain('data-field="confidence"');
  });

  test("keeps initial loading distinct from the no-telemetry state", () => {
    const html = renderToString(h(DashboardStatusNotices, {
      activeLevel: null,
      backendOutage: false,
      analyzerNotice: null,
      live: true,
      demoActive: false,
      lastUpdateMs: null,
      nowMs: 1_000,
      loading: true,
      noTelemetry: false,
    }));

    expect(html).not.toContain("Sin telemetría disponible para esta rueda.");
    expect(html).not.toContain("Lectura obsoleta");
  });

  test("places the no-data message before wheel context while preserving normal context-first order", () => {
    const status = h("span", {}, "Sin telemetría disponible para esta rueda.");
    const context = h("span", {}, "Contexto de rueda");
    const noDataHtml = renderToString(h(NoTelemetryContextLayout, { noTelemetry: true, status }, context));
    const regularHtml = renderToString(h(NoTelemetryContextLayout, { noTelemetry: false, status }, context));

    expect(noDataHtml.indexOf("Sin telemetría disponible para esta rueda.")).toBeLessThan(noDataHtml.indexOf("Contexto de rueda"));
    expect(regularHtml.indexOf("Contexto de rueda")).toBeLessThan(regularHtml.indexOf("Sin telemetría disponible para esta rueda."));
  });
});
