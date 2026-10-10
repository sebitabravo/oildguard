import { useEffect, useMemo, useState } from "preact/hooks";
import { t, useLang, type Lang } from "../../i18n";
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

function valueText(metric: EvidenceMetric, lang: Lang): string {
  if (metric.value === null) return "—";
  return `${formatNumber(metric.value, lang, metric.decimals)}${metric.unit ? ` ${metric.unit}` : ""}`;
}

function thresholdText(metric: EvidenceMetric, lang: Lang): string {
  const value = `${formatNumber(metric.threshold, lang, metric.decimals)}${metric.unit ? ` ${metric.unit}` : ""}`;
  return t(`alerts.cmp.${metric.comparator}`, lang, { value });
}

function axisLabels(window: SignalWindow, lang: Lang): string[] {
  const key = window.unit === "min" ? "alerts.signal.minutes" : "alerts.signal.seconds";
  return [
    t(key, lang, { value: formatNumber(-window.before, lang, 0) }),
    t(key, lang, { value: `+${formatNumber(window.after, lang, 0)}` }),
  ];
}

function SignalCharts({ lang, record, window, live }: { lang: Lang; record: AlertRecord; window: SignalWindow | null; live: boolean }) {
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);
  if (!window) return <p className="og-alerts-note">{t("alerts.signal.liveMissing", lang)}</p>;
  const labels = axisLabels(window, lang);
  const events = [{ index: window.triggerIndex, label: t("alerts.signal.trigger", lang) }];
  const z = window.zScore;
  const zDomain: [number, number] = [Math.floor(Math.min(...z, -RULES.zThr) - 1), 1];
  const first = window.levelL[0];
  const atTrigger = window.levelL[window.triggerIndex];
  return (
    <>
      <div className="og-alerts-charts">
        <article>
          <h4>{t("alerts.signal.level", lang)}</h4>
          <TimeSeriesChart
            lang={lang}
            values={window.levelL}
            domain={[0, 95]}
            yUnit="L"
            events={events}
            xLabels={labels}
            title={t("alerts.signal.level", lang)}
            cursorIndex={cursorIndex}
            onCursorChange={setCursorIndex}
            thresholds={[
              { value: RULES.warnL, label: t("alerts.signal.warning", lang, { value: formatNumber(RULES.warnL, lang, 1) }) },
              { value: RULES.critL, label: t("alerts.signal.critical", lang, { value: formatNumber(RULES.critL, lang, 1) }) },
            ]}
          />
          <dl className="og-alerts-stats">
            <div><dt>{labels[0]}</dt><dd className="og-mono">{formatNumber(first, lang, 1)} L</dd></div>
            <div><dt>{t("alerts.signal.trigger", lang)}</dt><dd className="og-mono">{formatNumber(atTrigger, lang, 1)} L</dd></div>
            <div><dt>Δ</dt><dd className="og-mono">{formatNumber(atTrigger - first, lang, 1)} L</dd></div>
          </dl>
        </article>
        {z.length > 0 && (
          <article>
            <h4>{t("alerts.signal.pressure", lang)}</h4>
            <TimeSeriesChart
              lang={lang}
              values={z}
              domain={zDomain}
              yDecimals={0}
              events={events}
              xLabels={labels}
              title={t("alerts.signal.pressure", lang)}
              color="var(--og-blue)"
              cursorIndex={cursorIndex}
              onCursorChange={setCursorIndex}
              thresholds={[{ value: -RULES.zThr, label: t("alerts.signal.zLine", lang, { value: formatNumber(-RULES.zThr, lang, 1) }) }]}
            />
            <dl className="og-alerts-stats">
              <div><dt>{labels[0]}</dt><dd className="og-mono">{formatNumber(z[0], lang, 1)}</dd></div>
              <div><dt>{t("alerts.signal.trigger", lang)}</dt><dd className="og-mono">{formatNumber(z[window.triggerIndex], lang, 1)}</dd></div>
              <div><dt>{t("alerts.evidence.threshold", lang)}</dt><dd className="og-mono">{formatNumber(-RULES.zThr, lang, 1)}</dd></div>
            </dl>
          </article>
        )}
      </div>
      <p className="og-alerts-note">{t(live ? "alerts.signal.liveNote" : "alerts.signal.demoNote", lang)}</p>
    </>
  );
}

export default function AlertDetailPage() {
  const [lang] = useLang();
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
    <PageHeader eyebrow={t("alerts.detail.eyebrow", lang)} title={t("alerts.detail.title", lang)} description={t("alerts.description", lang)} />
  );
  const back = <a className="og-button og-button--ghost og-alerts-link" href="/alerts">{t("alerts.detail.back", lang)}</a>;

  if (!id || (!record && liveLoaded)) {
    return (
      <main className="og-page og-alerts-page"><div className="og-page__inner">
        {header}
        <EmptyState title={t("alerts.detail.unknownTitle", lang)} detail={t(id ? "alerts.detail.unknownText" : "alerts.detail.missingIdText", lang)} />
        <p className="og-alerts-backrow">{back}</p>
      </div></main>
    );
  }
  if (!record) {
    return <main className="og-page og-alerts-page"><div className="og-page__inner">{header}<p className="og-alerts-note">{t("alerts.loading", lang)}</p></div></main>;
  }

  const live = record.source === "live";
  const allowed = new Set(availableActions(record.lifecycle));
  const actionNote = live ? t("alerts.action.live", lang) : record.lifecycle === "closed" ? t("alerts.action.closed", lang) : t("alerts.action.local", lang);
  const evidence = channelEvidence(record);
  const signal = live ? liveWindow : signalWindow(record);
  const veto = record.channels.temp_drift_veto;
  const audit = record.audit.map((entry) => {
    const title = t(`alerts.audit.${entry.action}`, lang);
    return {
      title: entry.local ? t("alerts.audit.localSuffix", lang, { value: title }) : title,
      actor: roleLabel(entry.actor, lang),
      time: formatTimestampUtc(entry.at),
    };
  });
  const rows = evidence.flatMap((row) => row.metrics.map((metric) => ({
    id: `${row.channel}-${metric.key}`,
    cells: {
      channel: <strong>{t(`ui.channel.${row.channel}`, lang)}</strong>,
      input: t(`alerts.metric.${metric.key}`, lang),
      observed: <span className="og-mono">{valueText(metric, lang)}</span>,
      threshold: <span className="og-mono">{thresholdText(metric, lang)}</span>,
      result: (
        <span className={`og-alerts-result og-alerts-result--${metric.crossed === null ? "missing" : metric.crossed ? "crossed" : "within"}`}>
          {t(metric.crossed === null ? "alerts.evidence.missing" : metric.crossed ? "alerts.evidence.crossed" : "alerts.evidence.within", lang)}
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
              <LevelTag lang={lang} level={record.level} />
              <StateChip lang={lang} state={record.lifecycle} />
              <SourceTag lang={lang} source={record.source} />
              <SyntheticBadge lang={lang} />
            </div>
            <dl className="og-alerts-meta">
              <div><dt>{t("alerts.detail.wheel", lang)}</dt><dd className="og-mono">{record.wheelId ?? t("alerts.liveDevice", lang)}</dd></div>
              <div><dt>{t("alerts.detail.truck", lang)}</dt><dd className="og-mono">{record.truckId ?? "—"}</dd></div>
              <div><dt>{t(live ? "alerts.detail.observedAt" : "alerts.detail.openedAt", lang)}</dt><dd className="og-mono">{formatTimestampUtc(record.openedAt)}</dd></div>
              <div><dt>{t("alerts.detail.recipient", lang)}</dt><dd>{roleLabel(record.recipient, lang)}</dd></div>
              <div><dt>{t("alerts.detail.owner", lang)}</dt><dd>{roleLabel(record.owner, lang)}</dd></div>
              {record.inputs.rul_hours_to_warning !== null && (
                <div><dt>RUL</dt><dd className="og-mono">{t("alerts.detail.rul", lang, { hours: formatNumber(record.inputs.rul_hours_to_warning, lang, 1) })}</dd></div>
              )}
            </dl>
          </div>
          <div className="og-alerts-head__actions">
            <div className="og-alerts-actions" role="group" aria-label={t("alerts.action.group", lang)}>
              {ACTIONS.map((action) => (
                <Button
                  type="button"
                  variant={action === "acknowledge" ? "primary" : "ghost"}
                  disabled={live || !allowed.has(action)}
                  title={live ? actionNote : undefined}
                  onClick={() => act(record.id, action)}
                >
                  {t(`alerts.action.${action}`, lang)}
                </Button>
              ))}
            </div>
            <p className="og-alerts-note">{actionNote}</p>
            {!live && record.audit.some((entry) => entry.local) && (
              <button type="button" className="og-alerts-reset" onClick={resetActions}>{t("alerts.action.reset", lang)}</button>
            )}
            <a className="og-button og-button--ghost og-alerts-link" href={`/report?alert=${encodeURIComponent(record.id)}`}>{t("alerts.report.link", lang)}</a>
            <p className="og-alerts-note">{t("alerts.report.note", lang)}</p>
          </div>
        </section>

        {record.level === "N4" && <div className="og-alerts-banner"><AlertBanner lang={lang} severity="N4">{t("alerts.banner.N4", lang)}</AlertBanner></div>}
        {hasPartialData(record) && <Notice lang={lang} kind="partial">{t("alerts.partial", lang)}</Notice>}

        <section className="og-alerts-section">
          <header className="og-alerts-section__head">
            <h3>{t("alerts.trigger.title", lang)}</h3>
            <span className="og-mono">{t("alerts.trigger.summary", lang, { count: formatNumber(record.votes, lang, 0) })}</span>
          </header>
          <p className="og-alerts-reason-line"><b>{t("alerts.trigger.reason", lang)}:</b> {localizeReason(record, lang)}</p>
          <div className="og-alerts-trigger">
            <div className="og-alerts-fusion">
              <ChannelFusion lang={lang} channels={record.channels} />
              <p className="og-alerts-note">{t("alerts.trigger.rule", lang)}</p>
            </div>
            <div className="og-alerts-evidence">
              <DataTable
                lang={lang}
                caption={t("alerts.trigger.title", lang)}
                columns={[
                  { key: "channel", label: t("alerts.col.channels", lang) },
                  { key: "input", label: t("alerts.evidence.input", lang) },
                  { key: "observed", label: t("alerts.evidence.observed", lang) },
                  { key: "threshold", label: t("alerts.evidence.threshold", lang) },
                  { key: "result", label: t("alerts.evidence.result", lang) },
                ]}
                rows={rows}
              />
            </div>
          </div>
          <p className={`og-alerts-veto og-alerts-veto--${veto}`}>
            <b>{t("alerts.veto.title", lang)}.</b> {t(veto === "fired" ? "alerts.veto.fired" : veto === "quiet" ? "alerts.veto.quiet" : "alerts.veto.noData", lang)}
          </p>
        </section>

        <section className="og-alerts-section">
          <header className="og-alerts-section__head"><h3>{t("alerts.signal.title", lang)}</h3></header>
          <SignalCharts lang={lang} record={record} window={signal} live={live} />
        </section>

        <div className="og-alerts-two">
          <section className="og-alerts-section">
            <header className="og-alerts-section__head"><h3>{t("alerts.steps.title", lang)}</h3><span>{t("alerts.steps.readOnly", lang)}</span></header>
            <ol className="og-alerts-steps">
              {inspectionSteps(record.level).map((step) => <li>{t(`alerts.step.${step}`, lang)}</li>)}
            </ol>
          </section>
          <section className="og-alerts-section">
            <header className="og-alerts-section__head"><h3>{t("alerts.audit.title", lang)}</h3><span>{lifecycleLabel(record.lifecycle, lang)}</span></header>
            {audit.length ? <Timeline items={audit} /> : <p className="og-alerts-note">{t("alerts.audit.liveEmpty", lang)}</p>}
            {!live && <p className="og-alerts-note">{t("alerts.audit.demoNote", lang)}</p>}
          </section>
        </div>
        <p className="og-alerts-backrow">{back}</p>
      </div>
    </main>
  );
}
