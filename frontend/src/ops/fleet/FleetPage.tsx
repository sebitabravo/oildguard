import { useEffect, useMemo, useState } from "preact/hooks";
import { demoDataset } from "../../demo/dataset";
import { getFleetDevices } from "../../sim/api";
import { formatNumber } from "../../i18n/numberFormat";
import { t } from "../../i18n";
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

function FleetKpiStrip({ counts }: { counts: ReturnType<typeof fleetCounters> }) {
  return (
    <section className="og-fleet-kpi-strip" data-kpi-layout="tablet" aria-label={t("fleet.kpis")}>
      <div className="og-fleet-kpi">
        <div className="og-label">{t("fleet.kpiMonitored")}</div>
        <div className="og-kpi-tile__value">{formatNumber(counts.trucks, 0)}<small>{t("fleet.trucks")}</small></div>
        <div className="og-kpi-tile__meta">{formatNumber(counts.wheels, 0)} {t("fleet.gdy106Wheels")} · {t("fleet.activeCycle")}: {formatNumber(counts.activeTrucks, 0)}</div>
      </div>
      <div className={`og-fleet-kpi${counts.alerts ? " og-fleet-kpi--warning" : ""}`}>
        <div className="og-label">{t("fleet.kpiAlerts")}</div>
        <div className="og-kpi-tile__value">{formatNumber(counts.alerts, 0)}</div>
        <div className="og-kpi-tile__meta">{formatNumber(counts.n4, 0)} {t("fleet.n4Word")} · {formatNumber(counts.n2, 0)} {t("fleet.n2Word")}</div>
      </div>
      <div className={`og-fleet-kpi${counts.noLink ? " og-fleet-kpi--critical" : ""}`}>
        <div className="og-label">{t("fleet.kpiLink")}</div>
        <div className="og-kpi-tile__value">{formatNumber(counts.noLink, 0)}</div>
        <div className="og-kpi-tile__meta">{formatNumber(counts.stale, 0)} {t("fleet.staleWord")} · {formatNumber(counts.linkDown, 0)} {t("fleet.linkDownWord")}</div>
      </div>
    </section>
  );
}

// Cada campo muestra su procedencia junto al valor para que ningún dato DEMO
// se lea como vivo en una fila LIVE; el sigma sintético lleva su propio rótulo.
export function FleetFieldSource({ source }: { source: FleetSource }) {
  return (
    <small className={`og-fleet-source og-fleet-source--${source.toLowerCase()}`}>
      {t(source === "LIVE" ? "fleet.source.live" : "fleet.source.demo")}
    </small>
  );
}

export function FleetWheelRow({ row, now }: { row: FleetRow; now: number }) {
  const rowState = classifyRowState(row.wheel, row.lastComm);
  const values = row.wheel.history["250h"].flatMap((point) => point.liters === null ? [] : [point.liters]);
  return (
    <tr className={rowClass(row)} tabIndex={0} onClick={() => { window.location.href = buildWheelDetailHref(row.id); }} onKeyDown={(event) => { if (event.key === "Enter") window.location.href = buildWheelDetailHref(row.id); }}>
      <td className="og-fleet-wheel-cell"><strong>{row.truckId} · {row.wheel.position}</strong><span className="og-mono">{row.id}</span><FleetFieldSource source={row.source} /></td>
      <td className="og-fleet-level-cell"><div className="og-fleet-level"><LevelBar value={row.levelL} sigma={row.wheel.sigmaL} /><div className="og-fleet-level__value og-mono"><span>{formatNumber(row.levelL / 95 * 100, 1)}%</span><span>(~{formatNumber(row.levelL, 1)} <FleetFieldSource source={row.fieldSources.level} />)</span><span>± {formatNumber(row.wheel.sigmaL, 1)} L <FleetFieldSource source={row.fieldSources.sigma} /></span></div><b className="og-fleet-level__state">{stateLabel(rowState)}</b></div></td>
      <td><div className="og-fleet-level__sparkline"><Sparkline values={values} label={t("fleet.sparkline")} /> <FleetFieldSource source={row.fieldSources.trend} /></div></td>
      <td className="og-mono">{formatNumber(row.wheel.lossRateLPer100h, 2)} L/100 h <FleetFieldSource source={row.fieldSources.lossRate} /></td>
      <td className="og-mono">{formatNumber(row.wheel.temperatureC, 1)} °C <FleetFieldSource source={row.fieldSources.temperature} /></td>
      <td className="og-mono">{formatNumber(row.wheel.vibRms, 2)} g <FleetFieldSource source={row.fieldSources.vibration} /></td>
      <td><RegimeChip regime={row.wheel.regime} /> <FleetFieldSource source={row.fieldSources.regime} /></td>
      <td>{row.wheel.alertLevel ? <SeverityBadge severity={row.wheel.alertLevel} /> : "—"} <FleetFieldSource source={row.fieldSources.alert} /></td>
      <td className="og-fleet-last"><span>{rowState === "stale" ? t("fleet.state.stale") : rowState === "link-down" ? t("fleet.state.link-down") : relativeLastComm(row.lastComm, row.source === "DEMO" ? demoDataset.referenceMs : now)}</span>{(rowState === "stale" || rowState === "link-down") && <small>{rowState === "stale" ? t("fleet.staleDetail") : t("fleet.linkDownDetail")}</small>}<FleetFieldSource source={row.fieldSources.lastComm} /></td>
    </tr>
  );
}

export default function FleetPage() {
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
          eyebrow={t("fleet.eyebrow")}
          title={t("fleet.title")}
          description={t("fleet.description")}
          meta={<div className="og-fleet-header-meta"><span><i />{liveLoaded ? t("fleet.liveDevices", { count: formatNumber(liveDevices.length, 0) }) : t("fleet.demoSource")}</span><small>{t("fleet.sampling")}</small></div>}
        />

        <FleetKpiStrip counts={counts} />

        <FilterBar>
          <SegmentedControl
            options={["all", "930E", "980E"].map((option) => option === "all" ? t("fleet.modelAll") : option)}
            value={model === "all" ? t("fleet.modelAll") : model}
            onChange={(value) => setModel(value === t("fleet.modelAll") ? "all" : value)}
          />
          <div className="og-fleet-state-filters" role="group" aria-label={t("fleet.stateFilter")}>
            {(["all", "alert", "no-link", "out-of-service"] as const).map((item) => (
              <button type="button" className={`og-fleet-filter-chip ${state === item ? "is-active" : ""}`} aria-pressed={state === item} onClick={() => setState(item)}>
                {t(`fleet.filter.${item}`)} <b>{item === "all" ? counts.wheels : item === "alert" ? counts.alerts : item === "no-link" ? counts.noLink : counts.outOfService}</b>
              </button>
            ))}
          </div>
          <input className="og-fleet-search" aria-label={t("fleet.search")} placeholder={t("fleet.searchPlaceholder")} value={query} onInput={(event) => setQuery(event.currentTarget.value)} />
          <Button type="button" variant="ghost" onClick={downloadCsv}>{t("fleet.export")}</Button>
        </FilterBar>

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
                    <FleetWheelRow key={row.id} row={row} now={now} />
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <p className="og-fleet-helper">{t("fleet.helper")}</p>
        <FleetLivePanelBoundary><FleetLivePanel /></FleetLivePanelBoundary>
        {!visibleRows.length && <p className="og-fleet-empty">{t("fleet.empty")}</p>}
      </div>
    </main>
  );
}
