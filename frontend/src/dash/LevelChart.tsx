import type { DashAlert } from "../sim/api";
import type { RestWindow } from "../sim/signals";
import { t, useLang } from "../i18n";
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
  const [lang] = useLang();
  if (points.length === 0) return <p style={{ color: "var(--og-muted)", fontSize: 13 }}>{t("dash.chart.empty", lang)}</p>;
  const levels = points.map((point) => point.liters);
  const levelSigma = levels.map(() => sigmaL);
  const rest = windows.filter((window) => window.state === "rest");
  const regimes = rest.flatMap((window) => {
    const startIndex = points.findIndex((point) => point.t_s >= window.start_t_s);
    const endIndex = points.findIndex((point) => point.t_s >= window.end_t_s);
    if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) return [];
    return [{ startIndex, endIndex, label: t("ui.rest", lang), tone: "rest" as const }];
  });
  const events = alerts.flatMap((alert) => {
    const index = points.findIndex((point) => point.t_s >= alert.t_s);
    return index < 0 ? [] : [{ index, label: alert.level, color: ALERT_SEVERITY_COLORS[alert.level] }];
  });
  const series: SyncChartSeries[] = [];
  if (pressureValues.length === levels.length) {
    series.push({ name: `${t("report.pressureChart", lang)} · ${signalSource}`, values: pressureValues, unit: "kPa", color: "var(--og-blue)", decimals: 1 });
  }
  series.push({ name: t("wheel.legend.level", lang), values: levels, unit: "L", sigma: levelSigma, axis: "right", domain: [0, 95], color: "var(--og-accent)", decimals: 1 });
  if (temperatureValues.length === levels.length) {
    series.push({ name: `${t("history.temperature", lang)} · ${signalSource}`, values: temperatureValues, unit: "°C", axis: "right", domain: [55, 90], color: "var(--og-temperature)", dashed: true, decimals: 1, axisTicks: true });
  }
  const thresholdDomain: [number, number] = [0, 95];
  const xLabels = points.length > 1
    ? [`${formatNumber(points[0].t_s, lang, 0)} s`, `${formatNumber(points[points.length - 1].t_s, lang, 0)} s`]
    : [];
  return (
    <div className={`og-dashboard-sync${variant === "inline" ? " is-inline" : ""}`}>
      <SyncChart
        lang={lang}
        title={t("dash.chart.label", lang)}
        series={series}
        thresholds={[
          { value: WARN_L, label: t("dash.chart.warning", lang, { liters: formatNumber(WARN_L, lang, 1) }), axis: "right", domain: thresholdDomain },
          { value: CRIT_L, label: t("dash.chart.critical", lang, { liters: formatNumber(CRIT_L, lang, 1) }), axis: "right", domain: thresholdDomain },
        ]}
        events={events}
        regimes={regimes}
        xLabels={xLabels}
        height={variant === "inline" ? 250 : 220}
      />
    </div>
  );
}
