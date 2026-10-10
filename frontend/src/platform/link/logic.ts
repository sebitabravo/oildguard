import { classifyLiveStatus, type FleetLiveSnapshot } from "../../dash/fleetLive/logic";

export interface OutageRecord {
  deviceId: string;
  startMs: number;
  endMs: number | null;
  rowsBuffered: number | null;
  forwarded: boolean | null;
}

export function deriveAvailabilitySegments(
  outages: OutageRecord[],
  nowMs: number,
  windowMs: number,
  deviceIds: string[],
): Array<{ deviceId: string; leftPct: number; widthPct: number }> {
  if (!Number.isFinite(nowMs) || !Number.isFinite(windowMs) || windowMs <= 0) return [];
  const windowStart = nowMs - windowMs;
  return outages.flatMap((outage) => {
    if (!deviceIds.includes(outage.deviceId)) return [];
    const start = Math.max(windowStart, outage.startMs);
    const end = Math.min(nowMs, outage.endMs ?? nowMs);
    if (end <= start) return [];
    return [{
      deviceId: outage.deviceId,
      leftPct: ((start - windowStart) / windowMs) * 100,
      widthPct: ((end - start) / windowMs) * 100,
    }];
  });
}

export interface LinkMetrics {
  latency?: { p50_s?: number | null; p99_s?: number | null };
  rows?: { accepted_1s?: number };
  queue?: { depth?: number; capacity?: number; dropped_batches?: number };
}

export function deriveDemoLinkKpis(deviceIds: string[], outages: OutageRecord[], nowMs: number) {
  const outageSeconds = outages.reduce((sum, outage) => {
    const end = Math.min(outage.endMs ?? nowMs, nowMs);
    return sum + Math.max(0, (end - outage.startMs) / 1000);
  }, 0);
  return {
    devices: deviceIds.length,
    outages: outages.length,
    affectedDevices: new Set(outages.map((outage) => outage.deviceId)).size,
    outageSeconds,
  };
}

export function paginateLinkItems<T>(items: T[], requestedPage: number, pageSize: number) {
  const size = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(pageCount, Math.max(1, Math.floor(requestedPage)));
  return { items: items.slice((page - 1) * size, page * size), page, pageCount, total: items.length };
}

export function deriveLinkKpis(metrics: LinkMetrics, previousDroppedBatches: number | null) {
  const snapshot: FleetLiveSnapshot = {
    asOf: "",
    windowS: 1,
    devices: 0,
    acceptedRowsPerS: metrics.rows?.accepted_1s ?? 0,
    rejectedRowsPerS: 0,
    droppedBatches: metrics.queue?.dropped_batches ?? 0,
    latencyP50S: metrics.latency?.p50_s ?? null,
    latencyP99S: metrics.latency?.p99_s ?? null,
    queueDepth: metrics.queue?.depth ?? 0,
    queueCapacity: metrics.queue?.capacity ?? 0,
    metrics: {},
  };
  return {
    p50Ms: snapshot.latencyP50S === null ? null : snapshot.latencyP50S * 1000,
    p99Ms: snapshot.latencyP99S === null ? null : snapshot.latencyP99S * 1000,
    acceptedRowsPerS: snapshot.acceptedRowsPerS,
    droppedBatches: snapshot.droppedBatches,
    queueDepth: snapshot.queueDepth,
    queueCapacity: snapshot.queueCapacity,
    status: classifyLiveStatus(snapshot, previousDroppedBatches),
  };
}
