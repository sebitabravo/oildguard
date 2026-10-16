export const LIVE_METRICS = [
  "pressure_kpa",
  "temperature_c",
  "vib_rms_g",
] as const;

export type LiveMetric = (typeof LIVE_METRICS)[number];

export interface LiveMetricSummary {
  p50: number;
  p95: number;
  p99: number;
}

export interface FleetLiveSnapshot {
  asOf: string;
  windowS: number;
  devices: number;
  acceptedRowsPerS: number;
  rejectedRowsPerS: number;
  droppedBatches: number;
  latencyP50S: number | null;
  latencyP99S: number | null;
  queueDepth: number;
  queueCapacity: number;
  metrics: Partial<Record<LiveMetric, LiveMetricSummary>>;
}

export type LiveConnectionState = "connecting" | "live" | "polling" | "empty";
export type LiveStatus = "keeping-up" | "backpressure" | "lagging";

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function requiredNumber(value: unknown): number | null {
  return finite(value) ? value : null;
}

function metricSummary(value: unknown): LiveMetricSummary | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const p50 = requiredNumber(record.p50);
  const p95 = requiredNumber(record.p95);
  const p99 = requiredNumber(record.p99);
  return p50 !== null && p95 !== null && p99 !== null ? { p50, p95, p99 } : null;
}

export function deriveFleetWebSocketUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/ws/fleet`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function parseFleetPayload(payload: unknown): FleetLiveSnapshot | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const aggregates = root.aggregates;
  const ingest = root.ingest;
  if (!aggregates || typeof aggregates !== "object") return null;

  const devices = requiredNumber(root.devices);
  const windowS = requiredNumber(root.window_s);
  const asOf = typeof root.as_of === "string" ? root.as_of : null;
  if (devices === null || windowS === null || !asOf) return null;

  const metricValues: Partial<Record<LiveMetric, LiveMetricSummary>> = {};
  const aggregateRecord = aggregates as Record<string, unknown>;
  for (const metric of LIVE_METRICS) {
    const summary = metricSummary(aggregateRecord[metric]);
    if (summary) metricValues[metric] = summary;
  }

  let acceptedRowsPerS = 0;
  let rejectedRowsPerS = 0;
  let droppedBatches = 0;
  let latencyP50S: number | null = null;
  let latencyP99S: number | null = null;
  let queueDepth = 0;
  let queueCapacity = 0;
  if (ingest && typeof ingest === "object") {
    const ingestRecord = ingest as Record<string, unknown>;
    const rows = ingestRecord.rows;
    const queue = ingestRecord.queue;
    const latency = ingestRecord.latency;
    if (rows && typeof rows === "object") {
      const rowRecord = rows as Record<string, unknown>;
      acceptedRowsPerS = requiredNumber(rowRecord.accepted_1s) ?? 0;
      rejectedRowsPerS = requiredNumber(rowRecord.rejected_1s) ?? 0;
    }
    if (queue && typeof queue === "object") {
      const queueRecord = queue as Record<string, unknown>;
      droppedBatches = requiredNumber(queueRecord.dropped_batches) ?? 0;
      queueDepth = requiredNumber(queueRecord.depth) ?? 0;
      queueCapacity = requiredNumber(queueRecord.capacity) ?? 0;
    }
    if (latency && typeof latency === "object") {
      const latencyRecord = latency as Record<string, unknown>;
      latencyP50S = requiredNumber(latencyRecord.p50_s);
      latencyP99S = requiredNumber(latencyRecord.p99_s);
    }
  }

  return {
    asOf,
    windowS,
    devices,
    acceptedRowsPerS,
    rejectedRowsPerS,
    droppedBatches,
    latencyP50S,
    latencyP99S,
    queueDepth,
    queueCapacity,
    metrics: metricValues,
  };
}

export function mergeFleetSnapshots(
  current: FleetLiveSnapshot | null,
  incoming: FleetLiveSnapshot,
): FleetLiveSnapshot {
  if (!current) return incoming;
  return {
    ...current,
    ...incoming,
    metrics: { ...current.metrics, ...incoming.metrics },
  };
}

export function classifyLiveStatus(
  snapshot: FleetLiveSnapshot,
  previousDroppedBatches: number | null,
): LiveStatus {
  const queueIsFull = snapshot.queueCapacity > 0 &&
    snapshot.queueDepth > snapshot.queueCapacity * 0.8;
  const dropsIncreasing = previousDroppedBatches !== null &&
    snapshot.droppedBatches > previousDroppedBatches;
  if (queueIsFull || dropsIncreasing) return "backpressure";
  if (snapshot.latencyP99S !== null && snapshot.latencyP99S > 5) return "lagging";
  return "keeping-up";
}

export function reconnectDelay(attempt: number): number {
  return Math.min(15, 2 ** Math.max(0, attempt));
}

export function isNoRowsPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  return record.reason === "no_rows" || record.code === "no_rows";
}
