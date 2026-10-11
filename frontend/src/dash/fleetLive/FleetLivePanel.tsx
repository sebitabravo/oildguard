import { useEffect, useRef, useState } from "preact/hooks";
import {
  BACKEND_URL,
  getFleetAggregates,
  getIngestMetrics,
} from "../../sim/api";
import { formatNumber } from "../../i18n/numberFormat";
import { t, type DictKey } from "../../i18n";
import { FleetFieldSource } from "../../ops/fleet/FleetPage";
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

export function FleetLiveTelemetryFields({ snapshot }: { snapshot: FleetLiveSnapshot }) {
  return (
    <>
      <div className="og-fleet-live__meta">
        <span>{t("dash.live.window", { value: formatNumber(snapshot.windowS, 0) })} <FleetFieldSource source="LIVE" /></span>
        <span>{t("dash.live.asOf", { value: snapshot.asOf })} <FleetFieldSource source="LIVE" /></span>
      </div>
      <div className="og-fleet-live__overview">
        <div><strong>{formatNumber(snapshot.devices, 0)}</strong><span>{t("dash.live.devices")}</span> <FleetFieldSource source="LIVE" /></div>
        <div><strong>{formatNumber(snapshot.acceptedRowsPerS, 1)}</strong><span>{t("dash.live.accepted")}</span> <FleetFieldSource source="LIVE" /></div>
        <div><strong>{formatNumber(snapshot.rejectedRowsPerS, 1)}</strong><span>{t("dash.live.rejected")}</span> <FleetFieldSource source="LIVE" /></div>
        <div><strong>{formatNumber(snapshot.droppedBatches, 0)}</strong><span>{t("dash.live.dropped")}</span> <FleetFieldSource source="LIVE" /></div>
        <div><strong>{snapshot.latencyP50S === null ? "—" : formatNumber(snapshot.latencyP50S, 3)}</strong><span>{t("dash.live.p50")}</span> <FleetFieldSource source="LIVE" /></div>
        <div><strong>{snapshot.latencyP99S === null ? "—" : formatNumber(snapshot.latencyP99S, 3)}</strong><span>{t("dash.live.p99")}</span> <FleetFieldSource source="LIVE" /></div>
        <div><strong>{formatNumber(snapshot.queueDepth, 0)} / {formatNumber(snapshot.queueCapacity, 0)}</strong><span>{t("dash.live.queue")}</span> <FleetFieldSource source="LIVE" /></div>
      </div>
      <div className="og-fleet-live__metrics">
        {Object.entries(METRIC_LABELS).map(([metric, label]) => {
          const key = metric as LiveMetric;
          const values = snapshot.metrics[key];
          if (!values) return null;
          return (
            <div className="og-fleet-live__metric" key={key}>
              <h3>{t(label as DictKey)} <span>({metricUnit(key)})</span></h3>
              <div>
                <span><strong>{formatNumber(values.p50, metricDigits(key))}</strong><small>{t("dash.live.p50")}</small> <FleetFieldSource source="LIVE" /></span>
                <span><strong>{formatNumber(values.p95, metricDigits(key))}</strong><small>{t("dash.live.p95")}</small> <FleetFieldSource source="LIVE" /></span>
                <span><strong>{formatNumber(values.p99, metricDigits(key))}</strong><small>{t("dash.live.p99")}</small> <FleetFieldSource source="LIVE" /></span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function statusLabel(status: LiveStatus): string {
  return t(
    status === "backpressure"
      ? "dash.live.status.backpressure"
      : status === "lagging"
        ? "dash.live.status.lagging"
        : "dash.live.status.keepingUp",
  );
}

export function FleetLivePanelView({ snapshot, state, previousDropped = null }: { snapshot: FleetLiveSnapshot | null; state: LiveConnectionState; previousDropped?: number | null }) {
  if (state === "empty" && !snapshot) return null;
  const connected = state === "live";
  const status = snapshot && connected ? classifyLiveStatus(snapshot, previousDropped) : null;
  const statusClass = !connected || status === "backpressure" || status === "lagging"
    ? "og-fleet-live__status--amber"
    : "og-fleet-live__status--green";

  return (
    <section className="og-fleet-live" aria-labelledby="og-fleet-live-title">
      <div className="og-fleet-live__heading">
        <div>
          <h2 id="og-fleet-live-title" className="og-dashboard-sheet-title">
            {t(connected ? "dash.live.title" : "fleet.telemetry.offlineTitle")}
          </h2>
          <p>{t(connected ? "dash.live.caption" : "fleet.telemetry.offlineCaption")}</p>
        </div>
        <span className={`og-fleet-live__status ${statusClass}`}>
          <span aria-hidden="true">●</span> {connected ? status ? statusLabel(status) : t("dash.live.connected") : t("fleet.telemetry.offlineStatus")}
        </span>
      </div>
      {connected && snapshot
        ? <FleetLiveTelemetryFields snapshot={snapshot} />
        : null}
    </section>
  );
}

export default function FleetLivePanel() {
  const [snapshot, setSnapshot] = useState<FleetLiveSnapshot | null>(null);
  const [state, setState] = useState<LiveConnectionState>("connecting");
  const [previousDropped, setPreviousDropped] = useState<number | null>(null);
  const reconnectAttempt = useRef(0);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let pollTimer: number | undefined;

    const applyPayload = (payload: unknown, fromSocket = false) => {
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
      setState(fromSocket ? "live" : "polling");
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
      setState("polling");
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
            applyPayload(JSON.parse(event.data as string), true);
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

  return <FleetLivePanelView snapshot={snapshot} state={state} previousDropped={previousDropped} />;
}
