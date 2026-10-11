import { useEffect, useMemo, useState } from "preact/hooks";
import { t } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { getLevelSeries } from "../../sim/api";
import { loadWithTimeout } from "../../ui/backendOrDemo";
import {
  AlertBanner, Button, ChannelFusion, DataTable, EmptyState, Notice, PageHeader, SyntheticBadge,
  TimeSeriesChart, Timeline,
} from "../../ui/foundation";
import { useAlertData } from "./data";
import { channelEvidence, inspectionSteps, liveSignalWindow, signalWindow, type EvidenceMetric, type SignalWindow } from "./detail";
import { lifecycleLabel, localizeReason, roleLabel } from "./localize";
import {
  availableActions, formatTimestampUtc, hasPartialData, parseAlertId, type AlertRecord, type LifecycleAction,
} from "./logic";
import { RULES } from "./rules";
import { LevelTag, SourceTag, StateChip } from "./shared";
import "./alerts.css";

const ACTIONS: readonly LifecycleAction[] = ["acknowledge", "escalate", "close"];

type FieldSource = "live" | "demo" | "configuration";

function FieldSourceLabel({ source }: { source: FieldSource }) {
  const key = source === "live" ? "fleet.source.live" : source === "demo" ? "fleet.source.demo" : "fleet.source.configuration";
  return <small className={`og-badge og-badge--source og-badge--source-${source}`} style={{ padding: "2px 4px", fontSize: "9px" }}>{t(key)}</small>;
}

export function SourcedValue({ value, source }: { value: string; source: FieldSource }) {
  return <span className="og-mono">{value} <FieldSourceLabel source={source} /></span>;
}

function valueText(metric: EvidenceMetric): string {
  if (metric.value === null) return "—";
  return `${formatNumber(metric.value, metric.decimals)}${metric.unit ? ` ${metric.unit}` : ""}`;
}

function thresholdText(metric: EvidenceMetric): string {
  const value = `${formatNumber(metric.threshold, metric.decimals)}${metric.unit ? ` ${metric.unit}` : ""}`;
  return t(`alerts.cmp.${metric.comparator}`, { value });
}

function axisLabels(window: SignalWindow): string[] {
  const key = window.unit === "min" ? "alerts.signal.minutes" : "alerts.signal.seconds";
  return [
    t(key, { value: formatNumber(-window.before, 0) }),
    t(key, { value: `+${formatNumber(window.after, 0)}` }),
  ];
}

function SignalCharts({ record, window, live }: { record: AlertRecord; window: SignalWindow | null; live: boolean }) {
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);
  if (!window) return <p className="og-alerts-note">{t("alerts.signal.liveMissing")}</p>;
  const labels = axisLabels(window);
  const events = [{ index: window.triggerIndex, label: t("alerts.signal.trigger") }];
  const z = window.zScore;
  const zDomain: [number, number] = [Math.floor(Math.min(...z, -RULES.zThr) - 1), 1];
  const first = window.levelL[0];
  const atTrigger = window.levelL[window.triggerIndex];
  return (
    <>
      <div className="og-alerts-charts">
        <article>
          <h4>{t("alerts.signal.level")}</h4>
          <TimeSeriesChart

            values={window.levelL}
            domain={[0, 95]}
            yUnit="L"
            events={events}
            xLabels={labels}
            title={t("alerts.signal.level")}
            cursorIndex={cursorIndex}
            onCursorChange={setCursorIndex}
            thresholds={[
              { value: RULES.warnL, label: t("alerts.signal.warning", { value: formatNumber(RULES.warnL, 1) }) },
              { value: RULES.critL, label: t("alerts.signal.critical", { value: formatNumber(RULES.critL, 1) }) },
            ]}
          />
          <dl className="og-alerts-stats">
            <div><dt>{labels[0]}</dt><dd className="og-mono">{formatNumber(first, 1)} L</dd></div>
            <div><dt>{t("alerts.signal.trigger")}</dt><dd className="og-mono">{formatNumber(atTrigger, 1)} L</dd></div>
            <div><dt>Δ</dt><dd className="og-mono">{formatNumber(atTrigger - first, 1)} L</dd></div>
          </dl>
        </article>
        {z.length > 0 && (
          <article>
            <h4>{t("alerts.signal.pressure")}</h4>
            <TimeSeriesChart

              values={z}
              domain={zDomain}
              yDecimals={0}
              events={events}
              xLabels={labels}
              title={t("alerts.signal.pressure")}
              color="var(--og-blue)"
              cursorIndex={cursorIndex}
              onCursorChange={setCursorIndex}
              thresholds={[{ value: -RULES.zThr, label: t("alerts.signal.zLine", { value: formatNumber(-RULES.zThr, 1) }) }]}
            />
            <dl className="og-alerts-stats">
              <div><dt>{labels[0]}</dt><dd className="og-mono">{formatNumber(z[0], 1)}</dd></div>
              <div><dt>{t("alerts.signal.trigger")}</dt><dd className="og-mono">{formatNumber(z[window.triggerIndex], 1)}</dd></div>
              <div><dt>{t("alerts.evidence.threshold")}</dt><dd className="og-mono">{formatNumber(-RULES.zThr, 1)}</dd></div>
            </dl>
          </article>
        )}
      </div>
      <p className="og-alerts-note">{t(live ? "alerts.signal.liveNote" : "alerts.signal.demoNote")}</p>
    </>
  );
}

export default function AlertDetailPage() {
  const { records, liveLoaded, act, resetActions } = useAlertData();
  const id = typeof window === "undefined" ? null : parseAlertId(window.location.search);
  const record = useMemo(() => records.find((item) => item.id === id) ?? null, [records, id]);
  const [liveWindow, setLiveWindow] = useState<SignalWindow | null>(null);
  const liveTs = record?.source === "live" ? record.tS ?? null : null;

  useEffect(() => {
    if (liveTs === null) return undefined;
    let active = true;
    void loadWithTimeout(() => getLevelSeries(300))
      .then((response) => { if (active) setLiveWindow(liveSignalWindow(response.series, liveTs)); })
      .catch(() => { if (active) setLiveWindow(null); });
    return () => { active = false; };
  }, [liveTs]);

  const header = (
    <PageHeader eyebrow={t("alerts.detail.eyebrow")} title={t("alerts.detail.title")} description={t("alerts.description")} />
  );
  const back = <a className="og-button og-button--ghost og-alerts-link" href="/alerts">{t("alerts.detail.back")}</a>;

  if (!id || (!record && liveLoaded)) {
    return (
      <main className="og-page og-alerts-page"><div className="og-page__inner">
        {header}
        <EmptyState title={t("alerts.detail.unknownTitle")} detail={t(id ? "alerts.detail.unknownText" : "alerts.detail.missingIdText")} />
        <p className="og-alerts-backrow">{back}</p>
      </div></main>
    );
  }
  if (!record) {
    return <main className="og-page og-alerts-page"><div className="og-page__inner">{header}<p className="og-alerts-note">{t("alerts.loading")}</p></div></main>;
  }

  const live = record.source === "live";
  const allowed = new Set(availableActions(record.lifecycle));
  const actionNote = live ? t("alerts.action.live") : record.lifecycle === "closed" ? t("alerts.action.closed") : t("alerts.action.local");
  const evidence = channelEvidence(record);
  const signal = live ? liveWindow : signalWindow(record);
  const veto = record.channels.temp_drift_veto;
  const audit = record.audit.map((entry) => {
    const title = t(`alerts.audit.${entry.action}`);
    return {
      title: entry.local ? t("alerts.audit.localSuffix", { value: title }) : title,
      actor: roleLabel(entry.actor),
      time: formatTimestampUtc(entry.at),
    };
  });
  const rows = evidence.flatMap((row) => row.metrics.map((metric) => ({
    id: `${row.channel}-${metric.key}`,
    cells: {
      channel: <strong>{t(`ui.channel.${row.channel}`)}</strong>,
      input: t(`alerts.metric.${metric.key}`),
      observed: <SourcedValue value={valueText(metric)} source={record.source} />,
      threshold: <SourcedValue value={thresholdText(metric)} source="configuration" />,
      result: (
        <span className={`og-alerts-result og-alerts-result--${metric.crossed === null ? "missing" : metric.crossed ? "crossed" : "within"}`}>
          {t(metric.crossed === null ? "alerts.evidence.missing" : metric.crossed ? "alerts.evidence.crossed" : "alerts.evidence.within")}
        </span>
      ),
    },
  })));

  return (
    <main className="og-page og-alerts-page og-alerts-detail">
      <div className="og-page__inner">
        {header}

        <section className="og-alerts-head">
          <div className="og-alerts-head__id">
            <h2 className="og-mono">{record.id}</h2>
            <div className="og-alerts-head__tags">
              <LevelTag level={record.level} />
              <StateChip state={record.lifecycle} />
              <SourceTag source={record.source} />
              <SyntheticBadge />
            </div>
            <dl className="og-alerts-meta">
              <div><dt>{t("alerts.detail.wheel")}</dt><dd className="og-mono">{record.wheelId ?? t("alerts.liveDevice")}</dd></div>
              <div><dt>{t("alerts.detail.truck")}</dt><dd className="og-mono">{record.truckId ?? "—"}</dd></div>
              <div><dt>{t(live ? "alerts.detail.observedAt" : "alerts.detail.openedAt")}</dt><dd className="og-mono">{formatTimestampUtc(record.openedAt)}</dd></div>
              <div><dt>{t("alerts.detail.recipient")}</dt><dd>{roleLabel(record.recipient)}</dd></div>
              <div><dt>{t("alerts.detail.owner")}</dt><dd>{roleLabel(record.owner)}</dd></div>
              {record.inputs.rul_hours_to_warning !== null && (
                <div><dt>RUL</dt><dd className="og-mono">{t("alerts.detail.rul", { hours: formatNumber(record.inputs.rul_hours_to_warning, 1) })}</dd></div>
              )}
            </dl>
          </div>
          <div className="og-alerts-head__actions">
            <div className="og-alerts-actions" role="group" aria-label={t("alerts.action.group")}>
              {ACTIONS.map((action) => (
                <Button
                  type="button"
                  variant={action === "acknowledge" ? "primary" : "ghost"}
                  disabled={live || !allowed.has(action)}
                  title={live ? actionNote : undefined}
                  onClick={() => act(record.id, action)}
                >
                  {t(`alerts.action.${action}`)}
                </Button>
              ))}
            </div>
            <p className="og-alerts-note">{actionNote}</p>
            {!live && record.audit.some((entry) => entry.local) && (
              <button type="button" className="og-alerts-reset" onClick={resetActions}>{t("alerts.action.reset")}</button>
            )}
            <a className="og-button og-button--ghost og-alerts-link" href={`/report?alert=${encodeURIComponent(record.id)}`}>{t("alerts.report.link")}</a>
            <p className="og-alerts-note">{t("alerts.report.note")}</p>
          </div>
        </section>

        {record.level === "N4" && <div className="og-alerts-banner"><AlertBanner severity="N4">{t("alerts.banner.N4")}</AlertBanner></div>}
        {hasPartialData(record) && <Notice kind="partial">{t("alerts.partial")}</Notice>}

        <section className="og-alerts-section">
          <header className="og-alerts-section__head">
            <h3>{t("alerts.trigger.title")}</h3>
            <span className="og-mono">{t("alerts.trigger.summary", { count: formatNumber(record.votes, 0) })}</span>
          </header>
          <p className="og-alerts-reason-line"><b>{t("alerts.trigger.reason")}:</b> {localizeReason(record)}</p>
          <div className="og-alerts-trigger">
            <div className="og-alerts-fusion">
              <ChannelFusion channels={record.channels} />
              <p className="og-alerts-note">{t("alerts.trigger.rule")}</p>
            </div>
            <div className="og-alerts-evidence">
              <DataTable

                caption={t("alerts.trigger.title")}
                columns={[
                  { key: "channel", label: t("alerts.col.channels") },
                  { key: "input", label: t("alerts.evidence.input") },
                  { key: "observed", label: t("alerts.evidence.observed") },
                  { key: "threshold", label: t("alerts.evidence.threshold") },
                  { key: "result", label: t("alerts.evidence.result") },
                ]}
                rows={rows}
              />
            </div>
          </div>
          <p className={`og-alerts-veto og-alerts-veto--${veto}`}>
            <b>{t("alerts.veto.title")}.</b> {t(veto === "fired" ? "alerts.veto.fired" : veto === "quiet" ? "alerts.veto.quiet" : "alerts.veto.noData")}
          </p>
        </section>

        <section className="og-alerts-section">
          <header className="og-alerts-section__head"><h3>{t("alerts.signal.title")}</h3></header>
          <SignalCharts record={record} window={signal} live={live} />
        </section>

        <div className="og-alerts-two">
          <section className="og-alerts-section">
            <header className="og-alerts-section__head"><h3>{t("alerts.steps.title")}</h3><span>{t("alerts.steps.readOnly")}</span></header>
            <ol className="og-alerts-steps">
              {inspectionSteps(record.level).map((step) => <li>{t(`alerts.step.${step}`)}</li>)}
            </ol>
          </section>
          <section className="og-alerts-section">
            <header className="og-alerts-section__head"><h3>{t("alerts.audit.title")}</h3><span>{lifecycleLabel(record.lifecycle)}</span></header>
            {audit.length ? <Timeline items={audit} /> : <p className="og-alerts-note">{t("alerts.audit.liveEmpty")}</p>}
            {!live && <p className="og-alerts-note">{t("alerts.audit.demoNote")}</p>}
          </section>
        </div>
        <p className="og-alerts-backrow">{back}</p>
      </div>
    </main>
  );
}
