import { describe, expect, test } from "bun:test";
import {
  classifyLiveStatus,
  deriveFleetWebSocketUrl,
  isNoRowsPayload,
  mergeFleetSnapshots,
  parseFleetPayload,
  reconnectDelay,
} from "./logic";

const aggregates = {
  pressure_kpa: { mean: 2, p50: 2, p95: 3, p99: 4, min: 1, max: 4, count: 10, devices: 2 },
  temperature_c: { mean: 75, p50: 75, p95: 77, p99: 78, min: 74, max: 78, count: 10, devices: 2 },
  vib_rms_g: { mean: 0.4, p50: 0.4, p95: 0.6, p99: 0.8, min: 0.2, max: 0.8, count: 10, devices: 2 },
  level_liters: { mean: 94, p50: 94, p95: 95, p99: 95, min: 93, max: 95, count: 10, devices: 2 },
};

function payload(overrides: Record<string, unknown> = {}) {
  return {
    as_of: "2026-10-10T09:00:00+00:00",
    window_s: 10,
    devices: 2,
    aggregates,
    ingest: {
      rows: { accepted_1s: 20, rejected_1s: 1 },
      queue: { depth: 2, capacity: 1000, dropped_batches: 0 },
      latency: { p50_s: 0.2, p99_s: 1.1 },
    },
    ...overrides,
  };
}

describe("fleet live logic", () => {
  test("derives websocket URL and preserves a configured path", () => {
    expect(deriveFleetWebSocketUrl("http://localhost:8000")).toBe("ws://localhost:8000/ws/fleet");
    expect(deriveFleetWebSocketUrl("https://example.test/oilguard/")).toBe("wss://example.test/oilguard/ws/fleet");
  });

  test("rejects incomplete payloads and parses nullable latency", () => {
    expect(parseFleetPayload({ ...payload(), devices: null })).toBe(null);
    const parsed = parseFleetPayload(payload({ ingest: undefined }));
    expect(parsed?.devices).toBe(2);
    expect(Object.keys(parsed?.metrics ?? {}).sort()).toEqual([
      "pressure_kpa", "temperature_c", "vib_rms_g",
    ]);
    expect(parsed?.latencyP99S).toBe(null);
  });

  test("classifies queue, drops, and latency thresholds", () => {
    const snapshot = parseFleetPayload(payload())!;
    expect(classifyLiveStatus(snapshot, 0)).toBe("keeping-up");
    expect(classifyLiveStatus({ ...snapshot, queueDepth: 801 }, 0)).toBe("backpressure");
    expect(classifyLiveStatus({ ...snapshot, droppedBatches: 1 }, 0)).toBe("backpressure");
    expect(classifyLiveStatus({ ...snapshot, latencyP99S: 5.01 }, 0)).toBe("lagging");
  });

  test("uses capped exponential reconnect delays", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(reconnectDelay)).toEqual([1, 2, 4, 8, 15, 15, 15]);
  });

  test("merges websocket and polling fields without losing metrics", () => {
    const first = parseFleetPayload(payload())!;
    const second = parseFleetPayload(payload({
      as_of: "2026-10-10T09:00:02+00:00",
      aggregates: {
        pressure_kpa: aggregates.pressure_kpa,
        level_liters: { mean: 94, p50: 94, p95: 95, p99: 95 },
      },
    }))!;
    const merged = mergeFleetSnapshots(first, second);
    expect(merged.asOf).toContain("09:00:02");
    expect("level_liters" in merged.metrics).toBe(false);
  });

  test("recognizes the backend no-rows response", () => {
    expect(isNoRowsPayload({ reason: "no_rows" })).toBe(true);
    expect(isNoRowsPayload({ code: "no_rows" })).toBe(true);
    expect(isNoRowsPayload({ reason: "other" })).toBe(false);
  });
});
