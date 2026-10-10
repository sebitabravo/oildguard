import { useEffect, useRef, useState } from "preact/hooks";
import {
  BACKEND_URL,
  getFleetAggregates,
  getIngestMetrics,
} from "../../sim/api";
import { formatNumber } from "../../i18n/numberFormat";
import { t, type DictKey, type Lang } from "../../i18n";
import {
  classifyLiveStatus,
  deriveFleetWebSocketUrl,
  isNoRowsPayload,
  mergeFleetSnapshots,
  parseFleetPayload,
  reconnectDelay,
  type FleetLiveSnapshot,
  type LiveConnectionState,
  type LiveMetric,
  type LiveStatus,
} from "./logic";

interface Props {
  lang: Lang;
}

const METRIC_LABELS: Record<LiveMetric, string> = {
  pressure_kpa: "dash.live.metric.pressure",
  temperature_c: "dash.live.metric.temperature",
  vib_rms_g: "dash.live.metric.vibration",
  level_liters: "dash.live.metric.level",
};

function metricUnit(metric: LiveMetric): string {
  if (metric === "pressure_kpa") return "kPa";
  if (metric === "temperature_c") return "°C";
  if (metric === "vib_rms_g") return "g";
  return "L";
}

function metricDigits(metric: LiveMetric): number {
  return metric === "temperature_c" || metric === "level_liters" ? 1 : 2;
}

function statusLabel(status: LiveStatus, lang: Lang): string {
  return t(
    status === "backpressure"
      ? "dash.live.status.backpressure"
      : status === "lagging"
        ? "dash.live.status.lagging"
        : "dash.live.status.keepingUp",
    lang,
  );
}

function stateLabel(state: LiveConnectionState, lang: Lang): string {
  return t(
    state === "connecting"
      ? "dash.live.waiting"
      : state === "polling"
        ? "dash.live.polling"
        : "dash.live.connected",
    lang,
  );
}

export default function FleetLivePanel({ lang }: Props) {
  const [snapshot, setSnapshot] = useState<FleetLiveSnapshot | null>(null);
  const [state, setState] = useState<LiveConnectionState>("connecting");
  const [previousDropped, setPreviousDropped] = useState<number | null>(null);
  const reconnectAttempt = useRef(0);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let pollTimer: number | undefined;

    const applyPayload = (payload: unknown) => {
      if (disposed) return;
      if (isNoRowsPayload(payload)) {
        setSnapshot(null);
        setState("empty");
        return;
      }
      const parsed = parseFleetPayload(payload);
      if (!parsed) return;
      setSnapshot((current) => mergeFleetSnapshots(current, parsed));
      setPreviousDropped((current) => parsed.droppedBatches || current);
      setState("live");
    };

    const poll = async () => {
      try {
        const [aggregateResponse, metricsResponse] = await Promise.all([
          getFleetAggregates(10),
          getIngestMetrics(),
        ]);
        const aggregatePayload = aggregateResponse.reason === "no_rows"
          ? aggregateResponse
          : {
              ...aggregateResponse,
              ingest: metricsResponse.ingest,
            };
        applyPayload(aggregatePayload);
      } catch {
        if (!disposed) setState((current) => current === "empty" ? current : "polling");
      }
    };

    const startPolling = () => {
      if (pollTimer === undefined) {
        void poll();
        pollTimer = window.setInterval(() => void poll(), 2000);
      }
    };

    const connect = () => {
      if (disposed) return;
      setState("connecting");
      try {
        socket = new WebSocket(deriveFleetWebSocketUrl(BACKEND_URL));
        socket.onopen = () => {
          reconnectAttempt.current = 0;
          if (pollTimer !== undefined) {
            window.clearInterval(pollTimer);
            pollTimer = undefined;
          }
          setState("live");
        };
        socket.onmessage = (event) => {
          try {
            applyPayload(JSON.parse(event.data as string));
          } catch {
            // El backend puede cerrar una conexión con un mensaje incompleto.
          }
        };
        socket.onerror = () => socket?.close();
        socket.onclose = () => {
          if (disposed) return;
          startPolling();
          const delay = reconnectDelay(reconnectAttempt.current);
          reconnectAttempt.current += 1;
          reconnectTimer = window.setTimeout(connect, delay * 1000);
        };
      } catch {
        startPolling();
        const delay = reconnectDelay(reconnectAttempt.current);
        reconnectAttempt.current += 1;
        reconnectTimer = window.setTimeout(connect, delay * 1000);
      }
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      if (pollTimer !== undefined) window.clearInterval(pollTimer);
      socket?.close();
    };
  }, []);

  if (state === "empty" && !snapshot) return null;
  const status = snapshot ? classifyLiveStatus(snapshot, previousDropped) : null;
  const statusClass = status === "backpressure"
    ? "og-fleet-live__status--amber"
    : status === "lagging"
      ? "og-fleet-live__status--amber"
      : "og-fleet-live__status--green";

  return (
    <section className="og-fleet-live" aria-labelledby="og-fleet-live-title">
      <div className="og-fleet-live__heading">
        <div>
          <h2 id="og-fleet-live-title" className="og-dashboard-sheet-title">
            {t("dash.live.title", lang)}
          </h2>
          <p>{t("dash.live.caption", lang)}</p>
        </div>
        <span className={`og-fleet-live__status ${statusClass}`}>
          <span aria-hidden="true">●</span> {status ? statusLabel(status, lang) : stateLabel(state, lang)}
        </span>
      </div>
      {!snapshot ? (
        <p className="og-fleet-live__waiting">{stateLabel(state, lang)}</p>
      ) : (
        <>
          <div className="og-fleet-live__meta">
            <span>{t("dash.live.window", lang, { value: formatNumber(snapshot.windowS, lang, 0) })}</span>
            <span>{t("dash.live.asOf", lang, { value: snapshot.asOf })}</span>
          </div>
          <div className="og-fleet-live__overview">
            <div><strong>{formatNumber(snapshot.devices, lang, 0)}</strong><span>{t("dash.live.devices", lang)}</span></div>
            <div><strong>{formatNumber(snapshot.acceptedRowsPerS, lang, 1)}</strong><span>{t("dash.live.accepted", lang)}</span></div>
            <div><strong>{formatNumber(snapshot.rejectedRowsPerS, lang, 1)}</strong><span>{t("dash.live.rejected", lang)}</span></div>
            <div><strong>{formatNumber(snapshot.droppedBatches, lang, 0)}</strong><span>{t("dash.live.dropped", lang)}</span></div>
            <div><strong>{snapshot.latencyP50S === null ? "—" : formatNumber(snapshot.latencyP50S, lang, 3)}</strong><span>{t("dash.live.p50", lang)}</span></div>
            <div><strong>{snapshot.latencyP99S === null ? "—" : formatNumber(snapshot.latencyP99S, lang, 3)}</strong><span>{t("dash.live.p99", lang)}</span></div>
            <div><strong>{formatNumber(snapshot.queueDepth, lang, 0)} / {formatNumber(snapshot.queueCapacity, lang, 0)}</strong><span>{t("dash.live.queue", lang)}</span></div>
          </div>
          <div className="og-fleet-live__metrics">
            {Object.entries(METRIC_LABELS).map(([metric, label]) => {
              const key = metric as LiveMetric;
              const values = snapshot.metrics[key];
              if (!values) return null;
              return (
                <div className="og-fleet-live__metric" key={key}>
                  <h3>{t(label as DictKey, lang)} <span>({metricUnit(key)})</span></h3>
                  <div>
                    <span><strong>{formatNumber(values.p50, lang, metricDigits(key))}</strong><small>{t("dash.live.p50", lang)}</small></span>
                    <span><strong>{formatNumber(values.p95, lang, metricDigits(key))}</strong><small>{t("dash.live.p95", lang)}</small></span>
                    <span><strong>{formatNumber(values.p99, lang, metricDigits(key))}</strong><small>{t("dash.live.p99", lang)}</small></span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
