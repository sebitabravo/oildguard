import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { t } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { TelemetryRow } from "./WheelPanels";

const base = {
  truckId: "OG-01",
  wheelId: "wheel-RH-01",
  level: 91.2,
  sigma: 0.46,
  confidence: 0.908,
  validity: "valid" as const,
  pressureKpa: 2.5,
  temperatureC: 60,
  vibrationG: 0.3,
  tauS: 0.75,
  pressureLive: false,
  temperatureLive: false,
  vibrationLive: false,
};

function render(source: "LIVE" | "DEMO") {
  return renderToString(h(TelemetryRow, {
    ...base,
    levelSource: source,
    sigmaSource: "DEMO",
    confidenceSource: "DEMO",
  }));
}

function field(html: string, name: string): string {
  const start = html.indexOf(`data-field="${name}"`);
  if (start < 0) return "";
  const next = html.indexOf("data-field=", start + 1);
  return html.slice(start, next < 0 ? undefined : next);
}

describe("wheel numeric evidence", () => {
  test("mixed-source level, sigma and confidence each carry their own source and validity", () => {
    const html = render("LIVE");
    const level = field(html, "level");
    const sigma = field(html, "sigma");
    const confidence = field(html, "confidence");
    expect(level).toContain("L");
    expect(level).toContain(t("fleet.source.live"));
    expect(level).toContain(t("ui.valid"));
    expect(sigma).toContain(formatNumber(base.sigma, 1));
    expect(sigma).toContain("L");
    expect(sigma).toContain(t("fleet.source.demo"));
    expect(sigma).toContain(t("wheel.numeric.syntheticValidity"));
    expect(confidence).toContain(t("ui.confidence"));
    expect(confidence).toContain(t("fleet.source.demo"));
    expect(confidence).toContain(t("wheel.numeric.syntheticValidity"));
    expect(confidence.includes("0.908")).toBe(false);
  });

  test("backend-down demo level is not shown as a live valid reading", () => {
    const level = field(render("DEMO"), "level");
    expect(level).toContain(t("fleet.source.demo"));
    expect(level).toContain(t("wheel.numeric.syntheticValidity"));
    expect(level.includes(t("ui.valid"))).toBe(false);
  });
});
