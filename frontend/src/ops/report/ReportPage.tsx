import { useMemo, useState } from "preact/hooks";
import { formatNumber } from "../../i18n/numberFormat";
import { t } from "../../i18n";
import { Button, KpiTile, Notice, PageHeader, TimeSeriesChart } from "../../ui/foundation";
import { assembleSyntheticReport, localizeReport } from "./logic";
import "./report.css";

function DemoSourceLabel() {
  return <small className="og-badge og-badge--source og-badge--source-demo" style={{ padding: "2px 4px", fontSize: "9px" }}>{t("fleet.source.demo")}</small>;
}

function ReportKpi({ label, value, tone = "nominal" }: { label: string; value: string; tone?: "nominal" | "warning" }) {
  return <article className={`og-kpi-tile og-kpi-tile--${tone}`}><div className="og-label">{label}</div><div className="og-kpi-tile__value">{value}</div><div className="og-kpi-tile__meta"><DemoSourceLabel /></div></article>;
}

export default function ReportPage() {
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);
  const alertId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("alert") ?? undefined : undefined;
  const report = useMemo(() => assembleSyntheticReport(alertId), [alertId]);
  const text = localizeReport(report);
  const unknown = Boolean(alertId && alertId !== report.alertId);
  const timeline = report.timeline.map((event) => ({
    index: report.timeline.indexOf(event) * 3,
    label: event.level,
  }));

  return (
    <main className="og-page og-report-page">
      <div className="og-page__inner">
        <PageHeader
          eyebrow={t("report.eyebrow")}
          title={t("report.title")}
          description={t("report.description")}
          meta={<Button type="button" variant="ghost" onClick={() => window.print()}>{t("report.print")}</Button>}
        />
        {unknown && <Notice kind="warning">{t("report.unknownNotice")}</Notice>}
        <div className="og-report-banner">{t("report.syntheticBanner")}</div>
        <dl className="og-report-meta">
          <div><dt>{t("report.alertId")}</dt><dd>{report.alertId}</dd></div>
          <div><dt>{t("report.wheel")}</dt><dd>{report.wheelId}</dd></div>
          <div><dt>{t("report.window")}</dt><dd>{text.window}</dd></div>
        </dl>
        <section className="og-report-kpis">
          <ReportKpi label={t("report.levelAtDetection")} value={`${formatNumber(report.levelAtDetection, 1)} L`} />
          <ReportKpi label={t("report.litresLost")} value={`${formatNumber(report.litresLost, 1)} L`} tone="warning" />
          <KpiTile label={t("report.timeToN4")} value={`${formatNumber(report.timeToN4Minutes, 0)} min`} />
          <KpiTile label={t("report.channels")} value={formatNumber(report.channels, 0)} />
        </section>
        <section className="og-report-section">
          <h3>{t("report.timeline")}</h3>
          <ol className="og-report-timeline">
            {text.timeline.map((step) => <li><strong>{step.level}</strong><span>{step.time} · {step.role}</span><p>{step.detail}</p></li>)}
          </ol>
        </section>
        <section className="og-report-charts">
          <article><h3>{t("report.levelChart")}</h3><TimeSeriesChart values={report.levelSeries} thresholds={[{ value: 47.5, label: t("history.threshold.warning") }, { value: 28.5, label: t("history.threshold.critical") }]} domain={[0, 95]} yUnit="L" events={timeline} title={t("report.levelChart")} xLabels={text.minuteTicks} cursorIndex={cursorIndex} onCursorChange={setCursorIndex} /></article>
          <article><h3>{t("report.pressureChart")}</h3><TimeSeriesChart values={report.pressureSeries} yUnit="kPa" yDecimals={1} events={timeline} title={t("report.pressureChart")} color="var(--og-blue)" xLabels={text.minuteTicks} cursorIndex={cursorIndex} onCursorChange={setCursorIndex} /></article>
        </section>
        <section className="og-report-section">
          <div className="og-report-section__heading"><h3>{t("report.checklist")}</h3><span>{t("report.readOnly")}</span></div>
          <ul className="og-report-checklist">{text.checklist.map((item) => <li>{item}</li>)}</ul>
        </section>
        <section className="og-report-not-prove">
          <h3>{t("report.notProve")}</h3>
          <p>{t("report.notProveText")}</p>
        </section>
      </div>
    </main>
  );
}
