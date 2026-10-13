import { useEffect, useMemo, useState } from "preact/hooks";
import { demoDataset } from "../../demo/demoData";
import { getFleetDevices } from "../../sim/api";
import { formatNumber } from "../../i18n/numberFormat";
import { t } from "../../i18n";
import BackendOutageNotice from "../../ui/BackendOutageNotice";
import {
  Button, FilterBar, LevelBar, PageHeader, RegimeChip,
  SegmentedControl, SeverityBadge, Sparkline,
} from "../../ui/foundation";
import FleetLivePanel from "../../dash/fleetLive/FleetLivePanel";
import FleetLivePanelBoundary from "../../dash/fleetLive/FleetLivePanelBoundary";
import {
  buildWheelDetailHref, classifyRowState, filterFleetRows, fleetCounters,
  groupFleetRows, mergeLiveDevices, relativeLastComm, toCsv, type FleetFilterState,
  type FleetRow, type FleetSource,
} from "./logic";
import "./fleet.css";

function stateLabel(state: ReturnType<typeof classifyRowState>): string {
  const key = state === "N1" ? "fleet.n1" : state === "N2" ? "fleet.n2" : state === "N4" ? "fleet.n4" : `fleet.state.${state}` as const;
  return t(key);
}

function modelLabel(model: string): string {
  return model.startsWith("980E") ? t("fleet.model980") : t("fleet.model930");
}

function rowClass(row: FleetRow): string {
  return `og-fleet-row og-fleet-row--${classifyRowState(row.wheel, row.lastComm)}`;
}

function FleetSourceSummary({ demo, live, liveConnected = true }: { demo: number; live: number; liveConnected?: boolean }) {
  if (demo > 0 && live > 0) {
    return <><FleetFieldSource source="MIXED" /><span className="og-fleet-source-split"><FleetFieldSource source="LIVE" liveConnected={liveConnected} /> {formatNumber(live, 0)} · <FleetFieldSource source="DEMO" /> {formatNumber(demo, 0)}</span></>;
  }
  return <FleetFieldSource source={live > 0 ? "LIVE" : "DEMO"} liveConnected={liveConnected} />;
}

export function FleetKpiStrip({ counts, rows, liveConnected = true }: { counts: ReturnType<typeof fleetCounters>; rows: FleetRow[]; liveConnected?: boolean }) {
  const sourceCounts = (items: FleetRow[], source: "source" | "alert" | "lastComm") => ({
    demo: items.filter((row) => source === "source" ? row.source === "DEMO" : row.fieldSources[source] === "DEMO").length,
    live: items.filter((row) => source === "source" ? row.source === "LIVE" : row.fieldSources[source] === "LIVE").length,
  });
  const countForState = (predicate: (state: ReturnType<typeof classifyRowState>, row: FleetRow) => boolean) =>
    rows.filter((row) => predicate(classifyRowState(row.wheel, row.lastComm), row));
  const alertRows = countForState((state) => ["N1", "N2", "N4"].includes(state));
  const noLinkRows = countForState((state) => state === "stale" || state === "link-down");
  const liveLinkDown = noLinkRows.filter((row) => row.wheel.state !== "link-down" && row.fieldSources.lastComm === "LIVE");
  const demoLinkDown = noLinkRows.filter((row) => !liveLinkDown.includes(row));
  const noLinkSources = { demo: demoLinkDown.length, live: liveLinkDown.length };
  const alertSources = sourceCounts(alertRows, "alert");
  const rowSources = sourceCounts(rows, "source");
  const truckSourceById = new Map<string, "DEMO" | "LIVE">();
  for (const row of rows) {
    if (row.source === "LIVE" || !truckSourceById.has(row.truckId)) truckSourceById.set(row.truckId, row.source);
  }
  const truckSources = {
    demo: [...truckSourceById.values()].filter((source) => source === "DEMO").length,
    live: [...truckSourceById.values()].filter((source) => source === "LIVE").length,
  };
  const staleRows = countForState((state) => state === "stale");
  const linkDownRows = countForState((state) => state === "link-down");
  const liveLinkDownRows = linkDownRows.filter((row) => row.wheel.state !== "link-down" && row.fieldSources.lastComm === "LIVE");
  const linkDownSources = { demo: linkDownRows.length - liveLinkDownRows.length, live: liveLinkDownRows.length };

  return (
    <section className="og-fleet-kpi-strip" data-kpi-layout="tablet" aria-label={t("fleet.kpis")}>
      <div className="og-fleet-kpi">
        <div className="og-label">{t("fleet.kpiMonitored")}</div>
        <div className="og-kpi-tile__value">{formatNumber(counts.trucks, 0)} <small>{t("fleet.trucks")}</small> <FleetSourceSummary {...truckSources} liveConnected={liveConnected} /></div>
        <div className="og-kpi-tile__meta">{formatNumber(counts.wheels, 0)} {t("fleet.gdy106Wheels")} <FleetSourceSummary {...rowSources} liveConnected={liveConnected} /> · {t("fleet.activeCycle")}: {formatNumber(counts.activeTrucks, 0)} <FleetFieldSource source="DEMO" /></div>
      </div>
      <div className={`og-fleet-kpi${counts.alerts ? " og-fleet-kpi--warning" : ""}`}>
        <div className="og-label">{t("fleet.kpiAlerts")}</div>
        <div className="og-kpi-tile__value">{formatNumber(counts.alerts, 0)} <FleetSourceSummary {...alertSources} liveConnected={liveConnected} /></div>
        <div className="og-kpi-tile__meta">{formatNumber(counts.n4, 0)} {t("fleet.n4Word")} <FleetFieldSource source="DEMO" /> · {formatNumber(counts.n2, 0)} {t("fleet.n2Word")} <FleetFieldSource source="DEMO" /></div>
      </div>
      <div className={`og-fleet-kpi${counts.noLink ? " og-fleet-kpi--critical" : ""}`}>
        <div className="og-label">{t("fleet.kpiLink")}</div>
        <div className="og-kpi-tile__value">{formatNumber(counts.noLink, 0)} <FleetSourceSummary {...noLinkSources} liveConnected={liveConnected} /></div>
        <div className="og-kpi-tile__meta">{formatNumber(counts.stale, 0)} {t("fleet.staleWord")} <FleetFieldSource source="DEMO" /> · {formatNumber(counts.linkDown, 0)} {t("fleet.linkDownWord")} <FleetSourceSummary {...linkDownSources} liveConnected={liveConnected} /></div>
      </div>
    </section>
  );
}

type FleetBackendState = "checking" | "live" | "unavailable";

export function FleetBackendOutageNotice({ backendState }: { backendState: FleetBackendState }) {
  return backendState === "unavailable" ? <BackendOutageNotice /> : null;
}

// Cada campo muestra su procedencia junto al valor para que ningún dato DEMO
// se lea como vivo en una fila LIVE; el sigma sintético lleva su propio rótulo.
export function FleetFieldSource({ source, liveConnected = true }: { source: FleetSource | "MIXED" | "CONFIGURATION"; liveConnected?: boolean }) {
  if (source === "LIVE" && !liveConnected) return null;
  return (
    <small className={`og-fleet-source og-fleet-source--${source.toLowerCase()}`}>
      {t(source === "LIVE" ? "fleet.source.live" : source === "DEMO" ? "fleet.source.demo" : source === "MIXED" ? "fleet.source.mixed" : "fleet.source.configuration")}
    </small>
  );
}

export function FleetHeaderMeta({ liveLoaded, deviceCount, liveConnected = true }: { liveLoaded: boolean; deviceCount: number; liveConnected?: boolean }) {
  return (
    <div className="og-fleet-header-meta">
      <span><i />{liveLoaded ? <>{t("fleet.liveDevices", { count: formatNumber(deviceCount, 0) })} <FleetFieldSource source="LIVE" liveConnected={liveConnected} /></> : t("fleet.demoSource")}</span>
      <small>{t("fleet.sampling")} <FleetFieldSource source="CONFIGURATION" /></small>
    </div>
  );
}

export function FleetWheelRow({ row, now, liveConnected = true }: { row: FleetRow; now: number; liveConnected?: boolean }) {
  const rowState = classifyRowState(row.wheel, row.lastComm);
  const values = row.wheel.history["250h"].flatMap((point) => point.liters === null ? [] : [point.liters]);
  return (
    <tr className={rowClass(row)} tabIndex={0} onClick={() => { window.location.href = buildWheelDetailHref(row.id); }} onKeyDown={(event) => { if (event.key === "Enter") window.location.href = buildWheelDetailHref(row.id); }}>
      <td className="og-fleet-wheel-cell"><strong>{row.truckId} · {row.wheel.position}</strong><a href={buildWheelDetailHref(row.id)} className="og-mono">{row.id}</a><FleetFieldSource source={row.source} liveConnected={liveConnected} /></td>
      <td className="og-fleet-level-cell"><div className="og-fleet-level"><LevelBar value={row.levelL} sigma={row.wheel.sigmaL} /><div className="og-fleet-level__value og-mono"><span>{formatNumber(row.levelL / 95 * 100, 1)}%</span><span>(~{formatNumber(row.levelL, 1)} <FleetFieldSource source={row.fieldSources.level} liveConnected={liveConnected} />)</span><span>± {formatNumber(row.wheel.sigmaL, 1)} L <FleetFieldSource source={row.fieldSources.sigma} liveConnected={liveConnected} /></span></div><b className="og-fleet-level__state">{stateLabel(rowState)}</b></div></td>
      <td><div className="og-fleet-level__sparkline"><Sparkline values={values} label={t("fleet.sparkline")} /> <FleetFieldSource source={row.fieldSources.trend} liveConnected={liveConnected} /></div></td>
      <td className="og-mono">{formatNumber(row.wheel.lossRateLPer100h, 2)} L/100 h <FleetFieldSource source={row.fieldSources.lossRate} liveConnected={liveConnected} /></td>
      <td className="og-mono">{formatNumber(row.wheel.temperatureC, 1)} °C <FleetFieldSource source={row.fieldSources.temperature} liveConnected={liveConnected} /></td>
      <td className="og-mono">{formatNumber(row.wheel.vibRms, 2)} g <FleetFieldSource source={row.fieldSources.vibration} liveConnected={liveConnected} /></td>
      <td><RegimeChip regime={row.wheel.regime} /> <FleetFieldSource source={row.fieldSources.regime} liveConnected={liveConnected} /></td>
      <td><span className="og-fleet-alert-cell">{row.wheel.alertLevel ? <SeverityBadge severity={row.wheel.alertLevel} /> : "—"} <FleetFieldSource source={row.fieldSources.alert} liveConnected={liveConnected} /></span></td>
      <td className="og-fleet-last"><span>{rowState === "stale" ? t("fleet.state.stale") : rowState === "link-down" ? t("fleet.state.link-down") : relativeLastComm(row.lastComm, row.source === "DEMO" ? demoDataset.referenceMs : now)}</span>{(rowState === "stale" || rowState === "link-down") && <small>{rowState === "stale" ? t("fleet.staleDetail") : t("fleet.linkDownDetail")}</small>}<FleetFieldSource source={row.fieldSources.lastComm} liveConnected={liveConnected} /></td>
    </tr>
  );
}

export default function FleetPage() {
  const [model, setModel] = useState("all");
  const [state, setState] = useState<FleetFilterState>("all");
  const [query, setQuery] = useState("");
  const [liveDevices, setLiveDevices] = useState<Parameters<typeof mergeLiveDevices>[1]>([]);
  const [backendState, setBackendState] = useState<FleetBackendState>("checking");
  const [socketConnected, setSocketConnected] = useState(false);
  const liveLoaded = backendState === "live";
  const liveConnected = liveLoaded && socketConnected;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await getFleetDevices() as unknown as { devices?: Parameters<typeof mergeLiveDevices>[1] };
        if (active) {
          setLiveDevices(response.devices ?? []);
          setBackendState("live");
        }
      } catch {
        if (active) setBackendState("unavailable");
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
  const filterRowSources = {
    demo: allRows.filter((row) => row.source === "DEMO").length,
    live: allRows.filter((row) => row.source === "LIVE").length,
  };
  const filterAlertRows = allRows.filter((row) => ["N1", "N2", "N4"].includes(classifyRowState(row.wheel, row.lastComm)));
  const filterAlertSources = {
    demo: filterAlertRows.filter((row) => row.fieldSources.alert === "DEMO").length,
    live: filterAlertRows.filter((row) => row.fieldSources.alert === "LIVE").length,
  };
  const filterNoLinkRows = allRows.filter((row) => ["stale", "link-down"].includes(classifyRowState(row.wheel, row.lastComm)));
  const filterLiveNoLinkRows = filterNoLinkRows.filter((row) => row.wheel.state !== "link-down" && row.fieldSources.lastComm === "LIVE");
  const filterNoLinkSources = { demo: filterNoLinkRows.length - filterLiveNoLinkRows.length, live: filterLiveNoLinkRows.length };
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
          eyebrow={t("fleet.eyebrow")}
          title={t("fleet.title")}
          description={t("fleet.description")}
          meta={<FleetHeaderMeta liveLoaded={liveLoaded} deviceCount={liveDevices.length} liveConnected={liveConnected} />}
        />

        <FleetBackendOutageNotice backendState={backendState} />

        <FleetKpiStrip counts={counts} rows={allRows} liveConnected={liveConnected} />

        <FilterBar>
          <SegmentedControl
            options={["all", "930E", "980E"].map((option) => option === "all" ? t("fleet.modelAll") : option)}
            value={model === "all" ? t("fleet.modelAll") : model}
            onChange={(value) => setModel(value === t("fleet.modelAll") ? "all" : value)}
          />
          <div className="og-fleet-state-filters" role="group" aria-label={t("fleet.stateFilter")}>
            {(["all", "alert", "no-link", "out-of-service"] as const).map((item) => (
              <button type="button" className={`og-fleet-filter-chip ${state === item ? "is-active" : ""}`} aria-pressed={state === item} onClick={() => setState(item)}>
                {t(`fleet.filter.${item}`)} <b>{item === "all" ? counts.wheels : item === "alert" ? counts.alerts : item === "no-link" ? counts.noLink : counts.outOfService}</b> {item === "all" ? <FleetSourceSummary {...filterRowSources} liveConnected={liveConnected} /> : item === "alert" ? <FleetSourceSummary {...filterAlertSources} liveConnected={liveConnected} /> : item === "no-link" ? <FleetSourceSummary {...filterNoLinkSources} liveConnected={liveConnected} /> : <FleetFieldSource source="DEMO" />}
              </button>
            ))}
          </div>
          <input className="og-fleet-search" aria-label={t("fleet.search")} placeholder={t("fleet.searchPlaceholder")} value={query} onInput={(event) => setQuery(event.currentTarget.value)} />
          <Button type="button" variant="ghost" onClick={downloadCsv}>{t("fleet.export")}</Button>
        </FilterBar>

        <p className="og-fleet-table-cue">{t("landing.tableScrollCue")}</p>
        <div className="og-fleet-table-wrap og-fleet-table-scroll">
          <table className="og-fleet-table">
            <caption className="og-visually-hidden">{t("fleet.tableCaption")}</caption>
            <colgroup>
              <col className="og-fleet-col-wheel" /><col className="og-fleet-col-level" /><col className="og-fleet-col-trend" />
              <col className="og-fleet-col-loss" /><col className="og-fleet-col-temp" /><col className="og-fleet-col-vibration" />
              <col className="og-fleet-col-regime" /><col className="og-fleet-col-alert" /><col className="og-fleet-col-last" />
            </colgroup>
            <thead><tr>
              <th>{t("fleet.columnWheel")}</th>
              <th>{t("fleet.columnLevel")}</th>
              <th>{t("fleet.columnTrend")}</th>
              <th>{t("fleet.columnLoss")}</th>
              <th>{t("fleet.columnTemp")}</th>
              <th>{t("fleet.columnVibration")}</th>
              <th>{t("fleet.columnRegime")}</th>
              <th>{t("fleet.columnAlert")}</th>
              <th>{t("fleet.columnLast")}</th>
            </tr></thead>
            <tbody>
              {visibleGroups.map((group) => (
                <>
                  <tr className="og-fleet-group">
                    <th colSpan={9}><span className="og-fleet-truck">{group.truckId}</span><span className="og-chip">{modelLabel(group.model)}</span><span className="og-fleet-group-regime">{t("fleet.regimeSummary")}</span><span className={`og-fleet-group-alert ${group.wheels.some((row) => ["N1", "N2", "N4", "stale", "link-down"].includes(classifyRowState(row.wheel, row.lastComm))) ? "is-attention" : "is-nominal"}`}>{group.wheels.some((row) => ["N1", "N2", "N4", "stale", "link-down"].includes(classifyRowState(row.wheel, row.lastComm))) ? t("fleet.groupAlert") : t("fleet.groupNominal")}</span></th>
                  </tr>
                  {group.wheels.map((row) => (
                    <FleetWheelRow key={row.id} row={row} now={now} liveConnected={liveConnected} />
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <details className="og-fleet-secondary">
          <summary>{t("fleet.secondaryDisclosure")}</summary>
          <p className="og-fleet-helper">{t("fleet.helper")}</p>
          <FleetLivePanelBoundary><FleetLivePanel connectionAvailable={liveLoaded} onConnectionChange={setSocketConnected} /></FleetLivePanelBoundary>
        </details>
        {!visibleRows.length && <p className="og-fleet-empty">{t("fleet.empty")}</p>}
      </div>
    </main>
  );
}
