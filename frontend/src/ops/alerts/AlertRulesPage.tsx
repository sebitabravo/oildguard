import { useEffect, useState } from "preact/hooks";
import { t, useLang, type Lang } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { loadWithTimeout } from "../../ui/backendOrDemo";
import { Notice, PageHeader, SyntheticBadge } from "../../ui/foundation";
import { roleLabel } from "./localize";
import { LEVELS, ROUTING } from "./logic";
import { RULE_SOURCES } from "./rules";
import { LevelTag } from "./shared";
import { fetchThresholds, resolveThresholds, thresholdRows, type ResolvedThresholds, type ThresholdRow } from "./thresholds";
import "./alerts.css";

function rowValue(row: ThresholdRow, lang: Lang): string {
  if (row.unit === "votes") return t("alerts.channelsOf", lang, { count: formatNumber(row.value, lang, 0) });
  const base = `${row.prefix ?? ""}${formatNumber(row.value, lang, row.decimals)}${row.unit ? ` ${row.unit}` : ""}`;
  return row.litres === undefined ? base : `${base} · ${formatNumber(row.litres, lang, 1)} L`;
}

export default function AlertRulesPage() {
  const [lang] = useLang();
  const [resolved, setResolved] = useState<ResolvedThresholds>(() => resolveThresholds(null));

  useEffect(() => {
    let active = true;
    void loadWithTimeout((signal) => fetchThresholds(signal))
      .then((payload) => { if (active) setResolved(resolveThresholds(payload)); })
      .catch(() => { if (active) setResolved(resolveThresholds(null)); });
    return () => { active = false; };
  }, []);

  const v = resolved.values;
  const num = (value: number, digits = 1) => formatNumber(value, lang, digits);
  const ladder: Record<string, string[]> = {
    N1: [t("alerts.rules.ladder.N1", lang)],
    N2: [t("alerts.rules.ladder.N2", lang)],
    N3: [t("alerts.rules.ladder.N3", lang, { value: num(v.shiftH, 0) })],
    N4: [
      t("alerts.rules.ladder.N4a", lang, { value: num(v.critPct, 0) }),
      t("alerts.rules.ladder.N4b", lang, { value: num(v.abruptStepL) }),
      t("alerts.rules.ladder.N4c", lang, { value: num(v.zExtreme) }),
    ],
  };

  return (
    <main className="og-page og-alerts-page og-alerts-rules">
      <div className="og-page__inner">
        <PageHeader
          eyebrow={t("alerts.rules.eyebrow", lang)}
          title={t("alerts.rules.title", lang)}
          description={t("alerts.rules.description", lang)}
          meta={<span className={`og-alerts-pill og-alerts-pill--${resolved.source === "live" ? "live" : "demo"}`}><i aria-hidden="true" />{t(resolved.source === "live" ? "alerts.source.live" : "alerts.source.demo", lang)}</span>}
        />
        <Notice lang={lang} kind="warning">{t("alerts.rules.readOnly", lang)}</Notice>
        <p className="og-alerts-source-line">
          <SyntheticBadge lang={lang} />
          <span>{t(resolved.source === "live" ? "alerts.rules.source.live" : "alerts.rules.source.constant", lang)}</span>
        </p>
        <p className="og-alerts-note">{t("alerts.rules.proxy", lang)}</p>

        <section className="og-alerts-section">
          <header className="og-alerts-section__head"><h3>{t("alerts.rules.thresholds.title", lang)}</h3></header>
          <div className="og-alerts-table-wrap">
            <table className="og-alerts-table og-alerts-table--rules">
              <thead>
                <tr>
                  {(["rule", "value", "used", "source"] as const).map((column) => <th scope="col">{t(`alerts.rules.col.${column}`, lang)}</th>)}
                </tr>
              </thead>
              <tbody>
                {thresholdRows(v).map((row) => (
                  <tr>
                    <th scope="row">{t(row.labelKey, lang)}</th>
                    <td className="og-mono">{rowValue(row, lang)}</td>
                    <td>{t(row.usedKey, lang)}</td>
                    <td className="og-mono og-alerts-muted">{RULE_SOURCES[row.source]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="og-alerts-two">
          <section className="og-alerts-section">
            <header className="og-alerts-section__head"><h3>{t("alerts.rules.fusion.title", lang)}</h3><span className="og-mono">{t("alerts.channelsOf", lang, { count: num(v.minVotes, 0) })}</span></header>
            <p className="og-alerts-reason-line">{t("alerts.rules.fusion.text", lang, { votes: num(v.minVotes, 0) })}</p>
            <ul className="og-alerts-criteria">
              <li>
                <strong>{t("ui.channel.pressure_drop", lang)}</strong>
                <span>{t("alerts.rules.fusion.pressure", lang, { value: num(v.zThr) })}</span>
              </li>
              <li>
                <strong>{t("ui.channel.level_trend", lang)}</strong>
                <span>{t("alerts.rules.fusion.trendFalling", lang)}</span>
                <span>{t("alerts.rules.fusion.trendLow", lang, { value: num(v.warnPct, 0) })}</span>
              </li>
              <li>
                <strong>{t("ui.channel.vib_impact", lang)}</strong>
                <span>{t("alerts.rules.fusion.kurt", lang, { value: num(v.kurtSpike) })}</span>
                <span>{t("alerts.rules.fusion.rms", lang, { value: num(v.rmsHighG) })}</span>
              </li>
            </ul>
          </section>
          <section className="og-alerts-section og-alerts-section--veto">
            <header className="og-alerts-section__head"><h3>{t("alerts.rules.veto.title", lang)}</h3><span className="og-mono">{t("ui.veto", lang)}</span></header>
            <p className="og-alerts-reason-line">{t("alerts.rules.veto.text", lang, { value: num(v.tempDriftC) })}</p>
            <ul className="og-alerts-criteria">
              <li>
                <strong>{t("ui.channel.temp_drift_veto", lang)}</strong>
                <span>{t("alerts.cmp.beyond", lang, { value: `${num(v.tempDriftC)} °C` })}</span>
              </li>
            </ul>
          </section>
        </div>

        <section className="og-alerts-section">
          <header className="og-alerts-section__head"><h3>{t("alerts.rules.ladder.title", lang)}</h3><span>{t("alerts.rules.ladder.active", lang)}</span></header>
          <div className="og-alerts-ladder">
            {LEVELS.map((level) => (
              <article className={`og-alerts-ladder__card og-alerts-ladder__card--${level}`}>
                <LevelTag lang={lang} level={level} />
                <ul>{ladder[level].map((line) => <li>{line}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        <section className="og-alerts-section">
          <header className="og-alerts-section__head"><h3>{t("alerts.rules.routing.title", lang)}</h3></header>
          <div className="og-alerts-table-wrap">
            <table className="og-alerts-table og-alerts-table--rules">
              <thead>
                <tr>
                  {(["level", "role", "does"] as const).map((column) => <th scope="col">{t(`alerts.rules.routing.col.${column}`, lang)}</th>)}
                </tr>
              </thead>
              <tbody>
                {LEVELS.map((level) => (
                  <tr>
                    <th scope="row"><LevelTag lang={lang} level={level} /></th>
                    <td>{roleLabel(ROUTING[level], lang)}</td>
                    <td>{t(`alerts.rules.routing.${level}`, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="og-alerts-note">{t("alerts.rules.routing.escalation", lang)}</p>
        </section>

        <p className="og-alerts-note">{t("alerts.rules.noControl", lang)}</p>
        <p className="og-alerts-backrow"><a className="og-button og-button--ghost og-alerts-link" href="/alerts">{t("alerts.rules.link", lang)}</a></p>
      </div>
    </main>
  );
}
