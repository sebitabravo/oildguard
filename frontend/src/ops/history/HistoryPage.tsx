import { useMemo, useState } from "preact/hooks";
import { demoDataset, type HistoryWindow } from "../../demo/dataset";
import { formatNumber } from "../../i18n/numberFormat";
import { t, useLang } from "../../i18n";
import {
  KpiTile, Notice, PageHeader, SegmentedControl, TimeSeriesChart,
} from "../../ui/foundation";
import { historyKpis, sliceHistory } from "./logic";
import "./history.css";

const windows: HistoryWindow[] = ["250h", "7d", "30d", "90d"];
const windowHours: Record<HistoryWindow, number> = { "250h": 250, "7d": 168, "30d": 720, "90d": 2160 };

function formatEvent(event: "alert" | "inspection" | "outage", lang: "en" | "es"): string {
  return t(`history.event.${event === "inspection" ? "inspection" : event}`, lang);
}

export default function HistoryPage() {
  const [lang] = useLang();
  const initialWheel = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("wheel") ?? "wheel-LH-01"
    : "wheel-LH-01";
  const [wheelId, setWheelId] = useState(initialWheel);
  const [windowKey, setWindowKey] = useState<HistoryWindow>("250h");
  const wheel = demoDataset.wheels.find((item) => item.id === wheelId) ?? demoDataset.wheels[0];
  const points = useMemo(() => sliceHistory(wheel, windowKey), [wheel, windowKey]);
  const kpis = useMemo(() => historyKpis({ points, hoursPerWindow: windowHours[windowKey] }), [points, windowKey]);
  const levelValues = points.map((point, index, all) => {
    if (point.liters !== null) return point.liters;
    return all.slice(0, index).reverse().find((item) => item.liters !== null)?.liters ?? wheel.levelL;
  });
  const temperatureValues = points.map((_, index) => wheel.temperatureC + Math.sin(index * 0.9) * 3);
  const vibrationValues = points.map((_, index) => wheel.vibRms + Math.cos(index * 0.7) * 0.08);
  const chartEvents = points.flatMap((point, index) => point.event ? [{ index, label: formatEvent(point.event, lang) }] : []);
  const chartGaps = demoDataset.outages.some((outage) => outage.deviceId === wheel.id) ? [220] : [];
  const rows = points.flatMap((point) => point.event ? [{ point, event: point.event }] : []);

  return (
    <main className="og-page og-history-page">
      <div className="og-page__inner">
        <PageHeader
          eyebrow={t("history.eyebrow", lang)}
          title={t("history.title", lang)}
          description={t("history.description", lang)}
          meta={<span className="og-history-source">{t("history.syntheticNotice", lang)}</span>}
        />
        <div className="og-history-controls">
          <label className="og-history-selector">
            <span className="og-label">{t("history.selector", lang)}</span>
            <select value={wheel.id} onChange={(event) => setWheelId(event.currentTarget.value)}>
              {demoDataset.wheels.map((item) => <option value={item.id}>{item.id} · {item.truckId} {item.position}</option>)}
            </select>
          </label>
          <div>
            <span className="og-label">{t("history.window", lang)}</span>
            <SegmentedControl
              options={windows.map((item) => t(`history.window.${item}`, lang))}
              value={t(`history.window.${windowKey}`, lang)}
              onChange={(value) => {
                const next = windows.find((item) => t(`history.window.${item}`, lang) === value);
                if (next) setWindowKey(next);
              }}
            />
          </div>
        </div>
        <Notice lang={lang} kind="simulation">{t("history.syntheticNotice", lang)}</Notice>
        <section className="og-history-kpis" aria-label={t("history.title", lang)}>
          <KpiTile lang={lang} label={t("history.levelChange", lang)} value={kpis.levelChange === null ? "—" : `${formatNumber(kpis.levelChange, lang, 1)} L`} tone={kpis.levelChange !== null && kpis.levelChange < 0 ? "warning" : "nominal"} />
          <KpiTile lang={lang} label={t("history.meanLossRate", lang)} value={kpis.meanLossRate === null ? "—" : `${formatNumber(kpis.meanLossRate, lang, 2)} L/100 h`} />
          <KpiTile lang={lang} label={t("history.alerts", lang)} value={formatNumber(kpis.alerts, lang, 0)} tone={kpis.alerts ? "warning" : "nominal"} />
          <KpiTile lang={lang} label={t("history.completeness", lang)} value={`${formatNumber(kpis.completeness, lang, 0)}%`} />
        </section>
        <section className="og-history-charts">
          <article><h3>{t("history.level", lang)}</h3><TimeSeriesChart lang={lang} values={levelValues} sigma={points.map((point) => point.sigma ?? 0)} thresholds={[{ value: 47.5, label: "50%" }, { value: 28.5, label: "30%" }]} events={chartEvents} gaps={chartGaps} title={t("history.level", lang)} /></article>
          <article><h3>{t("history.temperature", lang)}</h3><TimeSeriesChart lang={lang} values={temperatureValues} events={chartEvents} gaps={chartGaps} title={t("history.temperature", lang)} /></article>
          <article><h3>{t("history.vibration", lang)}</h3><TimeSeriesChart lang={lang} values={vibrationValues} events={chartEvents} gaps={chartGaps} title={t("history.vibration", lang)} /></article>
        </section>
        <section className="og-history-events">
          <h3>{t("history.event", lang)}</h3>
          <div className="og-history-table-wrap">
            <table>
              <thead><tr><th>{t("history.time", lang)}</th><th>{t("history.event", lang)}</th><th>{t("history.detail", lang)}</th><th>{t("history.level", lang)}</th></tr></thead>
              <tbody>{rows.map(({ point, event }) => (
                <tr tabIndex={event === "alert" ? 0 : undefined} onClick={() => { if (event === "alert") window.location.href = `/alerts/detail?id=alert-${wheel.id}`; }}>
                  <td className="og-mono">{new Date(point.at).toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td>{formatEvent(event, lang)}</td>
                  <td>{event === "outage" ? t("history.event.outage", lang) : event === "alert" ? `${wheel.alertLevel ?? "N2"} · ${wheel.truckId}` : t("history.event.inspection", lang)}</td>
                  <td className="og-mono">{point.liters === null ? "—" : `${formatNumber(point.liters, lang, 1)} L`}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
