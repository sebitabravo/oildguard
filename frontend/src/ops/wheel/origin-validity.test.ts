import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { TelemetryRow } from "./WheelPanels";

function levelField(validity: "valid" | "estimate" | "stale" | "invalid") {
  const html = renderToString(h(TelemetryRow, {
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
  const start = html.indexOf('data-field="level"');
  const next = html.indexOf("data-field=", start + 1);
  return html.slice(start, next < 0 ? undefined : next);
}

describe("wheel live origin validity wording", () => {
  test("invalid readings state invalidity without claiming a live origin", () => {
    const level = levelField("invalid");
    expect(level).toContain("Origen del dato: telemetría (lectura inválida)");
    expect(level).not.toContain("telemetría en vivo");
  });

  test("stale readings state staleness without claiming a live origin", () => {
    const level = levelField("stale");
    expect(level).toContain("Origen del dato: telemetría (lectura obsoleta)");
    expect(level).not.toContain("telemetría en vivo");
  });

  test("estimates do not retain live wording", () => {
    const level = levelField("estimate");
    expect(level).toContain("Origen del dato: telemetría (estimación)");
    expect(level).not.toContain("telemetría en vivo");
  });

  test("valid readings keep the live source wording", () => {
    const level = levelField("valid");
    expect(level).toContain("EN VIVO");
    expect(level).not.toContain("Origen del dato:");
  });
});
