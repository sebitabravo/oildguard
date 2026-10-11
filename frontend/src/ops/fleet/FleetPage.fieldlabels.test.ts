import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import FleetPage from "./FleetPage";

const renderPage = () => renderToString(h(FleetPage, {}));

function elements(html: string, tag: string, className: string): string[] {
  const opening = new RegExp(`<${tag}\\b[^>]*class="[^"]*${className}[^"]*"[^>]*>`, "g");
  const output: string[] = [];
  for (const match of html.matchAll(opening)) {
    const start = match.index ?? 0;
    const tags = new RegExp(`<${tag}\\b[^>]*>|<\\/${tag}>`, "g");
    tags.lastIndex = start;
    let depth = 0;
    for (const current of html.matchAll(tags)) {
      if (current.index === start) depth = 1;
      else if (current[0].startsWith(`</${tag}`)) depth -= 1;
      else depth += 1;
      if (depth === 0) {
        output.push(html.slice(start, (current.index ?? 0) + current[0].length));
        break;
      }
    }
  }
  return output;
}

function hasFieldSource(markup: string): boolean {
  return /class="og-fleet-source[^\"]*"[^>]*>(?:DEMO|EN VIVO)<\/small>/.test(markup);
}

describe("fleet summary field provenance", () => {
  test("labels each summary card and filter count beside its value", () => {
    const html = renderPage();
    const cards = elements(html, "div", "og-fleet-kpi");
    const filters = elements(html, "button", "og-fleet-filter-chip");

    expect(cards.length).toBe(3);
    const normalized = cards.map((card) => card.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
    expect(normalized[0]).toContain("6 camiones");
    expect(normalized[0]).toContain("12 ruedas GDY106");
    expect(normalized[0]).toContain("5");
    expect(normalized[1]).toContain("6");
    expect(normalized[1]).toContain("2");
    expect(normalized[2]).toContain("3");
    expect(normalized[2]).toContain("1");
    expect(cards.map((card) => (card.match(/og-fleet-source/g) ?? []).length)).toEqual([3, 3, 3]);
    for (const card of cards) expect(hasFieldSource(card)).toBe(true);

    expect(filters.length).toBe(4);
    for (const filter of filters) expect(hasFieldSource(filter)).toBe(true);
  });

  test("labels the sampling window and any rendered live telemetry fields", () => {
    const html = renderPage();
    const header = elements(html, "div", "og-fleet-header-meta")[0] ?? "";
    expect(header).toContain("10 s");
    expect(hasFieldSource(header)).toBe(true);

    const telemetry = elements(html, "section", "og-fleet-live")[0] ?? "";
    for (const text of ["0 dispositivos reportando", "0 filas aceptadas", "0 filas rechazadas", "0 lotes descartados", "0 / 0", "Ventana: 10 s"]) {
      if (telemetry.includes(text)) expect(hasFieldSource(telemetry)).toBe(true);
    }
  });
});
