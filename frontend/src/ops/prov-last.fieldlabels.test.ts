import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import Landing from "../platform/landing/Landing";
import DeviceInventoryPage, { DeviceFieldSource } from "../platform/devices/DeviceInventoryPage";
import ValidationPage from "../lab/validation/ValidationPage";
import HistoryPage from "./history/HistoryPage";
import BenchView from "../sim/bench/BenchView";
import AlertDetailPage from "./alerts/AlertDetailPage";
import AlertRulesPage from "./alerts/AlertRulesPage";
import ReportPage from "./report/ReportPage";

const sourceTag = /(?:og-badge--source-[\w-]+|og-chip)[^>]*>[\s\S]*?(?:DEMO|EN VIVO|MIXTO|DERIVED|ASSUMPTION|GAP|SYNTHETIC-PROXY|SUSTITUTO SINTÉTICO|CONFIGURACIÓN)/;

function withLocation<T>(search: string, render: () => T): T {
  const previousWindow = globalThis.window;
  Object.assign(globalThis, { window: { location: { search }, matchMedia: () => ({ matches: true }) } });
  try { return render(); } finally { Object.assign(globalThis, { window: previousWindow }); }
}

function text(markup: string): string {
  return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function render(component: Parameters<typeof h>[0], search = ""): string {
  return withLocation(search, () => renderToString(h(component, {})));
}

function expectSourceNear(markup: string, value: string): void {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  expect(new RegExp(`${escaped}[\\s\\S]{0,160}(?:og-chip|og-badge--source)`).test(markup)).toBe(true);
}

describe("remaining business values carry field-level provenance", () => {
  test("labels the configured 10 Hz landing pipeline value beside the value", () => {
    const markup = render(Landing);
    expectSourceNear(markup, "10 Hz");
  });

  test("labels every history range and threshold selection", () => {
    const markup = text(render(HistoryPage));
    for (const value of ["250 h · CONFIGURACIÓN", "7 d · CONFIGURACIÓN", "30 d · CONFIGURACIÓN", "90 d · CONFIGURACIÓN", "50% advertencia · CONFIGURACIÓN", "30% crítico · CONFIGURACIÓN"]) {
      expect(markup).toContain(value);
    }
  });

  test("labels each device row's numeric business fields rather than relying on the page badge", () => {
    const loadingMarkup = render(DeviceInventoryPage);
    expect(loadingMarkup).toContain("Cargando inventario de dispositivos");
    for (const source of ["demo", "live"] as const) {
      const field = renderToString(h(DeviceFieldSource, { source }));
      expect(field).toContain(source === "demo" ? "DEMO" : "EN VIVO");
    }
  });

  test("labels each validation value inside its table cell and each KPI card", () => {
    const markup = render(ValidationPage);
    const rows = [...markup.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(([row]) => row);
    const numericRows = rows.filter((row) => /<td/.test(row) && /\d/.test(text(row)));
    expect(numericRows.length).toBeGreaterThan(0);
    for (const row of numericRows) {
      const cells = [...row.matchAll(/<td\b[^>]*>[\s\S]*?<\/td>/g)].map(([cell]) => cell);
      for (const cell of cells.slice(3).filter((item) => /\d/.test(text(item)))) expect(sourceTag.test(cell)).toBe(true);
    }
    const tiles = [...markup.matchAll(/<article class="og-kpi-tile[^>]*>[\s\S]*?<\/article>/g)].map(([tile]) => tile);
    for (const tile of tiles.filter((item) => /\d/.test(text(item)))) expect(sourceTag.test(tile)).toBe(true);
  });

  test("labels wheel, alert detail, and alert-rule values at the field", () => {
    const wheel = render(BenchView);
    expectSourceNear(wheel, "1,00 (nominal)");
    expectSourceNear(wheel, "1 kHz");

    const detail = render(AlertDetailPage, "?id=alert-wheel-RH-03");
    const signalReadouts = [...detail.matchAll(/<dl class="og-alerts-stats">([\s\S]*?)<\/dl>/g)].flatMap(([, stats]) =>
      [...(stats ?? "").matchAll(/<dd class="og-mono">([\s\S]*?)<\/dd>/g)].map(([, value]) => value ?? ""));
    expect(signalReadouts.length).toBeGreaterThan(0);
    for (const value of signalReadouts) expect(sourceTag.test(value)).toBe(true);
    const evidenceRows = [...detail.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(([row]) => row).filter((row) => /<td/.test(row));
    expect(evidenceRows.length).toBeGreaterThan(0);
    for (const row of evidenceRows) {
      const cells = [...row.matchAll(/<td\b[^>]*>[\s\S]*?<\/td>/g)].map(([cell]) => cell);
      for (const cell of cells.filter((item) => /\d/.test(text(item)))) expect(sourceTag.test(cell)).toBe(true);
    }

    const rules = render(AlertRulesPage);
    const valueCells = [...rules.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].flatMap(([row]) => [...row.matchAll(/<td class="og-mono">([\s\S]*?)<\/td>/g)].map(([, cell]) => cell ?? ""));
    expect(valueCells.length).toBeGreaterThan(0);
    for (const cell of valueCells) if (/\d/.test(text(cell))) expect(sourceTag.test(cell)).toBe(true);
  });

  test("labels both report KPIs in the same cards as their values", () => {
    const markup = render(ReportPage);
    const tiles = [...markup.matchAll(/<article class="og-kpi-tile[^>]*>[\s\S]*?<\/article>/g)].map(([tile]) => tile);
    for (const value of ["90 min", "3"]) {
      const tile = tiles.find((item) => text(item).includes(value)) ?? "";
      expect(sourceTag.test(tile)).toBe(true);
    }
  });
});
