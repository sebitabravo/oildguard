import { useMemo, useState } from "preact/hooks";
import { formatNumber } from "../../i18n/numberFormat";
import { t, useLang } from "../../i18n";
import { Button, KpiTile, Notice, PageHeader, TimeSeriesChart } from "../../ui/foundation";
import { assembleSyntheticReport, localizeReport } from "./logic";
import "./report.css";

export default function ReportPage() {
  const [lang] = useLang();
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);
  const alertId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("alert") ?? undefined : undefined;
  const report = useMemo(() => assembleSyntheticReport(alertId), [alertId]);
  const text = localizeReport(report, lang);
  const unknown = Boolean(alertId && alertId !== report.alertId);
  const timeline = report.timeline.map((event) => ({
    index: report.timeline.indexOf(event) * 3,
    label: event.level,
  }));

  return (
    <main className="og-page og-report-page">
      <div className="og-page__inner">
        <PageHeader
          eyebrow={t("report.eyebrow", lang)}
          title={t("report.title", lang)}
          description={t("report.description", lang)}
          meta={<Button type="button" variant="ghost" onClick={() => window.print()}>{t("report.print", lang)}</Button>}
        />
        {unknown && <Notice lang={lang} kind="warning">{t("report.unknownNotice", lang)}</Notice>}
        <div className="og-report-banner">{t("report.syntheticBanner", lang)}</div>
        <dl className="og-report-meta">
          <div><dt>{t("report.alertId", lang)}</dt><dd>{report.alertId}</dd></div>
          <div><dt>{t("report.wheel", lang)}</dt><dd>{report.wheelId}</dd></div>
          <div><dt>{t("report.window", lang)}</dt><dd>{text.window}</dd></div>
        </dl>
        <section className="og-report-kpis">
          <KpiTile lang={lang} label={t("report.levelAtDetection", lang)} value={`${formatNumber(report.levelAtDetection, lang, 1)} L`} />
          <KpiTile lang={lang} label={t("report.litresLost", lang)} value={`${formatNumber(report.litresLost, lang, 1)} L`} tone="warning" />
          <KpiTile lang={lang} label={t("report.timeToN4", lang)} value={`${formatNumber(report.timeToN4Minutes, lang, 0)} min`} />
          <KpiTile lang={lang} label={t("report.channels", lang)} value={formatNumber(report.channels, lang, 0)} />
        </section>
        <section className="og-report-section">
          <h3>{t("report.timeline", lang)}</h3>
          <ol className="og-report-timeline">
            {text.timeline.map((step) => <li><strong>{step.level}</strong><span>{step.time} · {step.role}</span><p>{step.detail}</p></li>)}
          </ol>
        </section>
        <section className="og-report-charts">
          <article><h3>{t("report.levelChart", lang)}</h3><TimeSeriesChart lang={lang} values={report.levelSeries} thresholds={[{ value: 47.5, label: t("history.threshold.warning", lang) }, { value: 28.5, label: t("history.threshold.critical", lang) }]} domain={[0, 95]} yUnit="L" events={timeline} title={t("report.levelChart", lang)} xLabels={text.minuteTicks} cursorIndex={cursorIndex} onCursorChange={setCursorIndex} /></article>
          <article><h3>{t("report.pressureChart", lang)}</h3><TimeSeriesChart lang={lang} values={report.pressureSeries} yUnit="kPa" yDecimals={1} events={timeline} title={t("report.pressureChart", lang)} color="var(--og-blue)" xLabels={text.minuteTicks} cursorIndex={cursorIndex} onCursorChange={setCursorIndex} /></article>
        </section>
        <section className="og-report-section">
          <div className="og-report-section__heading"><h3>{t("report.checklist", lang)}</h3><span>{t("report.readOnly", lang)}</span></div>
          <ul className="og-report-checklist">{text.checklist.map((item) => <li>{item}</li>)}</ul>
        </section>
        <section className="og-report-not-prove">
          <h3>{t("report.notProve", lang)}</h3>
          <p>{t("report.notProveText", lang)}</p>
        </section>
      </div>
    </main>
  );
}
