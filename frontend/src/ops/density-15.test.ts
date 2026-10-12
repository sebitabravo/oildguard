import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import AlertsInboxPage from "./alerts/AlertsInboxPage";
import FleetPage from "./fleet/FleetPage";
import RulPage from "./rul/RulPage";
import { t } from "../i18n";

const closedDisclosureBodies = (html: string) =>
  [...html.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)]
    .filter((match) => !match[1]?.includes("open"))
    .map((match) => match[2] ?? "");

const withoutDisclosures = (html: string) => html.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, "");

describe("DENSITY-15 secondary disclosures", () => {
  test("keeps Fleet helper and live panel in a closed disclosure, outside primary table and status", () => {
    const html = renderToString(h(FleetPage, {}));
    const disclosures = closedDisclosureBodies(html);
    const primary = withoutDisclosures(html);

    expect(disclosures.some((body) => body.includes('class="og-fleet-helper"'))).toBe(true);
    expect(disclosures.some((body) => body.includes('class="og-fleet-live'))).toBe(true);
    expect(primary).toContain('class="og-fleet-kpi-strip"');
    expect(primary).toContain('class="og-fleet-table"');
    expect(primary).toContain('class="og-fleet-header-meta"');
  });

  test("keeps Alerts distribution and safety note in closed disclosures, outside summary and table", () => {
    const html = renderToString(h(AlertsInboxPage, {}));
    const disclosures = closedDisclosureBodies(html);
    const primary = withoutDisclosures(html);
    const firstDisclosure = html.match(/<details\b[^>]*>/)?.[0] ?? "";

    expect(firstDisclosure).toContain('class="og-alerts-recurrence"');
    expect(disclosures.some((body) => body.includes('class="og-alerts-bar"'))).toBe(true);
    expect(disclosures.some((body) => body.includes(t("alerts.callout.text")))).toBe(true);
    expect(primary).toContain('class="og-alerts-tiles"');
    expect(primary).toContain('class="og-alerts-table"');
    expect(primary).toContain('class="og-alerts-pill');
  });

  test("keeps RUL cards in one closed disclosure and each projection chart in its own closed disclosure", () => {
    const html = renderToString(h(RulPage, {}));
    const outerStart = html.indexOf('<details class="og-rul-disclosure"');
    const gridStart = html.indexOf('<section class="og-rul-grid"');
    const lastDisclosureEnd = html.lastIndexOf("</details>");
    const projectionDisclosures = [...html.matchAll(/<details class="og-rul-projection">([\s\S]*?)<\/details>/g)];
    const primary = html.slice(0, outerStart) + html.slice(lastDisclosureEnd + "</details>".length);

    expect(outerStart).toBeGreaterThanOrEqual(0);
    expect(gridStart).toBeGreaterThan(outerStart);
    expect(lastDisclosureEnd).toBeGreaterThan(gridStart);
    expect(html.slice(outerStart, gridStart)).toContain(`<summary>${t("rul.secondaryDisclosure")}</summary>`);
    expect(projectionDisclosures.length).toBeGreaterThan(0);
    for (const disclosure of projectionDisclosures) {
      expect(disclosure[1]).toContain(`<summary>${t("rul.projection")} · 30% <span class="og-chip">CONFIGURACIÓN</span></summary>`);
      expect(disclosure[1]).toContain("<svg");
    }
    expect(primary).toContain('class="og-rul-header-meta"');
    expect(primary).toContain('class="og-rul-scope"');
    expect(primary).toContain('class="og-rul-assumptions"');
  });
});
