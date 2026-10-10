import { useCallback, useMemo, useState } from "preact/hooks";
import { formatNumber } from "../../i18n/numberFormat";
import { t, useLang, type Lang } from "../../i18n";
import { useBackendOrDemo } from "../../ui/backendOrDemo";
import { DataTable, KpiTile, PageHeader, SegmentedControl, SyntheticBadge } from "../../ui/foundation";
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
  scatterPosition,
  scatterTicks,
  windowRows,
  type FixtureScenario,
  type Pair,
} from "./logic";
import "./validation.css";

const LIVE_DEVICE = "wheel-RH-01";
const WINDOW_ROWS_MAX = 15;
const NO_LIVE_DATA = { points: [], hasTruth: false, sigmaL: null } as ReturnType<typeof liveSeries>;
const BENCH_ITEMS = [1, 2, 3, 4, 5, 6] as const;

function ScatterPlot({ lang, pairs, bandL }: { lang: Lang; pairs: Pair[]; bandL: number | null }) {
  const domain = useMemo(() => scatterDomain(pairs), [pairs]);
  const ticks = scatterTicks(domain);
  const span = domain[1] - domain[0] || 1;
  const toPercent = (value: number) => ((value - domain[0]) / span) * 100;
  const bandPercent = bandL === null ? 0 : (bandL / span) * 100;
  const dots = useMemo(() => pairs.map((pair) => ({ pair, ...scatterPosition(pair, domain) })), [pairs, domain]);
  return (
    <figure className="val-scatter">
      <div className="val-scatter__frame">
        <div className="val-scatter__plot" role="img" aria-label={t("lab.validation.scatter.aria", lang)}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false" aria-hidden="true">
            {ticks.map((tick) => <line className="og-chart-grid" x1={toPercent(tick)} x2={toPercent(tick)} y1="0" y2="100" />)}
            {ticks.map((tick) => <line className="og-chart-grid" x1="0" x2="100" y1={100 - toPercent(tick)} y2={100 - toPercent(tick)} />)}
            {bandL !== null && (
              <polygon
                className="val-scatter__band"
                points={`0,${100 - bandPercent} 100,${-bandPercent} 100,${bandPercent} 0,${100 + bandPercent}`}
              />
            )}
            <line className="og-identity-line val-scatter__identity" x1="0" y1="100" x2="100" y2="0" />
            {dots.map(({ pair, x, y }) => {
              const inside = pair.bandL !== null && Math.abs(pair.errorL) <= pair.bandL;
              const kind = pair.baseline ? "baseline" : inside ? "inside" : "outside";
              return <circle className={`val-dot val-dot--${kind}`} cx={x} cy={y} r="0.95" />;
            })}
          </svg>
          {ticks.map((tick) => (
            <span className="og-chart-ytick" style={{ top: `${100 - toPercent(tick)}%` }}>{formatNumber(tick, lang, 0)}</span>
          ))}
          {ticks.map((tick) => (
            <span className="og-chart-xtick" style={{ left: `${toPercent(tick)}%` }}>{formatNumber(tick, lang, 0)}</span>
          ))}
        </div>
        <span className="val-scatter__axis val-scatter__axis--y">{t("lab.validation.scatter.y", lang)}</span>
        <span className="val-scatter__axis val-scatter__axis--x">{t("lab.validation.scatter.x", lang)}</span>
      </div>
      <figcaption className="val-scatter__legend">
        <span><i className="val-key val-key--identity" />{t("lab.validation.scatter.identity", lang)}</span>
        <span><i className="val-key val-key--inside" />{t("lab.validation.scatter.inside", lang)}</span>
        <span><i className="val-key val-key--outside" />{t("lab.validation.scatter.outside", lang)}</span>
        <span><i className="val-key val-key--baseline" />{t("lab.validation.scatter.baseline", lang)}</span>
      </figcaption>
    </figure>
  );
}

export default function ValidationPage() {
  const [lang] = useLang();
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
    (fixtureScenarios() as string[]).includes(id) ? t(`lab.sim.scenario.${id as FixtureScenario}`, lang) : id;
  const filterOptions = [t("lab.validation.all", lang), ...fixtureScenarios().map(scenarioName)];
  const filterValue = filter === "all" ? filterOptions[0] : scenarioName(filter);
  const number = (value: number | null, digits: number) => (value === null ? "—" : formatNumber(value, lang, digits));
  const emptyMeta = metrics.n === 0 ? t("lab.validation.metric.empty", lang) : undefined;

  const columns = [
    ...(useLive ? [] : [{ key: "scenario", label: t("lab.validation.windows.scenario", lang) }]),
    { key: "window", label: t("lab.validation.windows.window", lang) },
    { key: "span", label: t("lab.validation.windows.span", lang) },
    { key: "n", label: t("lab.validation.windows.n", lang) },
    { key: "truth", label: t("lab.validation.windows.truth", lang) },
    { key: "estimate", label: t("lab.validation.windows.estimate", lang) },
    { key: "bias", label: t("lab.validation.windows.bias", lang) },
    { key: "mae", label: t("lab.validation.windows.mae", lang) },
    { key: "max", label: t("lab.validation.windows.max", lang) },
  ];
  const rows = windows.map((row) => ({
    id: `${row.scenario}-${row.windowId}`,
    cells: {
      scenario: scenarioName(row.scenario),
      window: (
        <span className="lab-mono">
          {formatNumber(row.windowId, lang, 0)}
          {row.baseline && <em className="val-baseline-tag">{t("lab.validation.windows.baseline", lang)}</em>}
        </span>
      ),
      span: <span className="lab-mono">{formatNumber(row.startS, lang, 1)}–{formatNumber(row.endS, lang, 1)}</span>,
      n: <span className="lab-mono">{formatNumber(row.n, lang, 0)}</span>,
      truth: <span className="lab-mono">{formatNumber(row.truthMeanL, lang, 1)}</span>,
      estimate: <span className="lab-mono">{formatNumber(row.estimateMeanL, lang, 1)}</span>,
      bias: <span className="lab-mono">{formatNumber(row.bias, lang, 2)}</span>,
      mae: <span className="lab-mono">{formatNumber(row.mae, lang, 2)}</span>,
      max: <span className="lab-mono">{formatNumber(row.maxAbs, lang, 2)}</span>,
    },
  }));

  return (
    <div className="og-page lab-page val-page">
      <div className="og-page__inner">
        <LabBanner lang={lang} title={t("lab.validation.banner", lang)} detail={t("lab.validation.bannerDetail", lang)} />
        <PageHeader
          eyebrow={t("lab.eyebrow", lang)}
          title={t("lab.validation.title", lang)}
          description={t("lab.validation.description", lang)}
          meta={<SyntheticBadge lang={lang} />}
        />

        <div className="lab-source">
          <span className={`lab-source__dot lab-source__dot--${useLive ? "live" : "demo"}`} />
          <strong>{useLive ? t("lab.validation.source.live", lang) : t("lab.validation.source.fixture", lang)}</strong>
          {liveWithoutTruth && <span>{t("lab.validation.source.noTruth", lang)}</span>}
          {!useLive && <span>{t("lab.validation.source.fixtureNote", lang)}</span>}
        </div>

        {!useLive && (
          <div className="val-filter" role="group" aria-label={t("lab.validation.scenarios", lang)}>
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
          <KpiTile lang={lang} label={t("lab.validation.metric.mae", lang)} value={number(metrics.mae, 2)} unit={metrics.mae === null ? undefined : "L"} meta={emptyMeta} />
          <KpiTile lang={lang} label={t("lab.validation.metric.bias", lang)} value={number(metrics.bias, 2)} unit={metrics.bias === null ? undefined : "L"} meta={emptyMeta} />
          <KpiTile lang={lang} label={t("lab.validation.metric.max", lang)} value={number(metrics.maxAbs, 2)} unit={metrics.maxAbs === null ? undefined : "L"} meta={emptyMeta} />
          <KpiTile
            lang={lang}
            label={t("lab.validation.metric.n", lang)}
            value={formatNumber(metrics.n, lang, 0)}
            meta={t("lab.validation.metric.nMeta", lang, { count: formatNumber(baselineCount, lang, 0) })}
          />
          <KpiTile
            lang={lang}
            label={t("lab.validation.metric.within", lang)}
            value={metrics.withinShare === null ? "—" : formatNumber(metrics.withinShare * 100, lang, 1)}
            unit={metrics.withinShare === null ? undefined : "%"}
            meta={bandL === null ? emptyMeta : t("lab.validation.metric.withinMeta", lang, { value: formatNumber(bandL, lang, 2) })}
          />
        </div>

        <div className="val-page__grid">
          <section className="lab-panel" aria-labelledby="val-scatter-title">
            <div className="lab-panel__head"><h3 id="val-scatter-title">{t("lab.validation.scatter.title", lang)}</h3></div>
            <ScatterPlot lang={lang} pairs={shown} bandL={scatterBand} />
          </section>

          <section className="lab-panel val-notes" aria-labelledby="val-notes-title">
            <div className="lab-panel__head"><h3 id="val-notes-title">{t("lab.validation.notes.title", lang)}</h3></div>
            <ul>
              <li>{t("lab.validation.notes.error", lang)}</li>
              <li>{t("lab.validation.notes.gated", lang)}</li>
              <li>{t("lab.validation.notes.band", lang)}</li>
              <li>{t("lab.validation.notes.baseline", lang)}</li>
              <li>{t("lab.validation.notes.settling", lang)}</li>
              {showDriftNote && <li>{t("lab.validation.notes.drift", lang)}</li>}
            </ul>
          </section>
        </div>

        <section className="lab-panel val-windows" aria-labelledby="val-windows-title">
          <div className="lab-panel__head"><h3 id="val-windows-title">{t("lab.validation.windows.title", lang)}</h3></div>
          {rows.length === 0
            ? <p className="lab-note">{t("lab.validation.windows.empty", lang)}</p>
            : <DataTable lang={lang} columns={columns} rows={rows} caption={t("lab.validation.windows.caption", lang)} compact />}
        </section>

        <section className="lab-panel val-bench" aria-labelledby="val-bench-title">
          <div className="lab-panel__head">
            <div>
              <h3 id="val-bench-title">{t("lab.validation.bench.title", lang)}</h3>
              <p>{t("lab.validation.bench.description", lang)}</p>
            </div>
          </div>
          <ul className="val-bench__grid">
            {BENCH_ITEMS.map((id) => (
              <li>
                <h4>{t(`lab.validation.bench.${id}.title`, lang)}</h4>
                <p>{t(`lab.validation.bench.${id}.body`, lang)}</p>
                <span className="lab-chip-status">{t("lab.validation.bench.status", lang)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
