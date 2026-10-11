import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import PressurePlot from "../platform/landing/PressurePlot";
import RulPage from "./rul/RulPage";
import SimPage from "../lab/sim/SimPage";
import BenchPage from "../lab/bench/BenchPage";
import ValidationPage from "../lab/validation/ValidationPage";
import Dashboard, { DashboardWindowsReadout } from "../dash/Dashboard";
import LinkHealthPage, { LinkQueueTile } from "../platform/link/LinkHealthPage";
import DeviceInventoryPage from "../platform/devices/DeviceInventoryPage";

const provenance = /(?:DEMO|EN VIVO|DERIVED|ASSUMPTION|GAP|SYNTHETIC-PROXY|SUSTITUTO SINTÉTICO|MIXTO|CONFIGURACIÓN)/;

function markedText(markup: string): string {
  return markup
    .replace(/<span class="og-chip(?: [^"]*)?">\s*([^<]+)\s*<\/span>/g, " ⟦$1⟧")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expectFieldSource(markup: string, value: string): void {
  expect(new RegExp(`${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*⟦${provenance.source}⟧`).test(markedText(markup))).toBe(true);
}

function withBrowserGlobals<T>(render: () => T): T {
  const previousWindow = globalThis.window;
  Object.assign(globalThis, { window: { matchMedia: () => ({ matches: true }), location: { search: "" } } });
  try { return render(); } finally { Object.assign(globalThis, { window: previousWindow }); }
}

describe("remaining per-field provenance", () => {
  test("labels numeric cells in the oil settling table", () => {
    const html = renderToString(h(PressurePlot, {}));
    const rows = [...html.matchAll(/<tr\b[^>]*data-volume=[\s\S]*?<\/tr>/g)].map(([row]) => row);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      for (const cell of row.matchAll(/<td\b[^>]*data-field="[^"]+"[^>]*>[\s\S]*?<\/td>/g)) {
        expect(/⟦(?:DERIVED|ASSUMPTION|CONFIGURACIÓN|SYNTHETIC-PROXY)⟧/.test(markedText(cell[0]))).toBe(true);
      }
    }
  });

  test("labels numeric RUL projection and threshold readouts, not prose alone", () => {
    const html = renderToString(h(RulPage, {}));
    const projection = markedText(html.slice(html.indexOf("og-rul-projection"), html.indexOf("og-rul-assumptions")));
    expect(projection.includes("30% ⟦CONFIGURACIÓN⟧")).toBe(true);
    expect(projection.includes("50% advertencia ⟦CONFIGURACIÓN⟧")).toBe(true);
    expect(projection.includes("30% crítico ⟦CONFIGURACIÓN⟧")).toBe(true);
    expect(markedText(html).includes("RUL suprimido · solo anomalías")).toBe(true);
    const suppressedDescription = html.match(/<p class="og-rul-suppressed">([\s\S]*?)<\/p>/)?.[1] ?? "";
    expect(suppressedDescription.includes("og-chip")).toBe(false);
  });

  test("labels simulator inputs, scenario summary and numeric preview readouts", () => {
    const html = withBrowserGlobals(() => renderToString(h(SimPage, {})));
    expectFieldSource(html.slice(html.indexOf("sim-page__params"), html.indexOf("sim-page__faults")), "10 Hz.");
    const params = html.slice(html.indexOf("sim-page__params"), html.indexOf("sim-page__faults"));
    const numericInputs = [...params.matchAll(/<label class="lab-field"[\s\S]*?<input type="number"[\s\S]*?<\/label>/g)].map(([field]) => field);
    expect(numericInputs.length).toBe(3);
    for (const field of numericInputs) expect(field.includes("CONFIGURACIÓN")).toBe(true);
    const scenarioEffects = [...html.matchAll(/<span class="sim-fault__effect">([\s\S]*?)<\/span>/g)].map(([, effect]) => effect ?? "");
    expect(scenarioEffects.length).toBeGreaterThan(0);
    for (const effect of scenarioEffects) expect(effect.includes("SYNTHETIC-PROXY")).toBe(true);
    const preview = html.slice(html.indexOf("sim-page__preview"), html.indexOf("sim-page__counter"));
    expectFieldSource(preview, "95,0 L");
    expect(preview.match(/SYNTHETIC-PROXY/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  test("labels protocol and modeled readouts in the bench view", () => {
    const html = renderToString(h(BenchPage, {}));
    expectFieldSource(html, "95,0 L");
    expectFieldSource(html, "2,582");
    expect(markedText(html).includes("20 min")).toBe(true);
    const stepRows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(([, row]) => row ?? "");
    const numericStepRows = stepRows.filter((row) => /<td/.test(row));
    expect(numericStepRows.length).toBeGreaterThan(0);
    for (const row of numericStepRows) expect(row.match(/<span class="og-chip">(?:CONFIGURACIÓN|ASSUMPTION)<\/span>/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  test("labels validation bandwidth and nominal-capacity anchor", () => {
    const html = renderToString(h(ValidationPage, {}));
    expect(markedText(html)).toContain("0,99 L");
    expectFieldSource(html, "0,99 L");
    const baselineNote = [...html.matchAll(/<li\b[^>]*>[\s\S]*?ancla 95 L[\s\S]*?<\/li>/g)][0]?.[0] ?? "";
    expect(markedText(baselineNote).includes("CONFIGURACIÓN")).toBe(true);
  });

  test("labels session rows and derived channel tally in their dashboard fields", () => {
    const html = renderToString(h(Dashboard, { wheelId: null }));
    const liveRows = renderToString(h(DashboardWindowsReadout, { windowCount: 0, storeRows: 368550 }));
    expect(markedText(liveRows).includes("filas en esta sesión=368550 ⟦EN VIVO⟧")).toBe(true);
    expect(markedText(html).includes("⟦0 de 3 canales coinciden⟧ ⟦DERIVED⟧")).toBe(true);
  });

  test("labels live queue depth, configured capacity and time scale values", () => {
    const html = renderToString(h(LinkHealthPage, {}));
    const queue = renderToString(h(LinkQueueTile, { depth: 0, capacity: 1000, status: "Sin conexión" }));
    expect(/0\s*\/\s*1000[\s\S]*⟦MIXTO⟧/.test(markedText(queue))).toBe(true);
    expectFieldSource(html, "−60 min");
    expectFieldSource(html, "−30 min");
  });

  test("labels the configured inactivity threshold beside its descriptor", () => {
    const html = renderToString(h(DeviceInventoryPage, {}));
    const staleTile = [...html.matchAll(/<article class="og-kpi-tile[^>]*>[\s\S]*?<\/article>/g)].map(([tile]) => tile)
      .find((tile) => tile.includes("Nodos inactivos > 120 s")) ?? "";
    expectFieldSource(staleTile, "Nodos inactivos > 120 s");
  });
});
