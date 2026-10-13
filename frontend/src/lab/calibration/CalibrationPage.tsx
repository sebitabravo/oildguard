import { useCallback, useMemo, useState } from "preact/hooks";
import { demoDataset } from "../../demo/demoData";
import { formatNumber } from "../../i18n/numberFormat";
import { t } from "../../i18n";
import { getLevelSeries, getWindows, type LevelSeriesPoint, type WindowsResponse } from "../../sim/api";
import { settlingTau, VISC_MAX, VISC_MIN } from "../../sim/bench/settling";
import { EmptyState, PageHeader, ProvenanceTag, SyntheticBadge, TimeSeriesChart, ValidityChip } from "../../ui/foundation";
import { useBackendOrDemo } from "../../ui/backendOrDemo";
import { calibrationVerdictEvidence, fitSettlingTau, sampleSettlingCurve, settlingFitResidualL, type CalibrationVerdictEvidence, type CalibrationWindowState } from "./logic";
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

function verdictCopy(verdict: "nominal" | "slow" | "invalid" | "waiting") {
  const copy = {
    nominal: ["calibration.verdict.nominal", "calibration.verdict.nominalBody"],
    slow: ["calibration.verdict.slow", "calibration.verdict.slowBody"],
    invalid: ["calibration.verdict.invalid", "calibration.verdict.invalidBody"],
    waiting: ["calibration.verdict.waiting", "calibration.verdict.waitingBody"],
  } as const;
  return [t(copy[verdict][0]), t(copy[verdict][1])];
}

export function CalibrationVerdictPanel({ evidence, tauS, residualL }: {
  evidence: CalibrationVerdictEvidence;
  tauS: number;
  residualL: number;
}) {
  const [title, body] = verdictCopy(evidence.verdict);
  return (
    <aside className={`calibration-page__verdict calibration-page__verdict--${evidence.verdict}`} aria-live="polite">
      <div className="calibration-page__verdict-label">{t("calibration.verdictLabel")}</div>
      <span className="calibration-page__demo-label">{t("calibration.verdict.synthetic")}</span>
      <h3>{title}</h3>
      <p>{body}</p>
      <p>{t("calibration.verdict.physicalNotEvaluated")}</p>
      <dl><div><dt>{t("calibration.tau")}</dt><dd>{formatNumber(tauS, 2)} s</dd></div><div><dt>{t("calibration.fitResidual")}</dt><dd>{formatNumber(residualL, 3)} L</dd></div></dl>
    </aside>
  );
}

export default function CalibrationPage() {
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
  const verdictEvidence = calibrationVerdictEvidence(tauS, residualL, liveWindowState);
  const values = curve.map((sample) => sample.pressureKpa);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const asymptoteY = 12 + (max - (curve[0]?.asymptoteKpa ?? max)) / (max - min || 1) * 144;
  const tauMin = settlingTau(VISC_MIN);
  const tauMax = settlingTau(VISC_MAX);
  const bandX = 38 + (tauMin / 4) * 294;
  const bandWidth = ((tauMax - tauMin) / 4) * 294;
  const displayLevel = formatNumber(resultLevel, 1);
  const displaySigma = formatNumber(resultSigma, 1);

  return (
    <div className="og-page calibration-page">
      <div className="og-page__inner">
        <PageHeader
          eyebrow={t("calibration.eyebrow")}
          title={t("calibration.title")}
          description={t("calibration.description")}
          meta={<SyntheticBadge />}
        >
          <label className="calibration-page__selector">
            <span>{t("calibration.wheel")}</span>
            <select value={wheelId} onChange={(event) => setWheelId(event.currentTarget.value)} aria-label={t("calibration.wheel")}>
              {demoDataset.wheels.map((wheel) => <option value={wheel.id}>{wheel.id}</option>)}
            </select>
          </label>
        </PageHeader>

        <div className="calibration-page__source">
          <span className={`calibration-page__source-dot calibration-page__source-dot--${live.source}`} />
          <strong>{live.source === "live" ? t("calibration.source.live") : t("calibration.source.demo")}</strong>
          <span>{live.source !== "live" || liveWindow ? t("calibration.autoRegime") : t("calibration.waitingRegime")}</span>
        </div>

        <main className="calibration-page__grid">
          <section className="calibration-page__curve" aria-labelledby="calibration-curve-title">
            <div className="calibration-page__section-head">
              <div><h3 id="calibration-curve-title">{t("calibration.curveTitle")}</h3><p>{t("calibration.curveDescription")}</p></div>
              <span className="calibration-page__demo-label">{t("calibration.modelDemoBadge")}</span>
              <ProvenanceTag value="DERIVED" />
            </div>
            <div className="calibration-page__chart">
              <div className="calibration-page__chart-wrap">
                <TimeSeriesChart values={values} title={t("calibration.curveTitle")} events={[{ index: values.length - 1, label: t("calibration.windowEnd") }]} />
                <svg className="calibration-page__chart-overlay" viewBox="0 0 360 180" aria-hidden="true">
                  <rect x={bandX} y="12" width={bandWidth} height="144" className="calibration-page__nominal-band" />
                  <line x1="38" x2="346" y1={asymptoteY} y2={asymptoteY} className="calibration-page__asymptote" />
                </svg>
              </div>
              <div className="calibration-page__chart-legend"><span><i className="calibration-page__legend-line" />{t("calibration.asymptote")} · {formatNumber(curve[0]?.asymptoteKpa ?? 0, 3)} kPa</span><span><i className="calibration-page__legend-band" />{t("calibration.nominalBand")} · {formatNumber(tauMin, 2)}–{formatNumber(tauMax, 2)} s</span><span><i className="calibration-page__legend-marker" />{t("calibration.windowEnd")}</span></div>
              <div className="calibration-page__chart-axis"><span>{t("calibration.pressure")} · kPa</span><span>0 s — 4 s · {t("calibration.sinceStop")}</span></div>
            </div>
            <p className="calibration-page__model-note">{t("calibration.modelNote")}</p>
          </section>

          <CalibrationVerdictPanel evidence={verdictEvidence} tauS={tauS} residualL={residualL} />

          <section className="calibration-page__result">
            <div className="calibration-page__section-head"><h3>{t("calibration.resultTitle")}</h3>{hasLiveEstimate ? <ValidityChip validity="valid" /> : <span className="calibration-page__demo-label">{t("calibration.modelDemoBadge")}</span>}</div>
            <div className="calibration-page__readout"><strong>~{displayLevel} <small>± {displaySigma} L</small></strong><span>{t("calibration.restEstimate")}</span></div>
            <div className="calibration-page__band-row"><span>{t("calibration.motionBand")}</span><strong>~{displayLevel} ± {formatNumber(2.1, 1)} L</strong></div>
            <div className="calibration-page__provenance"><span>{t("calibration.modelOutput")}</span><ProvenanceTag value="DERIVED" /><span>{t("calibration.viscosityProxy")}</span><ProvenanceTag value="ASSUMPTION" /></div>
          </section>

          <section className="calibration-page__window">
            <div className="calibration-page__section-head"><h3>{t("calibration.windowTitle")}</h3><ValidityChip validity={latestWindow?.state === "moving" ? "invalid" : live.source === "live" && liveWindow ? "valid" : "estimate"} /></div>
            {liveWindow ? <dl><div><dt>{t("calibration.windowId")}</dt><dd>{liveWindow.window_id}</dd></div><div><dt>{t("calibration.windowDuration")}</dt><dd>{formatNumber(liveWindow.duration_s, 1)} s</dd></div><div><dt>{t("calibration.fusedLevel")}</dt><dd>{fusedPoint?.level_l === null || fusedPoint?.level_l === undefined ? t("calibration.noFusedLevel") : `${formatNumber(fusedPoint.level_l, 1)} ± ${formatNumber(fusedPoint.sigma_l ?? 0, 1)} L`}</dd></div></dl> : <p>{t("calibration.windowDemo")}</p>}
          </section>

          <section className="calibration-page__reference">
            <div className="calibration-page__section-head"><h3>{t("calibration.benchTitle")}</h3><ProvenanceTag value="ASSUMPTION" /></div>
            <EmptyState title={t("calibration.benchEmpty")} detail="docs/calibration.md" />
          </section>
        </main>

        <nav className="calibration-page__actions" aria-label={t("calibration.actions")}>
          <a href={`/wheel?id=${encodeURIComponent(wheelId)}`}>{t("calibration.openWheel")}</a>
          <a href="/wheel/history">{t("calibration.openHistory")}</a>
        </nav>
      </div>
    </div>
  );
}
