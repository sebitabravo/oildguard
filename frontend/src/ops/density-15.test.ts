import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import AlertsInboxPage from "./alerts/AlertsInboxPage";
import FleetPage from "./fleet/FleetPage";
import RulPage from "./rul/RulPage";

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
    expect(primary).toContain('class="og-fleet-backend');
  });

  test("keeps Alerts distribution and safety note in closed disclosures, outside summary and table", () => {
    const html = renderToString(h(AlertsInboxPage, {}));
    const disclosures = closedDisclosureBodies(html);
    const primary = withoutDisclosures(html);

    expect(disclosures.some((body) => body.includes('class="og-alerts-bar"'))).toBe(true);
    expect(disclosures.some((body) => body.includes('class="og-alerts-card--rule"'))).toBe(true);
    expect(primary).toContain('class="og-alerts-tiles"');
    expect(primary).toContain('class="og-alerts-table"');
    expect(primary).toContain('class="og-alerts-pill');
  });

  test("keeps the RUL wheel cards and projections together in one closed disclosure", () => {
    const html = renderToString(h(RulPage, {}));
    const disclosures = closedDisclosureBodies(html);
    const primary = withoutDisclosures(html);

    expect(disclosures.length).toBe(1);
    expect(disclosures[0]).toContain('class="og-rul-grid"');
    expect(disclosures[0]).toContain('class="og-rul-card');
    expect(disclosures[0]).toContain("<svg");
    expect(primary).toContain('class="og-rul-header-meta"');
    expect(primary).toContain('class="og-rul-scope"');
    expect(primary).toContain('class="og-rul-assumptions"');
  });
});
