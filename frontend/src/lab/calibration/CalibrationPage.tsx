import { useCallback, useMemo, useState } from "preact/hooks";
import { demoDataset } from "../../demo/dataset";
import { formatNumber } from "../../i18n/numberFormat";
import { t, useLang } from "../../i18n";
import { getLevelSeries, getWindows, type LevelSeriesPoint, type WindowsResponse } from "../../sim/api";
import { settlingTau, VISC_MAX, VISC_MIN } from "../../sim/bench/settling";
import { EmptyState, PageHeader, ProvenanceTag, SyntheticBadge, TimeSeriesChart, ValidityChip } from "../../ui/foundation";
import { useBackendOrDemo } from "../../ui/backendOrDemo";
import { classifyCalibrationVerdict, fitSettlingTau, sampleSettlingCurve, settlingFitResidualL, type CalibrationWindowState } from "./logic";
import "./calibration.css";

const LIVE_DEVICE = "wheel-RH-01";
const DEMO_LEVEL_L = 93.4;
const DEMO_SIGMA_L = 0.8;

interface LiveCalibrationData {
  windows: WindowsResponse;
  series: LevelSeriesPoint[];
}

const demoData: LiveCalibrationData = {
  windows: {
    status: "ok",
    kind: "rest-windows",
    as_of: new Date(demoDataset.referenceMs).toISOString(),
    count: 1,
    windows: [{
      window_id: 1,
      state: "rest",
      start_t_s: 0,
      end_t_s: 4,
      start_iso: "",
      end_iso: "",
      duration_s: 4,
      zone: "LOAD",
      reason: "synthetic-proxy settling example",
    }],
    note: "synthetic-proxy example only",
  },
  series: [{ t_s: 4, level_l: DEMO_LEVEL_L, sigma_l: DEMO_SIGMA_L, moving: 0, recal_window: 1 }],
};

function verdictCopy(verdict: "nominal" | "slow" | "invalid" | "waiting", lang: "en" | "es") {
  const copy = {
    nominal: ["calibration.verdict.nominal", "calibration.verdict.nominalBody"],
    slow: ["calibration.verdict.slow", "calibration.verdict.slowBody"],
    invalid: ["calibration.verdict.invalid", "calibration.verdict.invalidBody"],
    waiting: ["calibration.verdict.waiting", "calibration.verdict.waitingBody"],
  } as const;
  return [t(copy[verdict][0], lang), t(copy[verdict][1], lang)];
}

export default function CalibrationPage() {
  const [lang] = useLang();
  const [wheelId, setWheelId] = useState(LIVE_DEVICE);
  const load = useCallback(async () => {
    if (wheelId !== LIVE_DEVICE) throw new Error("live calibration is available for wheel-RH-01 only");
    const [windows, level] = await Promise.all([getWindows(50, wheelId), getLevelSeries(300, wheelId)]);
    return { windows, series: level.series };
  }, [wheelId]);
  const live = useBackendOrDemo(load, demoData);
  const restWindows = live.data?.windows.windows.filter((window) => window.state === "rest") ?? [];
  const allWindows = live.data?.windows.windows ?? [];
  const liveWindow = restWindows[restWindows.length - 1];
  const latestWindow = allWindows[allWindows.length - 1];
  const fusedPoints = live.data?.series.filter((point) =>
    point.recal_window === 1
    && point.level_l !== null
    && liveWindow !== undefined
    && point.t_s >= liveWindow.start_t_s
    && point.t_s <= liveWindow.end_t_s
  ) ?? [];
  const fusedPoint = fusedPoints[fusedPoints.length - 1];
  const hasLiveEstimate = live.source === "live" && fusedPoint?.level_l !== null && fusedPoint?.level_l !== undefined;
  const resultLevel = hasLiveEstimate ? (fusedPoint?.level_l ?? DEMO_LEVEL_L) : DEMO_LEVEL_L;
  const resultSigma = hasLiveEstimate && fusedPoint?.sigma_l !== null && fusedPoint?.sigma_l !== undefined
    ? fusedPoint.sigma_l
    : DEMO_SIGMA_L;
  const curve = useMemo(() => sampleSettlingCurve({ viscosityProxy: 1, baseVolumeL: resultLevel, temperatureC: 75 }), [resultLevel]);
  const tauS = fitSettlingTau(curve);
  const residualL = settlingFitResidualL(curve, tauS);
  const liveWindowState: CalibrationWindowState = live.source !== "live"
    ? "available"
    : latestWindow?.state === "moving"
      ? "motion"
      : latestWindow?.state === "rest" && liveWindow !== undefined && fusedPoint !== undefined
        ? "available"
        : "waiting";
  const verdict = classifyCalibrationVerdict(tauS, residualL, liveWindowState);
  const [verdictTitle, verdictBody] = verdictCopy(verdict, lang);
  const values = curve.map((sample) => sample.pressureKpa);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const asymptoteY = 12 + (max - (curve[0]?.asymptoteKpa ?? max)) / (max - min || 1) * 144;
  const tauMin = settlingTau(VISC_MIN);
  const tauMax = settlingTau(VISC_MAX);
  const bandX = 38 + (tauMin / 4) * 294;
  const bandWidth = ((tauMax - tauMin) / 4) * 294;
  const displayTau = formatNumber(tauS, lang, 2);
  const displayLevel = formatNumber(resultLevel, lang, 1);
  const displaySigma = formatNumber(resultSigma, lang, 1);

  return (
    <div className="og-page calibration-page">
      <div className="og-page__inner">
        <PageHeader
          eyebrow={t("calibration.eyebrow", lang)}
          title={t("calibration.title", lang)}
          description={t("calibration.description", lang)}
          meta={<SyntheticBadge lang={lang} />}
        >
          <label className="calibration-page__selector">
            <span>{t("calibration.wheel", lang)}</span>
            <select value={wheelId} onChange={(event) => setWheelId(event.currentTarget.value)} aria-label={t("calibration.wheel", lang)}>
              {demoDataset.wheels.map((wheel) => <option value={wheel.id}>{wheel.id}</option>)}
            </select>
          </label>
        </PageHeader>

        <div className="calibration-page__source">
          <span className={`calibration-page__source-dot calibration-page__source-dot--${live.source}`} />
          <strong>{live.source === "live" ? t("calibration.source.live", lang) : t("calibration.source.demo", lang)}</strong>
          <span>{live.source !== "live" || liveWindow ? t("calibration.autoRegime", lang) : t("calibration.waitingRegime", lang)}</span>
        </div>

        <main className="calibration-page__grid">
          <section className="calibration-page__curve" aria-labelledby="calibration-curve-title">
            <div className="calibration-page__section-head">
              <div><h3 id="calibration-curve-title">{t("calibration.curveTitle", lang)}</h3><p>{t("calibration.curveDescription", lang)}</p></div>
              <span className="calibration-page__demo-label">{t("calibration.modelDemoBadge", lang)}</span>
              <ProvenanceTag lang={lang} value="DERIVED" />
            </div>
            <div className="calibration-page__chart">
              <div className="calibration-page__chart-wrap">
                <TimeSeriesChart lang={lang} values={values} title={t("calibration.curveTitle", lang)} events={[{ index: values.length - 1, label: t("calibration.windowEnd", lang) }]} />
                <svg className="calibration-page__chart-overlay" viewBox="0 0 360 180" aria-hidden="true">
                  <rect x={bandX} y="12" width={bandWidth} height="144" className="calibration-page__nominal-band" />
                  <line x1="38" x2="346" y1={asymptoteY} y2={asymptoteY} className="calibration-page__asymptote" />
                </svg>
              </div>
              <div className="calibration-page__chart-legend"><span><i className="calibration-page__legend-line" />{t("calibration.asymptote", lang)} · {formatNumber(curve[0]?.asymptoteKpa ?? 0, lang, 3)} kPa</span><span><i className="calibration-page__legend-band" />{t("calibration.nominalBand", lang)} · {formatNumber(tauMin, lang, 2)}–{formatNumber(tauMax, lang, 2)} s</span><span><i className="calibration-page__legend-marker" />{t("calibration.windowEnd", lang)}</span></div>
              <div className="calibration-page__chart-axis"><span>{t("calibration.pressure", lang)} · kPa</span><span>0 s — 4 s · {t("calibration.sinceStop", lang)}</span></div>
            </div>
            <p className="calibration-page__model-note">{t("calibration.modelNote", lang)}</p>
          </section>

          <aside className={`calibration-page__verdict calibration-page__verdict--${verdict}`} aria-live="polite">
            <div className="calibration-page__verdict-label">{t("calibration.verdictLabel", lang)}</div>
            <h3>{verdictTitle}</h3>
            <p>{verdictBody}</p>
            <dl><div><dt>{t("calibration.tau", lang)}</dt><dd>{displayTau} s</dd></div><div><dt>{t("calibration.fitResidual", lang)}</dt><dd>{formatNumber(residualL, lang, 3)} L</dd></div></dl>
          </aside>

          <section className="calibration-page__result">
            <div className="calibration-page__section-head"><h3>{t("calibration.resultTitle", lang)}</h3>{hasLiveEstimate ? <ValidityChip lang={lang} validity="valid" /> : <span className="calibration-page__demo-label">{t("calibration.modelDemoBadge", lang)}</span>}</div>
            <div className="calibration-page__readout"><strong>~{displayLevel} <small>± {displaySigma} L</small></strong><span>{t("calibration.restEstimate", lang)}</span></div>
            <div className="calibration-page__band-row"><span>{t("calibration.motionBand", lang)}</span><strong>~{displayLevel} ± {formatNumber(2.1, lang, 1)} L</strong></div>
            <div className="calibration-page__provenance"><span>{t("calibration.modelOutput", lang)}</span><ProvenanceTag lang={lang} value="DERIVED" /><span>{t("calibration.viscosityProxy", lang)}</span><ProvenanceTag lang={lang} value="ASSUMPTION" /></div>
          </section>

          <section className="calibration-page__window">
            <div className="calibration-page__section-head"><h3>{t("calibration.windowTitle", lang)}</h3><ValidityChip lang={lang} validity={latestWindow?.state === "moving" ? "invalid" : live.source === "live" && liveWindow ? "valid" : "estimate"} /></div>
            {liveWindow ? <dl><div><dt>{t("calibration.windowId", lang)}</dt><dd>{liveWindow.window_id}</dd></div><div><dt>{t("calibration.windowDuration", lang)}</dt><dd>{formatNumber(liveWindow.duration_s, lang, 1)} s</dd></div><div><dt>{t("calibration.fusedLevel", lang)}</dt><dd>{fusedPoint?.level_l === null || fusedPoint?.level_l === undefined ? t("calibration.noFusedLevel", lang) : `${formatNumber(fusedPoint.level_l, lang, 1)} ± ${formatNumber(fusedPoint.sigma_l ?? 0, lang, 1)} L`}</dd></div></dl> : <p>{t("calibration.windowDemo", lang)}</p>}
          </section>

          <section className="calibration-page__reference">
            <div className="calibration-page__section-head"><h3>{t("calibration.benchTitle", lang)}</h3><ProvenanceTag lang={lang} value="ASSUMPTION" /></div>
            <EmptyState title={t("calibration.benchEmpty", lang)} detail="docs/calibration.md" />
          </section>
        </main>

        <nav className="calibration-page__actions" aria-label={t("calibration.actions", lang)}>
          <a href={`/wheel?id=${encodeURIComponent(wheelId)}`}>{t("calibration.openWheel", lang)}</a>
          <a href="/wheel/history">{t("calibration.openHistory", lang)}</a>
        </nav>
      </div>
    </div>
  );
}
