import { useEffect, useState } from "preact/hooks";
import { t } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { loadWithTimeout } from "../../ui/backendOrDemo";
import { Notice, PageHeader, ProvenanceTag, SyntheticBadge } from "../../ui/foundation";
import { roleLabel } from "./localize";
import { LEVELS, ROUTING } from "./logic";
import { RULE_SOURCES } from "./rules";
import { LevelTag } from "./shared";
import { fetchThresholds, resolveThresholds, thresholdRows, type ResolvedThresholds, type ThresholdRow } from "./thresholds";
import "./alerts.css";

function rowValue(row: ThresholdRow): string {
  if (row.unit === "votes") return t("alerts.channelsOf", { count: formatNumber(row.value, 0) });
  const base = `${row.prefix ?? ""}${formatNumber(row.value, row.decimals)}${row.unit ? ` ${row.unit}` : ""}`;
  return row.litres === undefined ? base : `${base} · ${formatNumber(row.litres, 1)} L`;
}

export default function AlertRulesPage() {
  const [resolved, setResolved] = useState<ResolvedThresholds>(() => resolveThresholds(null));

  useEffect(() => {
    let active = true;
    void loadWithTimeout((signal) => fetchThresholds(signal))
      .then((payload) => { if (active) setResolved(resolveThresholds(payload)); })
      .catch(() => { if (active) setResolved(resolveThresholds(null)); });
    return () => { active = false; };
  }, []);

  const v = resolved.values;
  const num = (value: number, digits = 1) => formatNumber(value, digits);
  const ladder: Record<string, string[]> = {
    N1: [t("alerts.rules.ladder.N1")],
    N2: [t("alerts.rules.ladder.N2")],
    N3: [t("alerts.rules.ladder.N3", { value: num(v.shiftH, 0) })],
    N4: [
      t("alerts.rules.ladder.N4a", { value: num(v.critPct, 0) }),
      t("alerts.rules.ladder.N4b", { value: num(v.abruptStepL) }),
      t("alerts.rules.ladder.N4c", { value: num(v.zExtreme) }),
    ],
  };

  return (
    <main className="og-page og-alerts-page og-alerts-rules">
      <div className="og-page__inner">
        <PageHeader
          eyebrow={t("alerts.rules.eyebrow")}
          title={t("alerts.rules.title")}
          description={t("alerts.rules.description")}
          meta={<span className={`og-alerts-pill og-alerts-pill--${resolved.source === "live" ? "live" : "demo"}`}><i aria-hidden="true" />{t(resolved.source === "live" ? "alerts.source.live" : "alerts.source.demo")}</span>}
        />
        <Notice kind="warning">{t("alerts.rules.readOnly")}</Notice>
        <p className="og-alerts-source-line">
          <SyntheticBadge />
          <span>{t(resolved.source === "live" ? "alerts.rules.source.live" : "alerts.rules.source.constant")}</span>
        </p>
        <p className="og-alerts-note">{t("alerts.rules.proxy")}</p>

        <section className="og-alerts-section">
          <header className="og-alerts-section__head"><h3>{t("alerts.rules.thresholds.title")}</h3></header>
          <div className="og-alerts-table-wrap">
            <table className="og-alerts-table og-alerts-table--rules">
              <thead>
                <tr>
                  {(["rule", "value", "used", "source"] as const).map((column) => <th scope="col">{t(`alerts.rules.col.${column}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {thresholdRows(v).map((row) => (
                  <tr>
                    <th scope="row">{t(row.labelKey)}</th>
                    <td className="og-mono"><span>{rowValue(row)}</span> <ProvenanceTag value="CONFIGURACIÓN" /></td>
                    <td>{t(row.usedKey)}</td>
                    <td className="og-mono og-alerts-muted">{RULE_SOURCES[row.source]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="og-alerts-two">
          <section className="og-alerts-section">
            <header className="og-alerts-section__head"><h3>{t("alerts.rules.fusion.title")}</h3><span className="og-mono">{t("alerts.channelsOf", { count: num(v.minVotes, 0) })}</span></header>
            <p className="og-alerts-reason-line">{t("alerts.rules.fusion.text", { votes: num(v.minVotes, 0) })}</p>
            <ul className="og-alerts-criteria">
              <li>
                <strong>{t("ui.channel.pressure_drop")}</strong>
                <span>{t("alerts.rules.fusion.pressure", { value: num(v.zThr) })}</span>
              </li>
              <li>
                <strong>{t("ui.channel.level_trend")}</strong>
                <span>{t("alerts.rules.fusion.trendFalling")}</span>
                <span>{t("alerts.rules.fusion.trendLow", { value: num(v.warnPct, 0) })}</span>
              </li>
              <li>
                <strong>{t("ui.channel.vib_impact")}</strong>
                <span>{t("alerts.rules.fusion.kurt", { value: num(v.kurtSpike) })}</span>
                <span>{t("alerts.rules.fusion.rms", { value: num(v.rmsHighG) })}</span>
              </li>
            </ul>
          </section>
          <section className="og-alerts-section og-alerts-section--veto">
            <header className="og-alerts-section__head"><h3>{t("alerts.rules.veto.title")}</h3><span className="og-mono">{t("ui.veto")}</span></header>
            <p className="og-alerts-reason-line">{t("alerts.rules.veto.text", { value: num(v.tempDriftC) })}</p>
            <ul className="og-alerts-criteria">
              <li>
                <strong>{t("ui.channel.temp_drift_veto")}</strong>
                <span>{t("alerts.cmp.beyond", { value: `${num(v.tempDriftC)} °C` })}</span>
              </li>
            </ul>
          </section>
        </div>

        <section className="og-alerts-section">
          <header className="og-alerts-section__head"><h3>{t("alerts.rules.ladder.title")}</h3><span>{t("alerts.rules.ladder.active")}</span></header>
          <div className="og-alerts-ladder">
            {LEVELS.map((level) => (
              <article className={`og-alerts-ladder__card og-alerts-ladder__card--${level}`}>
                <LevelTag level={level} />
                <ul>{ladder[level].map((line) => <li>{line}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        <section className="og-alerts-section">
          <header className="og-alerts-section__head"><h3>{t("alerts.rules.routing.title")}</h3></header>
          <div className="og-alerts-table-wrap">
            <table className="og-alerts-table og-alerts-table--rules">
              <thead>
                <tr>
                  {(["level", "role", "does"] as const).map((column) => <th scope="col">{t(`alerts.rules.routing.col.${column}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {LEVELS.map((level) => (
                  <tr>
                    <th scope="row"><LevelTag level={level} /></th>
                    <td>{roleLabel(ROUTING[level])}</td>
                    <td>{t(`alerts.rules.routing.${level}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="og-alerts-note">{t("alerts.rules.routing.escalation")}</p>
        </section>

        <p className="og-alerts-note">{t("alerts.rules.noControl")}</p>
        <p className="og-alerts-backrow"><a className="og-button og-button--ghost og-alerts-link" href="/alerts">{t("alerts.rules.link")}</a></p>
      </div>
    </main>
  );
}
