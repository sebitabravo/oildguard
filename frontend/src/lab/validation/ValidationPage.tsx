import { useCallback, useMemo, useState } from "preact/hooks";
import { formatNumber } from "../../i18n/numberFormat";
import { t } from "../../i18n";
import { useBackendOrDemo } from "../../ui/backendOrDemo";
import { DataTable, KpiTile, PageHeader, ScatterChart, SegmentedControl, SyntheticBadge } from "../../ui/foundation";
import { LabBanner } from "../shared/LabBanner";
import { getValidationSeries } from "./api";
import {
  evaluate,
  evaluationPairs,
  fixtureScenarios,
  fixtureSeries,
  liveSeries,
  pairSeries,
  scatterDomain,
  windowRows,
  type FixtureScenario,
  type Pair,
} from "./logic";
import "./validation.css";

const LIVE_DEVICE = "wheel-RH-01";
const WINDOW_ROWS_MAX = 15;
const NO_LIVE_DATA = { points: [], hasTruth: false, sigmaL: null } as ReturnType<typeof liveSeries>;
const BENCH_ITEMS = [1, 2, 3, 4, 5, 6] as const;

function ScatterPlot({ pairs, bandL }: { pairs: Pair[]; bandL: number | null }) {
  const domain = useMemo(() => scatterDomain(pairs), [pairs]);
  const points = pairs.map((pair) => [pair.truthL, pair.estimateL] as [number, number]);
  const tones = pairs.map((pair) => pair.baseline ? "baseline" : pair.bandL !== null && Math.abs(pair.errorL) <= pair.bandL ? "inside" : "outside");
  return (
    <figure className="val-scatter">
      <div className="val-scatter__frame">
        <div className="val-scatter__plot">
          <ScatterChart
            points={points}
            pointTones={tones}
            title={t("lab.validation.scatter.aria")}
            domain={domain}
            band={bandL ?? 0}
          />
        </div>
        <span className="val-scatter__axis val-scatter__axis--y">{t("lab.validation.scatter.y")}</span>
        <span className="val-scatter__axis val-scatter__axis--x">{t("lab.validation.scatter.x")}</span>
      </div>
      <figcaption className="val-scatter__legend">
        <span><i className="val-key val-key--identity" />{t("lab.validation.scatter.identity")}</span>
        <span><i className="val-key val-key--inside" />{t("lab.validation.scatter.inside")}</span>
        <span><i className="val-key val-key--outside" />{t("lab.validation.scatter.outside")}</span>
        <span><i className="val-key val-key--baseline" />{t("lab.validation.scatter.baseline")}</span>
      </figcaption>
    </figure>
  );
}

export default function ValidationPage() {
  const [filter, setFilter] = useState<"all" | FixtureScenario>("all");
  const load = useCallback(async (signal?: AbortSignal) => liveSeries(await getValidationSeries(LIVE_DEVICE, signal)), []);
  const backend = useBackendOrDemo(load, NO_LIVE_DATA);
  const useLive = backend.source === "live" && backend.data?.hasTruth === true;
  const liveWithoutTruth = backend.source === "live" && !useLive;

  const allPairs = useMemo<Pair[]>(() => {
    if (useLive && backend.data) return pairSeries(backend.data.points, "live");
    return fixtureScenarios().flatMap((scenario) => pairSeries(fixtureSeries(scenario).points, scenario));
  }, [useLive, backend.data]);
  const shown = useLive || filter === "all" ? allPairs : allPairs.filter((pair) => pair.scenario === filter);
  const scored = evaluationPairs(shown);
  const { metrics, bandL } = evaluate(scored);
  const baselineCount = shown.length - scored.length;
  const windows = windowRows(shown).slice(-WINDOW_ROWS_MAX);
  const scatterBand = bandL;
  const showDriftNote = !useLive && (filter === "all" || filter === "sensor-drift");

  const scenarioName = (id: string) =>
    (fixtureScenarios() as string[]).includes(id) ? t(`lab.sim.scenario.${id as FixtureScenario}`) : id;
  const filterOptions = [t("lab.validation.all"), ...fixtureScenarios().map(scenarioName)];
  const filterValue = filter === "all" ? filterOptions[0] : scenarioName(filter);
  const number = (value: number | null, digits: number) => (value === null ? "—" : formatNumber(value, digits));
  const emptyMeta = metrics.n === 0 ? t("lab.validation.metric.empty") : undefined;

  const columns = [
    ...(useLive ? [] : [{ key: "scenario", label: t("lab.validation.windows.scenario") }]),
    { key: "window", label: t("lab.validation.windows.window") },
    { key: "span", label: t("lab.validation.windows.span") },
    { key: "n", label: t("lab.validation.windows.n") },
    { key: "truth", label: t("lab.validation.windows.truth") },
    { key: "estimate", label: t("lab.validation.windows.estimate") },
    { key: "bias", label: t("lab.validation.windows.bias") },
    { key: "mae", label: t("lab.validation.windows.mae") },
    { key: "max", label: t("lab.validation.windows.max") },
  ];
  const rows = windows.map((row) => ({
    id: `${row.scenario}-${row.windowId}`,
    cells: {
      scenario: scenarioName(row.scenario),
      window: (
        <span className="lab-mono">
          {formatNumber(row.windowId, 0)}
          {row.baseline && <em className="val-baseline-tag">{t("lab.validation.windows.baseline")}</em>}
        </span>
      ),
      span: <span className="lab-mono">{formatNumber(row.startS, 1)}–{formatNumber(row.endS, 1)}</span>,
      n: <span className="lab-mono">{formatNumber(row.n, 0)}</span>,
      truth: <span className="lab-mono">{formatNumber(row.truthMeanL, 1)}</span>,
      estimate: <span className="lab-mono">{formatNumber(row.estimateMeanL, 1)}</span>,
      bias: <span className="lab-mono">{formatNumber(row.bias, 2)}</span>,
      mae: <span className="lab-mono">{formatNumber(row.mae, 2)}</span>,
      max: <span className="lab-mono">{formatNumber(row.maxAbs, 2)}</span>,
    },
  }));

  return (
    <div className="og-page lab-page val-page">
      <div className="og-page__inner">
        <LabBanner title={t("lab.validation.banner")} detail={t("lab.validation.bannerDetail")} />
        <PageHeader
          eyebrow={t("lab.eyebrow")}
          title={t("lab.validation.title")}
          description={t("lab.validation.description")}
          meta={<SyntheticBadge />}
        />

        <div className="lab-source">
          <span className={`lab-source__dot lab-source__dot--${useLive ? "live" : "demo"}`} />
          <strong>{useLive ? t("lab.validation.source.live") : t("lab.validation.source.fixture")}</strong>
          {liveWithoutTruth && <span>{t("lab.validation.source.noTruth")}</span>}
          {!useLive && <span>{t("lab.validation.source.fixtureNote")}</span>}
        </div>

        {!useLive && (
          <div className="val-filter" role="group" aria-label={t("lab.validation.scenarios")}>
            <SegmentedControl
              options={filterOptions}
              value={filterValue}
              onChange={(value) => {
                const index = filterOptions.indexOf(value);
                setFilter(index <= 0 ? "all" : fixtureScenarios()[index - 1]);
              }}
            />
          </div>
        )}

        <div className="val-tiles">
          {/* La lógica ya calcula el RMSE agrupado; esta baldosa lo deja visible con su procedencia. */}
          <KpiTile

            label={t("lab.validation.metric.rmse")}
            value={number(metrics.rmse, 2)}
            unit={metrics.rmse === null ? undefined : "L"}
            meta={metrics.rmse === null
              ? emptyMeta
              : t("lab.validation.metric.rmseMeta", { count: formatNumber(metrics.n, 0) })}
          />
          <KpiTile label={t("lab.validation.metric.mae")} value={number(metrics.mae, 2)} unit={metrics.mae === null ? undefined : "L"} meta={emptyMeta} />
          <KpiTile label={t("lab.validation.metric.bias")} value={number(metrics.bias, 2)} unit={metrics.bias === null ? undefined : "L"} meta={emptyMeta} />
          <KpiTile label={t("lab.validation.metric.max")} value={number(metrics.maxAbs, 2)} unit={metrics.maxAbs === null ? undefined : "L"} meta={emptyMeta} />
          <KpiTile

            label={t("lab.validation.metric.n")}
            value={formatNumber(metrics.n, 0)}
            meta={t("lab.validation.metric.nMeta", { count: formatNumber(baselineCount, 0) })}
          />
          <KpiTile

            label={t("lab.validation.metric.within")}
            value={metrics.withinShare === null ? "—" : formatNumber(metrics.withinShare * 100, 1)}
            unit={metrics.withinShare === null ? undefined : "%"}
            meta={bandL === null ? emptyMeta : t("lab.validation.metric.withinMeta", { value: formatNumber(bandL, 2) })}
          />
        </div>
        {/* Procedencia del fixture y falsador no evaluado en banco: acompaña al RMSE agrupado. */}
        {!useLive && <p className="val-rmse-note">{t("lab.validation.rmseNote")}</p>}

        <div className="val-page__grid">
          <section className="lab-panel" aria-labelledby="val-scatter-title">
            <div className="lab-panel__head"><h3 id="val-scatter-title">{t("lab.validation.scatter.title")}</h3></div>
            <ScatterPlot pairs={shown} bandL={scatterBand} />
          </section>

          <section className="lab-panel val-notes" aria-labelledby="val-notes-title">
            <div className="lab-panel__head"><h3 id="val-notes-title">{t("lab.validation.notes.title")}</h3></div>
            <ul>
              <li>{t("lab.validation.notes.error")}</li>
              <li>{t("lab.validation.notes.gated")}</li>
              <li>{t("lab.validation.notes.band")}</li>
              <li>{t("lab.validation.notes.baseline")}</li>
              <li>{t("lab.validation.notes.settling")}</li>
              {showDriftNote && <li>{t("lab.validation.notes.drift")}</li>}
            </ul>
          </section>
        </div>

        <section className="lab-panel val-windows" aria-labelledby="val-windows-title">
          <div className="lab-panel__head"><h3 id="val-windows-title">{t("lab.validation.windows.title")}</h3></div>
          {rows.length === 0
            ? <p className="lab-note">{t("lab.validation.windows.empty")}</p>
            : <DataTable columns={columns} rows={rows} caption={t("lab.validation.windows.caption")} compact />}
        </section>

        <section className="lab-panel val-bench" aria-labelledby="val-bench-title">
          <div className="lab-panel__head">
            <div>
              <h3 id="val-bench-title">{t("lab.validation.bench.title")}</h3>
              <p>{t("lab.validation.bench.description")}</p>
            </div>
          </div>
          <ul className="val-bench__grid">
            {BENCH_ITEMS.map((id) => (
              <li>
                <h4>{t(`lab.validation.bench.${id}.title`)}</h4>
                <p>{t(`lab.validation.bench.${id}.body`)}</p>
                <span className="lab-chip-status">{t("lab.validation.bench.status")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
