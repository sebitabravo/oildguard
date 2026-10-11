import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { FleetLivePanelView } from "../../dash/fleetLive/FleetLivePanel";
import type { FleetLiveSnapshot } from "../../dash/fleetLive/logic";

const snapshot: FleetLiveSnapshot = {
  asOf: "2026-10-11T12:00:00Z",
  windowS: 10,
  devices: 1,
  acceptedRowsPerS: 2,
  rejectedRowsPerS: 0,
  droppedBatches: 0,
  latencyP50S: 0.1,
  latencyP99S: 0.2,
  queueDepth: 0,
  queueCapacity: 100,
  metrics: {},
};

describe("fleet telemetry live claims follow the connection state", () => {
  test("closed connection removes live text and source badges", () => {
    const html = renderToString(h(FleetLivePanelView, { state: "polling", snapshot }));
    expect(html.includes("EN VIVO")).toBe(false);
    expect(html.includes("Al día")).toBe(false);
    expect(html.toLowerCase().includes("en vivo")).toBe(false);
    expect(html).toContain("Sin conexión");
  });

  test("open connection preserves live telemetry framing", () => {
    const html = renderToString(h(FleetLivePanelView, { state: "live", snapshot }));
    expect(html).toContain("Telemetría en vivo de la flota");
    expect(html).toContain("EN VIVO");
    expect(html).toContain("Al día");
  });
});
