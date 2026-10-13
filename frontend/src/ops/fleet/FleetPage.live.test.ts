import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { FleetLivePanelView } from "../../dash/fleetLive/FleetLivePanel";
import type { FleetLiveSnapshot } from "../../dash/fleetLive/logic";
import { createDemoDataset } from "../../demo/demoData";
import { FleetWheelRow } from "./FleetPage";
import { mergeLiveDevices } from "./logic";

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

const liveRow = mergeLiveDevices(createDemoDataset().trucks, [{
  device_id: "wheel-LH-01",
  latest_level_liters: 92,
  last_t_iso: "2026-10-11T12:00:00Z",
}]).find((row) => row.id === "wheel-LH-01");

function countLiveBadges(markup: string): number {
  return (markup.match(/<small class="og-fleet-source[^\"]*">EN VIVO<\/small>/g) ?? []).length;
}

describe("fleet telemetry live claims follow the connection state", () => {
  test("closed connection hides live badges on fleet rows", () => {
    if (!liveRow) throw new Error("Expected demo wheel fixture");
    const html = renderToString(h(FleetWheelRow, {
      row: liveRow,
      now: Date.parse("2026-10-11T12:00:00Z"),
      liveConnected: false,
    } as Parameters<typeof FleetWheelRow>[0]));
    expect(countLiveBadges(html)).toBe(0);
  });

  test("open connection preserves live badges on fleet rows", () => {
    if (!liveRow) throw new Error("Expected demo wheel fixture");
    const html = renderToString(h(FleetWheelRow, {
      row: liveRow,
      now: Date.parse("2026-10-11T12:00:00Z"),
      liveConnected: true,
    } as Parameters<typeof FleetWheelRow>[0]));
    expect(countLiveBadges(html)).toBeGreaterThan(0);
  });

  test("closed connection removes live text and source badges", () => {
    const html = renderToString(h(FleetLivePanelView, { state: "polling", snapshot }));
    expect(html.includes("EN VIVO")).toBe(false);
    expect(html.includes("Al día")).toBe(false);
    expect(html.toLowerCase().includes("en vivo")).toBe(false);
    expect(html).toContain("Sin conexión");
    expect((html.match(/Sin conexión(?=<)/g) ?? []).length).toBe(1);
  });

  test("unavailable fleet API suppresses WebSocket-live telemetry claims", () => {
    const html = renderToString(h(FleetLivePanelView, { state: "live", snapshot, connectionAvailable: false }));
    expect(html.includes("Telemetría en vivo de la flota")).toBe(false);
    expect(countLiveBadges(html)).toBe(0);
    expect(html.includes("Al día")).toBe(false);
  });

  test("open connection preserves live telemetry framing", () => {
    const html = renderToString(h(FleetLivePanelView, { state: "live", snapshot }));
    expect(html).toContain("Telemetría en vivo de la flota");
    expect(html).toContain("EN VIVO");
    expect(html).toContain("Al día");
  });
});
