import { useEffect, useMemo, useState } from "preact/hooks";
import { demoDataset } from "../../demo/dataset";
import { getFleetDevices } from "../../sim/api";
import { formatNumber } from "../../i18n/numberFormat";
import { t, useLang } from "../../i18n";
import {
  Button, FilterBar, KpiTile, LevelBar, PageHeader, RegimeChip,
  SegmentedControl, SeverityBadge, Sparkline,
} from "../../ui/foundation";
import FleetLivePanel from "../../dash/fleetLive/FleetLivePanel";
import FleetLivePanelBoundary from "../../dash/fleetLive/FleetLivePanelBoundary";
import {
  buildWheelDetailHref, classifyRowState, filterFleetRows, fleetCounters,
  groupFleetRows, mergeLiveDevices, relativeLastComm, toCsv, type FleetFilterState,
  type FleetRow,
} from "./logic";
import "./fleet.css";

function stateLabel(state: ReturnType<typeof classifyRowState>, lang: "en" | "es"): string {
  const key = state === "N1" ? "fleet.n1" : state === "N2" ? "fleet.n2" : state === "N4" ? "fleet.n4" : `fleet.state.${state}` as const;
  return t(key, lang);
}

function modelLabel(model: string, lang: "en" | "es"): string {
  return model.startsWith("980E") ? t("fleet.model980", lang) : t("fleet.model930", lang);
}

function rowClass(row: FleetRow): string {
  return `og-fleet-row og-fleet-row--${classifyRowState(row.wheel, row.lastComm)}`;
}

export default function FleetPage() {
  const [lang] = useLang();
  const [model, setModel] = useState("all");
  const [state, setState] = useState<FleetFilterState>("all");
  const [query, setQuery] = useState("");
  const [liveDevices, setLiveDevices] = useState<Parameters<typeof mergeLiveDevices>[1]>([]);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await getFleetDevices() as unknown as { devices?: Parameters<typeof mergeLiveDevices>[1] };
        if (active) {
          setLiveDevices(response.devices ?? []);
          setLiveLoaded(true);
        }
      } catch {
        if (active) setLiveLoaded(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const allRows = useMemo(() => mergeLiveDevices(demoDataset.trucks, liveDevices), [liveDevices]);
  const visibleRows = useMemo(() => filterFleetRows(allRows, model, state, query), [allRows, model, state, query]);
  const counts = fleetCounters(allRows);
  const visibleGroups = groupFleetRows(visibleRows);
  const downloadCsv = () => {
    const blob = new Blob([toCsv(visibleRows)], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "oilguard-fleet.csv";
    link.click();
    URL.revokeObjectURL(href);
  };

  return (
    <main className="og-page og-fleet-page">
      <div className="og-page__inner">
        <PageHeader
          eyebrow={t("fleet.eyebrow", lang)}
          title={t("fleet.title", lang)}
          description={t("fleet.description", lang)}
          meta={<div className="og-fleet-header-meta"><span><i />{liveLoaded ? t("fleet.liveDevices", lang, { count: formatNumber(liveDevices.length, lang, 0) }) : t("fleet.demoSource", lang)}</span><small>{t("fleet.sampling", lang)}</small></div>}
        />

        <section className="og-fleet-kpis" aria-label={t("fleet.kpis", lang)}>
          <KpiTile lang={lang} label={t("fleet.kpiMonitored", lang)} value={formatNumber(counts.trucks, lang, 0)} unit={t("fleet.trucks", lang)} meta={`${formatNumber(counts.wheels, lang, 0)} ${t("fleet.gdy106Wheels", lang)} · ${t("fleet.activeCycle", lang)}: ${formatNumber(counts.activeTrucks, lang, 0)}`} />
          <KpiTile lang={lang} label={t("fleet.kpiAlerts", lang)} value={formatNumber(counts.alerts, lang, 0)} meta={`${formatNumber(counts.n4, lang, 0)} ${t("fleet.n4Word", lang)} · ${formatNumber(counts.n2, lang, 0)} ${t("fleet.n2Word", lang)}`} tone={counts.alerts ? "warning" : "nominal"} />
          <KpiTile lang={lang} label={t("fleet.kpiLink", lang)} value={formatNumber(counts.noLink, lang, 0)} meta={`${formatNumber(counts.stale, lang, 0)} ${t("fleet.staleWord", lang)} · ${formatNumber(counts.linkDown, lang, 0)} ${t("fleet.linkDownWord", lang)}`} tone={counts.noLink ? "critical" : "nominal"} />
        </section>

        <FilterBar>
          <SegmentedControl
            options={["all", "930E", "980E"].map((option) => option === "all" ? t("fleet.modelAll", lang) : option)}
            value={model === "all" ? t("fleet.modelAll", lang) : model}
            onChange={(value) => setModel(value === t("fleet.modelAll", lang) ? "all" : value)}
          />
          <div className="og-fleet-state-filters" role="group" aria-label={t("fleet.stateFilter", lang)}>
            {(["all", "alert", "no-link", "out-of-service"] as const).map((item) => (
              <button type="button" className={`og-fleet-filter-chip ${state === item ? "is-active" : ""}`} aria-pressed={state === item} onClick={() => setState(item)}>
                {t(`fleet.filter.${item}`, lang)} <b>{item === "all" ? counts.wheels : item === "alert" ? counts.alerts : item === "no-link" ? counts.noLink : counts.outOfService}</b>
              </button>
            ))}
          </div>
          <input className="og-fleet-search" aria-label={t("fleet.search", lang)} placeholder={t("fleet.searchPlaceholder", lang)} value={query} onInput={(event) => setQuery(event.currentTarget.value)} />
          <Button type="button" variant="ghost" onClick={downloadCsv}>{t("fleet.export", lang)}</Button>
        </FilterBar>

        <div className="og-fleet-table-wrap">
          <table className="og-fleet-table">
            <caption className="og-visually-hidden">{t("fleet.tableCaption", lang)}</caption>
            <colgroup>
              <col className="og-fleet-col-wheel" /><col className="og-fleet-col-level" /><col className="og-fleet-col-trend" />
              <col className="og-fleet-col-loss" /><col className="og-fleet-col-temp" /><col className="og-fleet-col-vibration" />
              <col className="og-fleet-col-regime" /><col className="og-fleet-col-alert" /><col className="og-fleet-col-last" />
            </colgroup>
            <thead><tr>
              <th>{t("fleet.columnWheel", lang)}</th>
              <th>{t("fleet.columnLevel", lang)}</th>
              <th>{t("fleet.columnTrend", lang)}</th>
              <th>{t("fleet.columnLoss", lang)}</th>
              <th>{t("fleet.columnTemp", lang)}</th>
              <th>{t("fleet.columnVibration", lang)}</th>
              <th>{t("fleet.columnRegime", lang)}</th>
              <th>{t("fleet.columnAlert", lang)}</th>
              <th>{t("fleet.columnLast", lang)}</th>
            </tr></thead>
            <tbody>
              {visibleGroups.map((group) => (
                <>
                  <tr className="og-fleet-group">
                    <th colSpan={9}><span className="og-fleet-truck">{group.truckId}</span><span className="og-chip">{modelLabel(group.model, lang)}</span><span className="og-fleet-group-regime">{t("fleet.regimeSummary", lang)}</span><span className={`og-fleet-group-alert ${group.wheels.some((row) => ["N1", "N2", "N4", "stale", "link-down"].includes(classifyRowState(row.wheel, row.lastComm))) ? "is-attention" : "is-nominal"}`}>{group.wheels.some((row) => ["N1", "N2", "N4", "stale", "link-down"].includes(classifyRowState(row.wheel, row.lastComm))) ? t("fleet.groupAlert", lang) : t("fleet.groupNominal", lang)}</span></th>
                  </tr>
                  {group.wheels.map((row) => {
                    const rowState = classifyRowState(row.wheel, row.lastComm);
                    const values = row.wheel.history["250h"].flatMap((point) => point.liters === null ? [] : [point.liters]);
                    return (
                      <tr className={rowClass(row)} tabIndex={0} onClick={() => { window.location.href = buildWheelDetailHref(row.id); }} onKeyDown={(event) => { if (event.key === "Enter") window.location.href = buildWheelDetailHref(row.id); }}>
                        <td className="og-fleet-wheel-cell"><strong>{row.truckId} · {row.wheel.position}</strong><span className="og-mono">{row.id}</span><small className={`og-fleet-source og-fleet-source--${row.source.toLowerCase()}`}>{row.source}</small></td>
                        <td><div className="og-fleet-level"><LevelBar lang={lang} value={row.levelL} sigma={row.wheel.sigmaL} /><span className="og-mono">{formatNumber(row.levelL / 95 * 100, lang, 1)}% (~{formatNumber(row.levelL, lang, 1)} ± {formatNumber(row.wheel.sigmaL, lang, 1)} L) · <b>{stateLabel(rowState, lang)}</b></span></div></td>
                        <td><Sparkline lang={lang} values={values} label={t("fleet.sparkline", lang)} /></td>
                        <td className="og-mono">{formatNumber(row.wheel.lossRateLPer100h, lang, 2)} L/100 h</td>
                        <td className="og-mono">{formatNumber(row.wheel.temperatureC, lang, 1)} °C</td>
                        <td className="og-mono">{formatNumber(row.wheel.vibRms, lang, 2)} g</td>
                        <td><RegimeChip lang={lang} regime={row.wheel.regime} /></td>
                        <td>{row.wheel.alertLevel ? <SeverityBadge lang={lang} severity={row.wheel.alertLevel} /> : "—"}</td>
                        <td className="og-fleet-last"><span>{rowState === "stale" ? t("fleet.state.stale", lang) : rowState === "link-down" ? t("fleet.state.link-down", lang) : relativeLastComm(row.lastComm, row.source === "DEMO" ? demoDataset.referenceMs : now, lang)}</span><small>{rowState === "stale" ? t("fleet.staleDetail", lang) : rowState === "link-down" ? t("fleet.linkDownDetail", lang) : row.source}</small></td>
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <p className="og-fleet-helper">{t("fleet.helper", lang)}</p>
        <FleetLivePanelBoundary lang={lang}><FleetLivePanel lang={lang} /></FleetLivePanelBoundary>
        {!visibleRows.length && <p className="og-fleet-empty">{t("fleet.empty", lang)}</p>}
      </div>
    </main>
  );
}
