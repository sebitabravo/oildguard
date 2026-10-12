import type { DashAlert } from "../sim/api";
import type { RestWindow } from "../sim/signals";
import { t } from "../i18n";
import { formatNumber } from "../i18n/numberFormat";
import { SyncChart, type SyncChartSeries } from "../ui/foundation";
import { ALERT_SEVERITY_COLORS } from "./alertSeverity";

export interface ChartPoint {
  t_s: number;
  liters: number;
}

interface LevelChartProps {
  points: ChartPoint[];
  sigmaL: number;
  windows: RestWindow[];
  alerts: DashAlert[];
  variant?: "legacy" | "inline";
  pressureValues?: number[];
  temperatureValues?: number[];
  signalSource?: "LIVE" | "DEMO";
}

const WARN_L = 47.5;
const CRIT_L = 28.5;

export default function LevelChart({
  points,
  sigmaL,
  windows,
  alerts,
  variant = "legacy",
  pressureValues = [],
  temperatureValues = [],
  signalSource = "DEMO",
}: LevelChartProps) {
  if (points.length === 0 || !points.some((point) => point.liters !== null && point.liters !== undefined)) {
    return <p style={{ color: "var(--og-muted)", fontSize: 13 }}>{t("dash.chart.emptyHistory")}</p>;
  }
  const levels = points.map((point) => point.liters);
  const levelSigma = levels.map(() => sigmaL);
  const regimes = [...windows]
    .sort((left, right) => left.start_t_s - right.start_t_s)
    .reduce<Array<{ start_t_s: number; end_t_s: number; state: RestWindow["state"] }>>((contiguous, window) => {
      const previous = contiguous[contiguous.length - 1];
      if (previous?.state === window.state && previous.end_t_s === window.start_t_s) {
        previous.end_t_s = window.end_t_s;
      } else {
        contiguous.push({ start_t_s: window.start_t_s, end_t_s: window.end_t_s, state: window.state });
      }
      return contiguous;
    }, [])
    .flatMap((window) => {
      const startIndex = points.findIndex((point) => point.t_s >= window.start_t_s);
      const endIndex = points.findIndex((point) => point.t_s >= window.end_t_s);
      if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) return [];
      const rest = window.state === "rest";
      return [{ startIndex, endIndex, label: t(rest ? "ui.rest" : "ui.movement"), tone: rest ? "rest" as const : "movement" as const }];
    });
  const events = alerts.flatMap((alert) => {
    const index = points.findIndex((point) => point.t_s >= alert.t_s);
    return index < 0 ? [] : [{ index, label: alert.level, color: ALERT_SEVERITY_COLORS[alert.level] }];
  });
  const series: SyncChartSeries[] = [];
  if (pressureValues.length === levels.length) {
    series.push({ name: `${t("report.pressureChart")} · ${signalSource}`, values: pressureValues, unit: "kPa", color: "var(--og-blue)", decimals: 1 });
  }
  series.push({ name: t("wheel.legend.level"), values: levels, unit: "L", sigma: levelSigma, axis: "right", domain: [0, 95], color: "var(--og-accent)", decimals: 1 });
  if (temperatureValues.length === levels.length) {
    series.push({ name: `${t("history.temperature")} · ${signalSource}`, values: temperatureValues, unit: "°C", axis: "right", domain: [55, 90], color: "var(--og-temperature)", dashed: true, decimals: 1, axisTicks: true });
  }
  const thresholdDomain: [number, number] = [0, 95];
  const xLabels = points.length > 1
    ? [`${formatNumber(points[0].t_s, 0)} s`, `${formatNumber(points[points.length - 1].t_s, 0)} s`]
    : [];
  return (
    <div className={`og-dashboard-sync${variant === "inline" ? " is-inline" : ""}`}>
      <SyncChart

        title={t("dash.chart.label")}
        series={series}
        thresholds={[
          { value: WARN_L, label: t("dash.chart.warning", { liters: formatNumber(WARN_L, 1) }), axis: "right", domain: thresholdDomain },
          { value: CRIT_L, label: t("dash.chart.critical", { liters: formatNumber(CRIT_L, 1) }), axis: "right", domain: thresholdDomain },
        ]}
        events={events}
        regimes={regimes}
        xLabels={xLabels}
        height={variant === "inline" ? 250 : 220}
      />
    </div>
  );
}
