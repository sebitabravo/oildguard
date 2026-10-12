import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { shouldShowLevelReading } from "../../dash/Dashboard";
import { TelemetryRow } from "./WheelPanels";

function renderLevelCard({
  level,
  validity,
  levelSource,
  hasLevelReading,
}: {
  level: number;
  validity: "valid" | "invalid";
  levelSource: "LIVE" | "DEMO";
  hasLevelReading: boolean;
}): string {
  const html = renderToString(h(TelemetryRow, {
    level,
    sigma: 0,
    confidence: validity === "invalid" ? 0 : 0.9,
    validity,
    levelSource,
    hasLevelReading,
    sigmaSource: levelSource,
    confidenceSource: levelSource,
    pressureKpa: 2.5,
    temperatureC: 60,
    vibrationG: 0.3,
    tauS: 0.75,
    pressureLive: levelSource === "LIVE",
    temperatureLive: levelSource === "LIVE",
    vibrationLive: levelSource === "LIVE",
  }));
  const cardStart = html.indexOf('<article class="og-foundation-card">');
  const cardEnd = html.indexOf("</article>", cardStart);
  return html.slice(cardStart, cardEnd);
}

describe("wheel level card with no ingested rows", () => {
  test("suppresses per-wheel no-row fallback despite rows from other devices", () => {
    expect(shouldShowLevelReading("LIVE", 0)).toBe(false);
    const storeRows = 1;
    const sourceMessageCode = "source_no_rows";
    const hasLevelReading = shouldShowLevelReading("LIVE", storeRows, sourceMessageCode);
    const card = renderLevelCard({ level: 95, validity: "invalid", levelSource: "LIVE", hasLevelReading });

    expect(hasLevelReading).toBe(false);
    expect(card).toContain("—");
    expect(card).not.toContain("%");
    expect(card).not.toContain("nominal");
    expect(card).toContain("sin lectura");
    expect(card).toContain("Origen del dato: telemetría");
  });

  test("keeps local DEMO readings visible even when the backend store is empty", () => {
    const hasLevelReading = shouldShowLevelReading("DEMO", 0, "source_no_rows");
    const card = renderLevelCard({ level: 66.5, validity: "valid", levelSource: "DEMO", hasLevelReading });

    expect(hasLevelReading).toBe(true);
    expect(card).toContain("66,5");
    expect(card).toContain("nominal");
  });
});
