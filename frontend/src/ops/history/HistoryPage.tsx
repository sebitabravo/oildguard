import { useMemo, useState } from "preact/hooks";
import { demoDataset, type HistoryWindow } from "../../demo/dataset";
import { formatNumber } from "../../i18n/numberFormat";
import { t } from "../../i18n";
import {
  KpiTile, Notice, PageHeader, SegmentedControl, TimeSeriesChart,
} from "../../ui/foundation";
import { historyKpis, sliceHistory, timeAxisLabels } from "./logic";
import "./history.css";

const windows: HistoryWindow[] = ["250h", "7d", "30d", "90d"];
const windowHours: Record<HistoryWindow, number> = { "250h": 250, "7d": 168, "30d": 720, "90d": 2160 };

function formatEvent(event: "alert" | "inspection" | "outage" | "refill"): string {
  return t(`history.event.${event === "inspection" ? "inspection" : event}`);
}

export default function HistoryPage() {
  const initialWheel = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("wheel") ?? "wheel-LH-01"
    : "wheel-LH-01";
  const [wheelId, setWheelId] = useState(initialWheel);
  const [windowKey, setWindowKey] = useState<HistoryWindow>("250h");
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);
  const wheel = demoDataset.wheels.find((item) => item.id === wheelId) ?? demoDataset.wheels[0];
  const points = useMemo(() => sliceHistory(wheel, windowKey), [wheel, windowKey]);
  const kpis = useMemo(() => historyKpis({ points, hoursPerWindow: windowHours[windowKey] }), [points, windowKey]);
  const levelValues = points.map((point, index, all) => {
    if (point.liters !== null) return point.liters;
    return all.slice(0, index).reverse().find((item) => item.liters !== null)?.liters ?? wheel.levelL;
  });
  const temperatureValues = points.map((point, index, all) => point.temperatureC ?? all.slice(0, index).reverse().find((item) => item.temperatureC !== null)?.temperatureC ?? wheel.temperatureC);
  const vibrationValues = points.map((_, index) => wheel.vibRms + Math.cos(index * 0.7) * 0.08);
  const chartEvents = points.flatMap((point, index) => point.event ? [{ index, label: formatEvent(point.event) }] : []);
  const chartGaps = points.flatMap((point, index) => point.liters === null ? [index] : []);
  const xLabels = timeAxisLabels(windowKey, points, t("history.axis.now"));
  const rows = points.flatMap((point) => point.event ? [{ point, event: point.event }] : []);

  return (
    <main className="og-page og-history-page">
      <div className="og-page__inner">
        <PageHeader
          eyebrow={t("history.eyebrow")}
          title={t("history.title")}
          description={t("history.description")}
          meta={<span className="og-history-source">{t("history.syntheticNotice")}</span>}
        />
        <div className="og-history-controls">
          <label className="og-history-selector">
            <span className="og-label">{t("history.selector")}</span>
            <select value={wheel.id} onChange={(event) => setWheelId(event.currentTarget.value)}>
              {demoDataset.wheels.map((item) => <option value={item.id}>{item.id} · {item.truckId} {item.position}</option>)}
            </select>
          </label>
          <div>
            <span className="og-label">{t("history.window")}</span>
            <SegmentedControl
              options={windows.map((item) => t(`history.window.${item}`))}
              value={t(`history.window.${windowKey}`)}
              onChange={(value) => {
                const next = windows.find((item) => t(`history.window.${item}`) === value);
                if (next) setWindowKey(next);
              }}
            />
          </div>
        </div>
        <Notice kind="simulation">{t("history.syntheticNotice")}</Notice>
        <section className="og-history-kpis" aria-label={t("history.title")}>
          <KpiTile label={t("history.levelChange")} value={kpis.levelChange === null ? "—" : `${formatNumber(kpis.levelChange, 1)} L`} tone={kpis.levelChange !== null && kpis.levelChange < 0 ? "warning" : "nominal"} />
          <KpiTile label={t("history.meanLossRate")} value={kpis.meanLossRate === null ? "—" : `${formatNumber(kpis.meanLossRate, 2)} L/100 h`} />
          <KpiTile label={t("history.alerts")} value={formatNumber(kpis.alerts, 0)} tone={kpis.alerts ? "warning" : "nominal"} />
          <KpiTile label={t("history.completeness")} value={`${formatNumber(kpis.completeness, 0)}%`} />
        </section>
        <section className="og-history-charts">
          <article><h3>{t("history.level")}</h3><TimeSeriesChart values={levelValues} sigma={points.map((point) => point.sigma ?? 0)} thresholds={[{ value: 47.5, label: t("history.threshold.warning") }, { value: 28.5, label: t("history.threshold.critical") }]} domain={[0, 95]} yUnit="L" xLabels={xLabels} events={chartEvents} gaps={chartGaps} title={t("history.level")} cursorIndex={cursorIndex} onCursorChange={setCursorIndex} /></article>
          <article><h3>{t("history.temperature")}</h3><TimeSeriesChart values={temperatureValues} domain={[55, 90]} yUnit="°C" xLabels={xLabels} events={chartEvents} gaps={chartGaps} title={t("history.temperature")} color="var(--og-temperature)" cursorIndex={cursorIndex} onCursorChange={setCursorIndex} /></article>
          <article><h3>{t("history.vibration")}</h3><TimeSeriesChart values={vibrationValues} yUnit="g" yDecimals={2} xLabels={xLabels} events={chartEvents} gaps={chartGaps} title={t("history.vibration")} color="var(--og-blue)" cursorIndex={cursorIndex} onCursorChange={setCursorIndex} /></article>
        </section>
        <section className="og-history-events">
          <h3>{t("history.event")}</h3>
          <div className="og-history-table-wrap">
            <table>
              <thead><tr><th>{t("history.time")}</th><th>{t("history.event")}</th><th>{t("history.detail")}</th><th>{t("history.level")}</th></tr></thead>
              <tbody>{rows.map(({ point, event }) => (
                <tr tabIndex={event === "alert" ? 0 : undefined} onClick={() => { if (event === "alert") window.location.href = `/alerts/detail?id=alert-${wheel.id}`; }}>
                  <td className="og-mono">{new Date(point.at).toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td>{formatEvent(event)}</td>
                  <td>{event === "outage" ? t("history.event.outage") : event === "alert" ? `${wheel.alertLevel ?? "N2"} · ${wheel.truckId}` : event === "refill" ? t("history.event.refill") : t("history.event.inspection")}</td>
                  <td className="og-mono">{point.liters === null ? "—" : `${formatNumber(point.liters, 1)} L`}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
