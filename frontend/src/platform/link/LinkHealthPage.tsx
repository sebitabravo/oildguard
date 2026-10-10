import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { t, useLang } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { demoDataset } from "../../demo/dataset";
import { DataTable, KpiTile, PageHeader, SyntheticBadge } from "../../ui/foundation";
import { useBackendOrDemo } from "../../ui/backendOrDemo";
import { getFleetDevices, getFleetOutages, getIngestMetrics, getPlatformHealth, fleetWebSocketUrl, type PlatformHealthResponse } from "../api";
import { deriveAvailabilitySegments, deriveLinkKpis, paginateLinkItems, type LinkMetrics, type OutageRecord } from "./logic";
import "./link.css";

interface LinkData {
  metrics: LinkMetrics | null;
  devices: string[];
  outages: OutageRecord[];
  health: PlatformHealthResponse | null;
  asOf: number;
  kpis: ReturnType<typeof deriveLinkKpis> | null;
}

function demoLinkData(): LinkData {
  return {
    metrics: null,
    devices: demoDataset.devices.map((device) => device.id),
    outages: demoDataset.outages.map((outage) => ({
      deviceId: outage.deviceId,
      startMs: outage.start,
      endMs: outage.end,
      rowsBuffered: null,
      forwarded: null,
    })),
    health: null,
    asOf: demoDataset.referenceMs,
    kpis: null,
  };
}
const DEMO_LINK_DATA = demoLinkData();

function numberOrDash(value: number | null | undefined, lang: "en" | "es", digits = 1): string {
  return value === null || value === undefined ? "—" : formatNumber(value, lang, digits);
}

function formatTimestamp(value: number | null, lang: "en" | "es"): string {
  if (value === null) return t("link.unknown", lang);
  return new Intl.DateTimeFormat(t("link.locale", lang), {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function statusLabel(status: "keeping-up" | "backpressure" | "lagging", lang: "en" | "es"): string {
  return t(status === "backpressure" ? "link.status.backpressure" : status === "lagging" ? "link.status.lagging" : "link.status.keepingUp", lang);
}

export default function LinkHealthPage() {
  const [lang] = useLang();
  const [connection, setConnection] = useState<"connecting" | "live" | "polling">("connecting");
  const [lastTickMs, setLastTickMs] = useState<number | null>(null);
  const [timelinePageIndex, setTimelinePageIndex] = useState(1);
  const [outagePageIndex, setOutagePageIndex] = useState(1);
  const previousDroppedBatches = useRef<number | null>(null);
  const load = useCallback(async () => {
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
  const data = useBackendOrDemo(load, DEMO_LINK_DATA, 2_000);

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
  const labels = [
    { key: "latency", value: payload?.kpis ? `${numberOrDash(payload.kpis.p50Ms, lang)} / ${numberOrDash(payload.kpis.p99Ms, lang)} ms` : "—" },
    { key: "acceptedRate", value: payload?.kpis ? numberOrDash(payload.kpis.acceptedRowsPerS, lang, 0) : "—", unit: payload?.kpis ? "rows/s" : undefined },
    { key: "droppedBatches", value: payload?.kpis ? numberOrDash(payload.kpis.droppedBatches, lang, 0) : "—" },
    { key: "queue", value: payload?.kpis ? `${numberOrDash(payload.kpis.queueDepth, lang, 0)} / ${numberOrDash(payload.kpis.queueCapacity, lang, 0)}` : "—" },
  ];
  const tableRows = outages.map((outage, index) => {
    const end = outage.endMs;
    const duration = Math.max(0, (Math.min(end ?? nowMs, nowMs) - outage.startMs) / 1000);
    return {
      id: `${outage.deviceId}-${index}`,
      state: "stale" as const,
      cells: {
        device: <code>{outage.deviceId}</code>,
        started: formatTimestamp(outage.startMs, lang),
        ended: end === null ? t("link.unknown", lang) : formatTimestamp(end, lang),
        duration: `${formatNumber(duration / 60, lang, 1)} min`,
        buffered: outage.rowsBuffered === null ? t("devices.notReported", lang) : formatNumber(outage.rowsBuffered, lang, 0),
        forwarded: outage.forwarded === null ? t("link.unknown", lang) : t(outage.forwarded ? "link.yes" : "link.no", lang),
      },
    };
  });
  const outagePage = useMemo(() => paginateLinkItems(tableRows, outagePageIndex, 20), [tableRows, outagePageIndex]);
  const connectionKey = data.source === "demo" ? "link.connection.demo" : connection === "live" ? "link.connection.live" : connection === "polling" ? "link.connection.polling" : "link.connection.connecting";
  const liveStatus = payload?.kpis ? statusLabel(payload.kpis.status, lang) : t("link.demoMetrics", lang);

  return <main className="link-health">
    <PageHeader title={t("link.title", lang)} description={t("link.description", lang)} meta={data.source === "demo" ? <SyntheticBadge lang={lang} /> : <span className="link-health__source">{t(data.source === "live" ? "devices.liveSource" : "link.loading", lang)}</span>} />
    <section className="link-health__kpis" aria-label={t("link.title", lang)}>
      {labels.map(({ key, value, unit }) => <KpiTile lang={lang} label={t(`link.${key}` as "link.latency", lang)} value={value} unit={unit} meta={key === "queue" && payload?.kpis ? liveStatus : undefined} tone={payload?.kpis?.status === "lagging" ? "warning" : payload?.kpis?.status === "backpressure" ? "critical" : "nominal"} />)}
    </section>
    <section className="link-health__feed" aria-live="polite">
      <div><span className={`link-health__dot link-health__dot--${data.source === "demo" ? "demo" : connection}`} /><strong>{t("link.liveStrip", lang)}</strong><span>{t(connectionKey, lang)}</span></div>
      <small>{lastTickMs === null ? t("link.noTick", lang) : `${t("link.lastTick", lang)} · ${formatTimestamp(lastTickMs, lang)}`}</small>
    </section>
    {data.source === "demo" && <div className="link-health__demo-note"><SyntheticBadge lang={lang} /><span>{t("link.demoMetrics", lang)}</span></div>}
    <section className="link-health__timeline" aria-labelledby="link-timeline-title">
      <div className="link-health__section-head"><h3 id="link-timeline-title">{t("link.availabilityTitle", lang)}</h3><div className="link-health__legend"><span><i className="link-health__legend-available" />{t("link.availableLegend", lang)}</span><span><i className="link-health__legend-outage" />{t("link.outageLegend", lang)}</span></div></div>
      <div className="link-health__time-scale"><span>−60 min</span><span>−30 min</span><span>{t("devices.lastSeenNow", lang)}</span></div>
      {timelinePage.items.map((deviceId) => <div className="link-health__device-row"><code>{deviceId}</code><div className="link-health__track"><span className="link-health__available" />{segments.filter((segment) => segment.deviceId === deviceId).map((segment) => <i className="link-health__outage" style={{ left: `${segment.leftPct}%`, width: `${segment.widthPct}%` }} />)}</div></div>)}
      {devices.length === 0 && <p className="link-health__empty">{t("link.emptyDevices", lang)}</p>}
      {timelinePage.pageCount > 1 && <nav className="link-health__pagination" aria-label={t("link.availabilityTitle", lang)}><span>{t("link.pagination", lang)} {formatNumber((timelinePage.page - 1) * 12 + 1, lang, 0)}–{formatNumber(Math.min(timelinePage.page * 12, timelinePage.total), lang, 0)} / {formatNumber(timelinePage.total, lang, 0)}</span><div><button type="button" disabled={timelinePage.page === 1} onClick={() => setTimelinePageIndex(timelinePage.page - 1)}>{t("link.previous", lang)}</button><span>{formatNumber(timelinePage.page, lang, 0)} / {formatNumber(timelinePage.pageCount, lang, 0)}</span><button type="button" disabled={timelinePage.page === timelinePage.pageCount} onClick={() => setTimelinePageIndex(timelinePage.page + 1)}>{t("link.next", lang)}</button></div></nav>}
    </section>
    <section className="link-health__outages">
      <div className="link-health__section-head"><h3>{t("link.outageTitle", lang)}</h3>{data.source === "demo" && <SyntheticBadge lang={lang} />}</div>
      <DataTable lang={lang} caption={t("link.outageTitle", lang)} columns={[{ key: "device", label: t("link.device", lang) }, { key: "started", label: t("link.started", lang) }, { key: "ended", label: t("link.ended", lang) }, { key: "duration", label: t("link.duration", lang) }, { key: "buffered", label: t("link.buffered", lang) }, { key: "forwarded", label: t("link.forwarded", lang) }]} rows={outagePage.items} />
      {tableRows.length === 0 && <p className="link-health__empty">{t("link.noOutages", lang)}</p>}
      {outagePage.pageCount > 1 && <nav className="link-health__pagination" aria-label={t("link.outageTitle", lang)}><span>{t("link.pagination", lang)} {formatNumber((outagePage.page - 1) * 20 + 1, lang, 0)}–{formatNumber(Math.min(outagePage.page * 20, outagePage.total), lang, 0)} / {formatNumber(outagePage.total, lang, 0)}</span><div><button type="button" disabled={outagePage.page === 1} onClick={() => setOutagePageIndex(outagePage.page - 1)}>{t("link.previous", lang)}</button><span>{formatNumber(outagePage.page, lang, 0)} / {formatNumber(outagePage.pageCount, lang, 0)}</span><button type="button" disabled={outagePage.page === outagePage.pageCount} onClick={() => setOutagePageIndex(outagePage.page + 1)}>{t("link.next", lang)}</button></div></nav>}
    </section>
    <aside className="link-health__mqtt"><span className="link-health__mqtt-label">MQTT</span><p>{t("link.mqttNote", lang)}</p><small>{payload?.health?.mqtt.topic ?? "oilguard/signals"}</small></aside>
  </main>;
}
