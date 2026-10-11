import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { t } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { demoDataset } from "../../demo/dataset";
import { DataTable, KpiTile, PageHeader, SyntheticBadge } from "../../ui/foundation";
import { useBackendOrDemo, type DataSource } from "../../ui/backendOrDemo";
import BackendOutageNotice from "../../ui/BackendOutageNotice";
import { getFleetDevices, getFleetOutages, getIngestMetrics, getPlatformHealth, fleetWebSocketUrl, type PlatformHealthResponse } from "../api";
import { deriveAvailabilitySegments, deriveDemoLinkKpis, deriveLinkKpis, paginateLinkItems, type LinkMetrics, type OutageRecord } from "./logic";
import "./link.css";

interface LinkData {
  metrics: LinkMetrics | null;
  devices: string[];
  outages: OutageRecord[];
  health: PlatformHealthResponse | null;
  asOf: number;
  kpis: ReturnType<typeof deriveLinkKpis> | null;
  demoKpis?: ReturnType<typeof deriveDemoLinkKpis>;
}

function demoLinkData(): LinkData {
  const devices = demoDataset.devices.map((device) => device.id);
  const outages = demoDataset.outages.map((outage) => ({
    deviceId: outage.deviceId,
    startMs: outage.start,
    endMs: outage.end,
    rowsBuffered: null,
    forwarded: null,
  }));
  return {
    metrics: null,
    devices,
    outages,
    health: null,
    asOf: demoDataset.referenceMs,
    kpis: null,
    demoKpis: deriveDemoLinkKpis(devices, outages, demoDataset.referenceMs),
  };
}
const DEMO_LINK_DATA = demoLinkData();

function numberOrDash(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined ? "—" : formatNumber(value, digits);
}

function formatTimestamp(value: number | null): string {
  if (value === null) return t("link.unknown");
  return new Intl.DateTimeFormat(t("link.locale"), {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function statusLabel(status: "keeping-up" | "backpressure" | "lagging"): string {
  return t(status === "backpressure" ? "link.status.backpressure" : status === "lagging" ? "link.status.lagging" : "link.status.keepingUp");
}

export function LinkFlowStatus({ connected, lastTickMs, demo }: { connected: boolean; lastTickMs: number | null; demo: boolean }) {
  return (
    <section className="link-health__feed" aria-live="polite">
      <div>
        <span className={`link-health__dot link-health__dot--${connected ? "live" : "demo"}`} />
        <strong>{t(connected ? "link.liveStrip" : "link.offlineStrip")}</strong>
        <span>{t(connected ? "link.connection.live" : "link.connection.disconnected")}</span>
      </div>
      {connected
        ? <small>{lastTickMs !== null ? `${t("link.lastTick")} · ${formatTimestamp(lastTickMs)}` : t("link.noTick")}</small>
        : demo && <p><SyntheticBadge /></p>}
    </section>
  );
}

export function LinkBackendOutageNotice({ source }: { source: DataSource }) {
  return source === "demo" ? <BackendOutageNotice /> : null;
}

export default function LinkHealthPage() {
  const [connection, setConnection] = useState<"connecting" | "live" | "polling">("connecting");
  const [lastTickMs, setLastTickMs] = useState<number | null>(null);
  const [timelinePageIndex, setTimelinePageIndex] = useState(1);
  const [outagePageIndex, setOutagePageIndex] = useState(1);
  const previousDroppedBatches = useRef<number | null>(null);
  const load = useCallback(async (): Promise<LinkData> => {
    const [metrics, devices, outages, health] = await Promise.all([
      getIngestMetrics(), getFleetDevices(), getFleetOutages(), getPlatformHealth(),
    ]);
    const kpis = deriveLinkKpis(metrics.ingest, previousDroppedBatches.current);
    previousDroppedBatches.current = metrics.ingest.queue.dropped_batches;
    return {
      metrics: metrics.ingest,
      devices: devices.devices.map((device) => device.device_id),
      outages: outages.outages.map((outage) => ({
        deviceId: outage.device_id,
        startMs: Date.parse(outage.start_t_iso),
        endMs: outage.end_t_iso ? Date.parse(outage.end_t_iso) : null,
        rowsBuffered: outage.rows_buffered,
        forwarded: outage.forwarded,
      })),
      health,
      asOf: Date.parse(metrics.as_of),
      kpis,
    } satisfies LinkData;
  }, []);
  const data = useBackendOrDemo<LinkData>(load, DEMO_LINK_DATA, 2_000);

  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let attempt = 0;
    const connect = () => {
      if (!active) return;
      setConnection("connecting");
      try {
        socket = new WebSocket(fleetWebSocketUrl());
        socket.onopen = () => { if (active) { attempt = 0; setConnection("live"); } };
        socket.onmessage = (event) => {
          try {
            const tick = JSON.parse(event.data as string) as { type?: string };
            if (tick.type === "fleet_tick" && active) setLastTickMs(Date.now());
          } catch {
            setLastTickMs(null);
          }
        };
        socket.onerror = () => socket?.close();
        socket.onclose = () => {
          if (!active) return;
          setConnection("polling");
          reconnectTimer = window.setTimeout(connect, Math.min(15, 2 ** attempt++) * 1000);
        };
      } catch {
        setConnection("polling");
        reconnectTimer = window.setTimeout(connect, Math.min(15, 2 ** attempt++) * 1000);
      }
    };
    connect();
    return () => {
      active = false;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  const payload = data.data;
  const nowMs = data.source === "demo" ? demoDataset.referenceMs : Date.now();
  const devices = payload?.devices ?? [];
  const outages = payload?.outages ?? [];
  const timelinePage = useMemo(() => paginateLinkItems(devices, timelinePageIndex, 12), [devices, timelinePageIndex]);
  const segments = useMemo(() => deriveAvailabilitySegments(outages, nowMs, 3_600_000, timelinePage.items), [outages, nowMs, timelinePage.items]);
  const labels = data.source === "demo" && payload?.demoKpis
    ? [
      { key: "demoDevices", value: numberOrDash(payload.demoKpis.devices, 0) },
      { key: "demoOutages", value: numberOrDash(payload.demoKpis.outages, 0) },
      { key: "demoAffected", value: numberOrDash(payload.demoKpis.affectedDevices, 0) },
      { key: "demoDuration", value: numberOrDash(payload.demoKpis.outageSeconds / 60, 1), unit: "min" },
    ]
    : [
      { key: "latency", value: payload?.kpis ? `${numberOrDash(payload.kpis.p50Ms)} / ${numberOrDash(payload.kpis.p99Ms)} ms` : "—" },
      { key: "acceptedRate", value: payload?.kpis ? numberOrDash(payload.kpis.acceptedRowsPerS, 0) : "—", unit: payload?.kpis ? "rows/s" : undefined },
      { key: "droppedBatches", value: payload?.kpis ? numberOrDash(payload.kpis.droppedBatches, 0) : "—" },
      { key: "queue", value: payload?.kpis ? `${numberOrDash(payload.kpis.queueDepth, 0)} / ${numberOrDash(payload.kpis.queueCapacity, 0)}` : "—" },
    ];
  const tableRows = outages.map((outage, index) => {
    const end = outage.endMs;
    const duration = Math.max(0, (Math.min(end ?? nowMs, nowMs) - outage.startMs) / 1000);
    return {
      id: `${outage.deviceId}-${index}`,
      state: "stale" as const,
      cells: {
        device: <code>{outage.deviceId}</code>,
        started: formatTimestamp(outage.startMs),
        ended: end === null ? t("link.unknown") : formatTimestamp(end),
        duration: `${formatNumber(duration / 60, 1)} min`,
        buffered: outage.rowsBuffered === null ? t("devices.notReported") : formatNumber(outage.rowsBuffered, 0),
        forwarded: outage.forwarded === null ? t("link.unknown") : t(outage.forwarded ? "link.yes" : "link.no"),
      },
    };
  });
  const outagePage = useMemo(() => paginateLinkItems(tableRows, outagePageIndex, 20), [tableRows, outagePageIndex]);
  const connected = data.source === "live" && connection === "live";
  const liveStatus = connected && payload?.kpis ? statusLabel(payload.kpis.status) : t("link.connection.disconnected");

  return <main className="link-health">
    <PageHeader eyebrow={t("link.eyebrow")} title={t("link.title")} description={t("link.description")} meta={data.source === "demo" ? <SyntheticBadge /> : <span className="link-health__source">{t(connected ? "devices.liveSource" : data.source === "live" ? "link.connection.disconnected" : "link.loading")}</span>} />
    <LinkBackendOutageNotice source={data.source} />
    <section className="link-health__kpis" aria-label={t("link.title")}>
      {labels.map(({ key, value, unit }) => <KpiTile label={t(`link.${key}` as "link.latency")} value={value} unit={unit} meta={key.startsWith("demo") ? t("link.demoProvenance") : key === "queue" && payload?.kpis ? liveStatus : undefined} tone={connected && payload?.kpis?.status === "lagging" ? "warning" : connected && payload?.kpis?.status === "backpressure" ? "critical" : "nominal"} />)}
    </section>
    <LinkFlowStatus connected={connected} lastTickMs={lastTickMs} demo={data.source === "demo"} />
    <section className="link-health__timeline" aria-labelledby="link-timeline-title">
      <div className="link-health__section-head"><h3 id="link-timeline-title">{t("link.availabilityTitle")}</h3><div className="link-health__legend"><span><i className="link-health__legend-available" />{t("link.availableLegend")}</span><span><i className="link-health__legend-outage" />{t("link.outageLegend")}</span></div></div>
      <div className="link-health__time-scale"><span>−60 min</span><span>−30 min</span><span>{t("devices.lastSeenNow")}</span></div>
      {timelinePage.items.map((deviceId) => <div className="link-health__device-row"><code>{deviceId}</code><div className="link-health__track"><span className="link-health__available" />{segments.filter((segment) => segment.deviceId === deviceId).map((segment) => <i className="link-health__outage" style={{ left: `${segment.leftPct}%`, width: `${segment.widthPct}%` }} />)}</div></div>)}
      {devices.length === 0 && <p className="link-health__empty">{t("link.emptyDevices")}</p>}
      {timelinePage.pageCount > 1 && <nav className="link-health__pagination" aria-label={t("link.availabilityTitle")}><span>{t("link.pagination")} {formatNumber((timelinePage.page - 1) * 12 + 1, 0)}–{formatNumber(Math.min(timelinePage.page * 12, timelinePage.total), 0)} / {formatNumber(timelinePage.total, 0)}</span><div><button type="button" disabled={timelinePage.page === 1} onClick={() => setTimelinePageIndex(timelinePage.page - 1)}>{t("link.previous")}</button><span>{formatNumber(timelinePage.page, 0)} / {formatNumber(timelinePage.pageCount, 0)}</span><button type="button" disabled={timelinePage.page === timelinePage.pageCount} onClick={() => setTimelinePageIndex(timelinePage.page + 1)}>{t("link.next")}</button></div></nav>}
    </section>
    <section className="link-health__outages">
      <div className="link-health__section-head"><h3>{t("link.outageTitle")}</h3>{data.source === "demo" && <SyntheticBadge />}</div>
      <DataTable caption={t("link.outageTitle")} columns={[{ key: "device", label: t("link.device") }, { key: "started", label: t("link.started") }, { key: "ended", label: t("link.ended") }, { key: "duration", label: t("link.duration") }, { key: "buffered", label: t("link.buffered") }, { key: "forwarded", label: t("link.forwarded") }]} rows={outagePage.items} />
      {tableRows.length === 0 && <p className="link-health__empty">{t("link.noOutages")}</p>}
      {outagePage.pageCount > 1 && <nav className="link-health__pagination" aria-label={t("link.outageTitle")}><span>{t("link.pagination")} {formatNumber((outagePage.page - 1) * 20 + 1, 0)}–{formatNumber(Math.min(outagePage.page * 20, outagePage.total), 0)} / {formatNumber(outagePage.total, 0)}</span><div><button type="button" disabled={outagePage.page === 1} onClick={() => setOutagePageIndex(outagePage.page - 1)}>{t("link.previous")}</button><span>{formatNumber(outagePage.page, 0)} / {formatNumber(outagePage.pageCount, 0)}</span><button type="button" disabled={outagePage.page === outagePage.pageCount} onClick={() => setOutagePageIndex(outagePage.page + 1)}>{t("link.next")}</button></div></nav>}
    </section>
    <aside className="link-health__mqtt"><span className="link-health__mqtt-label">MQTT</span><p>{t("link.mqttNote")}</p><small>{payload?.health?.mqtt.topic ?? "oilguard/signals"}</small></aside>
  </main>;
}
