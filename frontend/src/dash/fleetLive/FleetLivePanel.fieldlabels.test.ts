import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { FleetLiveTelemetryFields } from "./FleetLivePanel";

const fixture = {
  asOf: "2026-10-11T17:57:01.988562+00:00",
  windowS: 10,
  devices: 0,
  acceptedRowsPerS: 0,
  rejectedRowsPerS: 0,
  droppedBatches: 0,
  latencyP50S: null,
  latencyP99S: null,
  queueDepth: 0,
  queueCapacity: 0,
  metrics: {},
};

function normalizedWithSourceMarkers(markup: string): string {
  return markup
    .replace(/<small class="og-fleet-source[^"]*">\s*(DEMO|EN VIVO|MIXTO|CONFIGURACIÓN)\s*<\/small>/g, " ⟦$1⟧")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expectLiveField(markup: string, text: string): void {
  expect(normalizedWithSourceMarkers(markup)).toContain(`${text} ⟦EN VIVO⟧`);
}

describe("fleet live telemetry field provenance", () => {
  test("labels every backend telemetry value adjacent to its displayed field", () => {
    const html = renderToString(h(FleetLiveTelemetryFields, { snapshot: fixture }));

    expectLiveField(html, "Ventana: 10 s");
    expectLiveField(html, "A las 2026-10-11T17:57:01.988562+00:00");
    expectLiveField(html, "0 dispositivos reportando");
    expectLiveField(html, "0,0 filas aceptadas/s");
    expectLiveField(html, "0,0 filas rechazadas/s");
    expectLiveField(html, "0 lotes descartados");
    expectLiveField(html, "— p50");
    expectLiveField(html, "— p99");
    expectLiveField(html, "0 / 0 cola / capacidad");
  });
});
