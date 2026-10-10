import { useMemo, useState } from "preact/hooks";
import { t, useLang } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { Button, FilterBar, FormField, KpiTile, Notice, PageHeader } from "../../ui/foundation";
import { useAlertData } from "./data";
import { ageLabel, localizeReason, roleLabel } from "./localize";
import {
  DEMO_NOW_MS, LEVELS, LIFECYCLES, ROLES, VOTING_CHANNELS, ageParts, countActiveByLevel, distribution7d,
  filterAlerts, parseWheelParam, recurrenceRanking, sortAlerts, type AlertFilters, type AlertRecord,
  type Level, type Lifecycle, type Role,
} from "./logic";
import { LevelTag, SourceTag, StateChip, detailHref } from "./shared";
import "./alerts.css";

const NO_FILTERS: AlertFilters = { level: "all", lifecycle: "all", truck: "all", role: "all", query: "" };

function channelNames(record: AlertRecord, lang: "en" | "es"): string {
  return VOTING_CHANNELS.filter((name) => record.channels[name] === "fired").map((name) => t(`ui.channel.${name}`, lang)).join(" · ");
}

export default function AlertsInboxPage() {
  const [lang] = useLang();
  const { records, demoRecords, liveCount, liveLoaded } = useAlertData();
  const [filters, setFilters] = useState<AlertFilters>(() => ({
    ...NO_FILTERS,
    wheel: typeof window === "undefined" ? undefined : parseWheelParam(window.location.search) ?? undefined,
  }));
  const patch = (change: Partial<AlertFilters>) => setFilters((current) => ({ ...current, ...change }));

  const visible = useMemo(() => sortAlerts(filterAlerts(records, filters)), [records, filters]);
  const active = countActiveByLevel(records);
  const distribution = useMemo(() => distribution7d(demoRecords, DEMO_NOW_MS), [demoRecords]);
  const ranking = useMemo(() => recurrenceRanking(demoRecords, 5), [demoRecords]);
  const trucks = useMemo(
    () => [...new Set(records.flatMap((record) => (record.truckId ? [record.truckId] : [])))].sort(),
    [records],
  );
  const hasFilters = JSON.stringify({ ...filters, wheel: filters.wheel ?? null }) !== JSON.stringify({ ...NO_FILTERS, wheel: null });
  const nowFor = (record: AlertRecord) => (record.source === "live" ? Date.now() : DEMO_NOW_MS);
  const liveMode = liveLoaded && liveCount > 0;

  return (
    <main className="og-page og-alerts-page">
      <div className="og-page__inner">
        <PageHeader
          eyebrow={t("alerts.eyebrow", lang)}
          title={t("alerts.title", lang)}
          description={t("alerts.description", lang)}
          meta={<span className={`og-alerts-pill og-alerts-pill--${liveMode ? "live" : "demo"}`}><i aria-hidden="true" />{t(liveMode ? "alerts.source.live" : "alerts.source.demo", lang)}</span>}
        />
        <Notice lang={lang} kind="info">
          {liveMode
            ? t("alerts.sourceNotice.live", lang, { count: formatNumber(liveCount, lang, 0) })
            : t("alerts.sourceNotice.demo", lang)}
        </Notice>

        <section className="og-alerts-tiles" aria-label={t("alerts.tiles.label", lang)}>
          {LEVELS.map((level) => (
            <KpiTile
              lang={lang}
              label={`${level} · ${t(`alerts.level.word.${level}`, lang)}`}
              value={formatNumber(active[level], lang, 0)}
              meta={t("alerts.tile.active", lang)}
              tone={active[level] === 0 ? "nominal" : level === "N4" ? "critical" : "warning"}
            />
          ))}
          <KpiTile lang={lang} label={t("alerts.tile.total", lang)} value={formatNumber(distribution.total, lang, 0)} meta={t("alerts.tile.totalMeta", lang)} />
        </section>

      <aside className="og-alerts-aside">
        <section className="og-alerts-card">
          <h3>{t("alerts.dist.title", lang)}</h3>
          {distribution.total ? (
            <>
              <div className="og-alerts-bar" role="img" aria-label={LEVELS.map((level) => `${level} ${t(`alerts.level.word.${level}`, lang)} ${formatNumber(distribution.byLevel[level].count, lang, 0)}`).join(", ")}>
                {LEVELS.map((level) => distribution.byLevel[level].count > 0 && <span className={`og-alerts-bar__seg og-alerts-bar__seg--${level}`} style={{ flexGrow: distribution.byLevel[level].count }} />)}
              </div>
              <ul className="og-alerts-legend">
                {LEVELS.map((level) => (
                  <li>
                    <i className={`og-alerts-swatch og-alerts-bar__seg--${level}`} aria-hidden="true" />
                    <span>{level} · {t(`alerts.level.word.${level}`, lang)}</span>
                    <b className="og-mono">{formatNumber(distribution.byLevel[level].count, lang, 0)} <small>({formatNumber(distribution.byLevel[level].share * 100, lang, 0)}%)</small></b>
                  </li>
                ))}
              </ul>
              <p className="og-alerts-note">{t("alerts.dist.total", lang, { count: formatNumber(distribution.total, lang, 0) })} · {t("alerts.dist.note", lang)}</p>
            </>
          ) : <p className="og-alerts-note">{t("alerts.dist.empty", lang)}</p>}
        </section>

        <section className="og-alerts-card">
          <h3>{t("alerts.recur.title", lang)}</h3>
          {ranking.length ? (
            <ol className="og-alerts-ranking">
              {ranking.map((entry) => (
                <li>
                  <button type="button" aria-label={t("alerts.recur.filter", lang, { value: entry.wheelId })} onClick={() => patch({ wheel: entry.wheelId })}>
                    <span className="og-alerts-ranking__main"><strong className="og-mono">{entry.wheelId}</strong><LevelTag lang={lang} level={entry.worst} /></span>
                    <small>{entry.truckId} · {t("alerts.recur.count", lang, { count: formatNumber(entry.count, lang, 0) })} · {t("alerts.recur.last", lang, { value: ageLabel(ageParts(entry.lastOpenedAt, DEMO_NOW_MS), lang) })}</small>
                  </button>
                </li>
              ))}
            </ol>
          ) : <p className="og-alerts-note">{t("alerts.recur.empty", lang)}</p>}
          <p className="og-alerts-note">{t("alerts.recur.note", lang)}</p>
        </section>

        <section className="og-alerts-card og-alerts-card--rule">
          <h3>{t("alerts.callout.title", lang)}</h3>
          <p>{t("alerts.callout.text", lang)}</p>
          <a href="/alerts/rules">{t("alerts.callout.link", lang)}</a>
        </section>
      </aside>
        <FilterBar>
          <FormField label={t("alerts.filter.level", lang)}>
            <select value={filters.level} onChange={(event) => patch({ level: event.currentTarget.value as Level | "all" })}>
              <option value="all">{t("alerts.filter.all", lang)}</option>
              {LEVELS.map((level) => <option value={level}>{level} · {t(`alerts.level.word.${level}`, lang)}</option>)}
            </select>
          </FormField>
          <FormField label={t("alerts.filter.lifecycle", lang)}>
            <select value={filters.lifecycle} onChange={(event) => patch({ lifecycle: event.currentTarget.value as Lifecycle | "all" })}>
              <option value="all">{t("alerts.filter.all", lang)}</option>
              {LIFECYCLES.map((state) => <option value={state}>{t(`alerts.lifecycle.${state}`, lang)}</option>)}
            </select>
          </FormField>
          <FormField label={t("alerts.filter.truck", lang)}>
            <select value={filters.truck} onChange={(event) => patch({ truck: event.currentTarget.value })}>
              <option value="all">{t("alerts.filter.all", lang)}</option>
              {trucks.map((truck) => <option value={truck}>{truck}</option>)}
            </select>
          </FormField>
          <FormField label={t("alerts.filter.role", lang)}>
            <select value={filters.role} onChange={(event) => patch({ role: event.currentTarget.value as Role | "all" })}>
              <option value="all">{t("alerts.filter.all", lang)}</option>
              {ROLES.map((role) => <option value={role}>{roleLabel(role, lang)}</option>)}
            </select>
          </FormField>
          <FormField label={t("alerts.filter.search", lang)}>
            <input type="search" value={filters.query} placeholder={t("alerts.filter.searchPlaceholder", lang)} onInput={(event) => patch({ query: event.currentTarget.value })} />
          </FormField>
          {hasFilters && <Button type="button" variant="ghost" onClick={() => setFilters(NO_FILTERS)}>{t("alerts.filter.reset", lang)}</Button>}
        </FilterBar>
        {filters.wheel && (
          <p className="og-alerts-wheel-filter">
            <span className="og-mono">{t("alerts.filter.wheel", lang, { value: filters.wheel })}</span>
            <button type="button" onClick={() => patch({ wheel: undefined })}>{t("alerts.filter.wheelClear", lang)}</button>
          </p>
        )}

        <section className="og-alerts-main">
            <div className="og-alerts-table-wrap">
              <table className="og-alerts-table">
                <caption className="og-visually-hidden">{t("alerts.table.caption", lang)}</caption>
                <thead>
                  <tr>
                    {(["id", "wheel", "level", "reason", "channels", "state", "recipient", "age", "owner"] as const).map((column) => (
                      <th scope="col">{t(`alerts.col.${column}`, lang)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((record) => {
                    const open = () => { window.location.href = detailHref(record.id); };
                    return (
                      <tr
                        className={`og-alerts-row og-alerts-row--${record.lifecycle === "closed" ? "closed" : record.level}`}
                        tabIndex={0}
                        aria-label={t("alerts.rowOpen", lang, { value: record.id })}
                        onClick={(event) => { if (!(event.target as HTMLElement).closest("a")) open(); }}
                        onKeyDown={(event) => { if (event.key === "Enter") open(); }}
                      >
                        <td className="og-alerts-idcell">
                          <a className="og-mono" href={detailHref(record.id)}>{record.id}</a>
                          <SourceTag lang={lang} source={record.source} />
                        </td>
                        <td className="og-alerts-wheelcell">
                          {record.wheelId
                            ? <><strong>{record.truckId}</strong><span className="og-mono">{record.wheelId}</span></>
                            : <strong>{t("alerts.liveDevice", lang)}</strong>}
                        </td>
                        <td><LevelTag lang={lang} level={record.level} /></td>
                        <td className="og-alerts-reason">{localizeReason(record, lang)}</td>
                        <td className="og-alerts-channels">
                          {record.votes === 0 && Object.values(record.channels).every((state) => state === "no-data")
                            ? <span className="og-alerts-muted">{t("alerts.channelsNoData", lang)}</span>
                            : <><b className="og-mono">{t("alerts.channelsOf", lang, { count: formatNumber(record.votes, lang, 0) })}</b><small>{channelNames(record, lang)}</small></>}
                        </td>
                        <td><StateChip lang={lang} state={record.lifecycle} /></td>
                        <td>{roleLabel(record.recipient, lang)}</td>
                        <td className="og-mono og-alerts-age">{ageLabel(ageParts(record.openedAt, nowFor(record)), lang)}</td>
                        <td>{roleLabel(record.owner, lang)}{record.audit.some((entry) => entry.local) && <small className="og-alerts-local"> {t("alerts.localTag", lang)}</small>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!visible.length && <p className="og-alerts-empty">{t("alerts.empty", lang)}</p>}
            </div>
            <p className="og-alerts-count og-mono">{t("alerts.showing", lang, { count: formatNumber(visible.length, lang, 0), value: formatNumber(records.length, lang, 0) })}</p>
        </section>
      </div>
    </main>
  );
}
