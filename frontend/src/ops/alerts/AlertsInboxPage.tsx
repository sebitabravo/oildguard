import { useMemo, useState } from "preact/hooks";
import { t } from "../../i18n";
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

function channelNames(record: AlertRecord): string {
  return VOTING_CHANNELS.filter((name) => record.channels[name] === "fired").map((name) => t(`ui.channel.${name}`)).join(" · ");
}

export default function AlertsInboxPage() {
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
          eyebrow={t("alerts.eyebrow")}
          title={t("alerts.title")}
          description={t("alerts.description")}
          meta={<span className={`og-alerts-pill og-alerts-pill--${liveMode ? "live" : "demo"}`}><i aria-hidden="true" />{t(liveMode ? "alerts.source.live" : "alerts.source.demo")}</span>}
        />
        <Notice kind="info">
          {liveMode
            ? t("alerts.sourceNotice.live", { count: formatNumber(liveCount, 0) })
            : t("alerts.sourceNotice.demo")}
        </Notice>

        <section className="og-alerts-tiles" aria-label={t("alerts.tiles.label")}>
          {LEVELS.map((level) => (
            <KpiTile

              label={`${level} · ${t(`alerts.level.word.${level}`)}`}
              value={formatNumber(active[level], 0)}
              meta={t("alerts.tile.active")}
              tone={active[level] === 0 ? "nominal" : level === "N4" ? "critical" : "warning"}
            />
          ))}
          <KpiTile label={t("alerts.tile.total")} value={formatNumber(distribution.total, 0)} meta={t("alerts.tile.totalMeta")} />
        </section>

      <aside className="og-alerts-aside">
        <section className="og-alerts-card">
          <h3>{t("alerts.dist.title")}</h3>
          {distribution.total ? (
            <>
              <div className="og-alerts-bar" role="img" aria-label={LEVELS.map((level) => `${level} ${t(`alerts.level.word.${level}`)} ${formatNumber(distribution.byLevel[level].count, 0)}`).join(", ")}>
                {LEVELS.map((level) => distribution.byLevel[level].count > 0 && <span className={`og-alerts-bar__seg og-alerts-bar__seg--${level}`} style={{ flexGrow: distribution.byLevel[level].count }} />)}
              </div>
              <ul className="og-alerts-legend">
                {LEVELS.map((level) => (
                  <li>
                    <i className={`og-alerts-swatch og-alerts-bar__seg--${level}`} aria-hidden="true" />
                    <span>{level} · {t(`alerts.level.word.${level}`)}</span>
                    <b className="og-mono">{formatNumber(distribution.byLevel[level].count, 0)} <small>({formatNumber(distribution.byLevel[level].share * 100, 0)}%)</small></b>
                  </li>
                ))}
              </ul>
              <p className="og-alerts-note">{t("alerts.dist.total", { count: formatNumber(distribution.total, 0) })} · {t("alerts.dist.note")}</p>
            </>
          ) : <p className="og-alerts-note">{t("alerts.dist.empty")}</p>}
        </section>

        <section className="og-alerts-card">
          <h3>{t("alerts.recur.title")}</h3>
          {ranking.length ? (
            <ol className="og-alerts-ranking">
              {ranking.map((entry) => (
                <li>
                  <button type="button" aria-label={t("alerts.recur.filter", { value: entry.wheelId })} onClick={() => patch({ wheel: entry.wheelId })}>
                    <span className="og-alerts-ranking__main"><strong className="og-mono">{entry.wheelId}</strong><LevelTag level={entry.worst} /></span>
                    <small>{entry.truckId} · {t("alerts.recur.count", { count: formatNumber(entry.count, 0) })} · {t("alerts.recur.last", { value: ageLabel(ageParts(entry.lastOpenedAt, DEMO_NOW_MS)) })}</small>
                  </button>
                </li>
              ))}
            </ol>
          ) : <p className="og-alerts-note">{t("alerts.recur.empty")}</p>}
          <p className="og-alerts-note">{t("alerts.recur.note")}</p>
        </section>

        <section className="og-alerts-card og-alerts-card--rule">
          <h3>{t("alerts.callout.title")}</h3>
          <p>{t("alerts.callout.text")}</p>
          <a href="/alerts/rules">{t("alerts.callout.link")}</a>
        </section>
      </aside>
        <FilterBar>
          <FormField label={t("alerts.filter.level")}>
            <select value={filters.level} onChange={(event) => patch({ level: event.currentTarget.value as Level | "all" })}>
              <option value="all">{t("alerts.filter.all")}</option>
              {LEVELS.map((level) => <option value={level}>{level} · {t(`alerts.level.word.${level}`)}</option>)}
            </select>
          </FormField>
          <FormField label={t("alerts.filter.lifecycle")}>
            <select value={filters.lifecycle} onChange={(event) => patch({ lifecycle: event.currentTarget.value as Lifecycle | "all" })}>
              <option value="all">{t("alerts.filter.all")}</option>
              {LIFECYCLES.map((state) => <option value={state}>{t(`alerts.lifecycle.${state}`)}</option>)}
            </select>
          </FormField>
          <FormField label={t("alerts.filter.truck")}>
            <select value={filters.truck} onChange={(event) => patch({ truck: event.currentTarget.value })}>
              <option value="all">{t("alerts.filter.all")}</option>
              {trucks.map((truck) => <option value={truck}>{truck}</option>)}
            </select>
          </FormField>
          <FormField label={t("alerts.filter.role")}>
            <select value={filters.role} onChange={(event) => patch({ role: event.currentTarget.value as Role | "all" })}>
              <option value="all">{t("alerts.filter.all")}</option>
              {ROLES.map((role) => <option value={role}>{roleLabel(role)}</option>)}
            </select>
          </FormField>
          <FormField label={t("alerts.filter.search")}>
            <input type="search" value={filters.query} placeholder={t("alerts.filter.searchPlaceholder")} onInput={(event) => patch({ query: event.currentTarget.value })} />
          </FormField>
          {hasFilters && <Button type="button" variant="ghost" onClick={() => setFilters(NO_FILTERS)}>{t("alerts.filter.reset")}</Button>}
        </FilterBar>
        {filters.wheel && (
          <p className="og-alerts-wheel-filter">
            <span className="og-mono">{t("alerts.filter.wheel", { value: filters.wheel })}</span>
            <button type="button" onClick={() => patch({ wheel: undefined })}>{t("alerts.filter.wheelClear")}</button>
          </p>
        )}

        <section className="og-alerts-main">
            <div className="og-alerts-table-wrap">
              <table className="og-alerts-table">
                <caption className="og-visually-hidden">{t("alerts.table.caption")}</caption>
                <thead>
                  <tr>
                    {(["id", "wheel", "level", "reason", "channels", "state", "recipient", "age", "owner"] as const).map((column) => (
                      <th scope="col">{t(`alerts.col.${column}`)}</th>
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
                        aria-label={t("alerts.rowOpen", { value: record.id })}
                        onClick={(event) => { if (!(event.target as HTMLElement).closest("a")) open(); }}
                        onKeyDown={(event) => { if (event.key === "Enter") open(); }}
                      >
                        <td className="og-alerts-idcell">
                          <a className="og-mono" href={detailHref(record.id)}>{record.id}</a>
                          <SourceTag source={record.source} />
                        </td>
                        <td className="og-alerts-wheelcell">
                          {record.wheelId
                            ? <><strong>{record.truckId}</strong><span className="og-mono">{record.wheelId}</span></>
                            : <strong>{t("alerts.liveDevice")}</strong>}
                        </td>
                        <td><LevelTag level={record.level} /></td>
                        <td className="og-alerts-reason">{localizeReason(record)}</td>
                        <td className="og-alerts-channels">
                          {record.votes === 0 && Object.values(record.channels).every((state) => state === "no-data")
                            ? <span className="og-alerts-muted">{t("alerts.channelsNoData")}</span>
                            : <><b className="og-mono">{t("alerts.channelsOf", { count: formatNumber(record.votes, 0) })}</b><small>{channelNames(record)}</small></>}
                        </td>
                        <td><StateChip state={record.lifecycle} /></td>
                        <td>{roleLabel(record.recipient)}</td>
                        <td className="og-mono og-alerts-age">{ageLabel(ageParts(record.openedAt, nowFor(record)))}</td>
                        <td>{roleLabel(record.owner)}{record.audit.some((entry) => entry.local) && <small className="og-alerts-local"> {t("alerts.localTag")}</small>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!visible.length && <p className="og-alerts-empty">{t("alerts.empty")}</p>}
            </div>
            <p className="og-alerts-count og-mono">{t("alerts.showing", { count: formatNumber(visible.length, 0), value: formatNumber(records.length, 0) })}</p>
        </section>
      </div>
    </main>
  );
}
