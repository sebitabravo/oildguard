import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { TelemetryRow } from "./WheelPanels";

const baseProps = {
  level: 72,
  sigma: 1.2,
  confidence: 0.91,
  validity: "valid" as const,
  levelSource: "DEMO" as const,
  sigmaSource: "DEMO" as const,
  confidenceSource: "DEMO" as const,
  pressureKpa: 140,
  temperatureC: 35,
  vibrationG: 0.2,
  tauS: 3,
  pressureLive: false,
  temperatureLive: false,
  vibrationLive: false,
};

describe("telemetry DEMO source deduplication", () => {
  test("shows one DEMO source badge for repeated demo fields in the telemetry card", () => {
    const html = renderToString(h(TelemetryRow, baseProps));

    expect(html.match(/og-badge--source-demo/g)).toHaveLength(1);
    expect(html.match(/data-field="(?:level|sigma|confidence)"/g)).toHaveLength(3);
    expect(html).toContain("og-chip--synthetic");
  });

  test("keeps DEMO visible when sources are mixed and preserves live labels", () => {
    const html = renderToString(h(TelemetryRow, {
      ...baseProps,
      levelSource: "DEMO",
      sigmaSource: "LIVE",
      confidenceSource: "DEMO",
    }));

    expect(html.match(/og-badge--source-demo/g)).toHaveLength(1);
    expect(html.match(/og-badge--source-live/g)).toHaveLength(1);
  });
});
