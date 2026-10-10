import { describe, expect, test } from "bun:test";
import { deriveAvailabilitySegments, deriveLinkKpis, paginateLinkItems, type OutageRecord } from "./logic";

const hour = 3_600_000;

describe("link health logic", () => {
  test("clips outages to the selected hour and scales outage segments", () => {
    const outages: OutageRecord[] = [
      { deviceId: "wheel-A", startMs: 0, endMs: 600_000, rowsBuffered: 4, forwarded: null },
      { deviceId: "wheel-A", startMs: 3_240_000, endMs: null, rowsBuffered: 2, forwarded: null },
      { deviceId: "wheel-B", startMs: 600_000, endMs: 900_000, rowsBuffered: 1, forwarded: null },
    ];
    expect(deriveAvailabilitySegments(outages, 3_600_000, hour, ["wheel-A"])).toEqual([
      { deviceId: "wheel-A", leftPct: 0, widthPct: 16.666666666666664 },
      { deviceId: "wheel-A", leftPct: 90, widthPct: 10 },
    ]);
  });

  test("derives ingest KPIs and uses fleet live-status thresholds", () => {
    const metrics = {
      latency: { p50_s: 0.025, p99_s: 0.12 },
      rows: { accepted_1s: 42 },
      queue: { depth: 20, capacity: 100, dropped_batches: 0 },
    };
    expect(deriveLinkKpis(metrics, 0)).toEqual({ p50Ms: 25, p99Ms: 120, acceptedRowsPerS: 42, droppedBatches: 0, queueDepth: 20, queueCapacity: 100, status: "keeping-up" });
    expect(deriveLinkKpis({ ...metrics, queue: { ...metrics.queue, depth: 90 } }, 0).status).toBe("backpressure");
    expect(deriveLinkKpis({ ...metrics, latency: { ...metrics.latency, p99_s: 5.1 } }, 0).status).toBe("lagging");
  });

  test("paginates device timelines so large fleets stay navigable", () => {
    expect(paginateLinkItems(["a", "b", "c"], 2, 2)).toEqual({ items: ["c"], page: 2, pageCount: 2, total: 3 });
  });
});
