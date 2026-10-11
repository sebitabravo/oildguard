import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { t } from "../../i18n";
import { TelemetryRow } from "./WheelPanels";

function render(validity: "valid" | "stale" | "invalid") {
  return renderToString(h(TelemetryRow, {
    level: 91.2,
    sigma: 0.46,
    confidence: 0.908,
    validity,
    levelSource: "LIVE",
    sigmaSource: "LIVE",
    confidenceSource: "LIVE",
    pressureKpa: 2.5,
    temperatureC: 60,
    vibrationG: 0.3,
    tauS: 0.75,
    pressureLive: true,
    temperatureLive: true,
    vibrationLive: true,
  }));
}

function levelField(html: string) {
  const start = html.indexOf('data-field="level"');
  const next = html.indexOf("data-field=", start + 1);
  return html.slice(start, next < 0 ? undefined : next);
}

describe("wheel live source badge validity", () => {
  test("stale live reading has no EN VIVO badge and retains stale validity", () => {
    const level = levelField(render("stale"));
    expect(level.includes(t("fleet.source.live"))).toBe(false);
    expect(level).toContain(t("ui.stale"));
    expect(level).toContain(t("wheel.numeric.liveOrigin"));
  });

  test("invalid live reading has no EN VIVO badge and retains invalid validity", () => {
    const level = levelField(render("invalid"));
    expect(level.includes(t("fleet.source.live"))).toBe(false);
    expect(level).toContain(t("ui.invalid"));
    expect(level).toContain(t("wheel.numeric.liveOrigin"));
  });

  test("valid live reading retains EN VIVO badge", () => {
    expect(levelField(render("valid"))).toContain(t("fleet.source.live"));
  });
});
