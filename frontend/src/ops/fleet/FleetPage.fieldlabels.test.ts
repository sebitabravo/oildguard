import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import FleetPage, { FleetHeaderMeta, FleetKpiStrip } from "./FleetPage";
import { createDemoDataset } from "../../demo/demoData";
import { fleetCounters, mergeLiveDevices } from "./logic";

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

function normalizedWithSourceMarkers(markup: string): string {
  return markup
    .replace(/<small class="og-fleet-source[^"]*">\s*(DEMO|EN VIVO|MIXTO|CONFIGURACIÓN)\s*<\/small>/g, " ⟦$1⟧")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expectAdjacentSource(markup: string, fieldText: string, source: string): void {
  expect(normalizedWithSourceMarkers(markup)).toContain(`${fieldText} ⟦${source}⟧`);
}

const renderPage = () => renderToString(h(FleetPage, {}));

describe("fleet summary field provenance", () => {
  test("labels each summary-card and filter value beside its own field", () => {
    const html = renderPage();
    const cards = elements(html, "div", "og-fleet-kpi");
    const filters = elements(html, "button", "og-fleet-filter-chip");

    expect(cards.length).toBe(3);
    expectAdjacentSource(cards[0] ?? "", "6 camiones", "DEMO");
    expectAdjacentSource(cards[0] ?? "", "12 ruedas GDY106", "DEMO");
    expectAdjacentSource(cards[0] ?? "", "activos en ciclo: 5", "DEMO");
    expectAdjacentSource(cards[1] ?? "", "6", "DEMO");
    expectAdjacentSource(cards[1] ?? "", "2 N4 críticas", "DEMO");
    expectAdjacentSource(cards[1] ?? "", "2 N2 advertencias", "DEMO");
    expectAdjacentSource(cards[2] ?? "", "3", "DEMO");
    expectAdjacentSource(cards[2] ?? "", "2 obsoletas", "DEMO");
    expectAdjacentSource(cards[2] ?? "", "1 enlace caído", "DEMO");

    expect(filters.length).toBe(4);
    ["Todas 12", "Con alerta 6", "Sin enlace 3", "Fuera de servicio 2"].forEach((field) => {
      const button = filters.find((item) => normalizedWithSourceMarkers(item).startsWith(field));
      expectAdjacentSource(button ?? "", field, "DEMO");
    });
  });

  test("labels the fixed sampling interval at its field", () => {
    const html = renderPage();
    const header = elements(html, "div", "og-fleet-header-meta")[0] ?? "";
    expectAdjacentSource(header, "Ventana de muestreo · 10 s", "CONFIGURACIÓN");

    const liveHeader = renderToString(h(FleetHeaderMeta, { liveLoaded: true, deviceCount: 0 }));
    expectAdjacentSource(liveHeader, "0 dispositivos", "EN VIVO");
  });

  test("splits fleet summary values when live and demo rows both contribute", () => {
    const rows = mergeLiveDevices(createDemoDataset().trucks, [{
      device_id: "wheel-RH-01",
      truck_id: "OG-01",
      latest_level_liters: 91.2,
      last_t_iso: "2026-10-11T12:00:00Z",
    }]);
    const html = renderToString(h(FleetKpiStrip, { rows, counts: fleetCounters(rows) }));
    expect(normalizedWithSourceMarkers(html)).toContain("6 camiones ⟦MIXTO⟧ ⟦EN VIVO⟧ 1 · ⟦DEMO⟧ 5");
    expect(normalizedWithSourceMarkers(html)).toContain("12 ruedas GDY106 ⟦MIXTO⟧ ⟦EN VIVO⟧ 1 · ⟦DEMO⟧ 11");
  });
});
