// Detalle de rueda (T11 + restyle F3f): nivel + banda de confianza, ventanas de
// reposo, escalera N1–N4, fusión de canales, panel de RUL, indicador de modo
// enlazado al simulador y el recorrido demo clean -> slow-leak -> abrupt-drop -> N4.
//
// Datos: API S4 vía sim/api.ts (GET /level /alerts /rul /windows) solo para la rueda
// en vivo (`wheel-RH-01`). Si el backend cae, o la rueda no tiene dispositivo, la
// vista usa datos DEMO locales y lo dice: la insignia DEMO nunca es silenciosa.
// Etiqueta de modelo en todas partes: `synthetic-proxy` (NO PROBADO hasta el banco).

import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  getAlerts,
  getHealth,
  getLevel,
  getLevelSeries,
  getRul,
  getWindows,
  type AlertsResponse,
  type BackendMessage,
  type LevelResponse,
  type LevelSeriesSignal,
  type LevelSeriesPoint,
  type RulResponse,
  type SigningStatus,
  type WindowsResponse,
} from "../sim/api";
import { isMovingState, isRecalState, stateAt } from "../sim/truck/cycle";
import { oilCssFor, oilStateFor, formatOilText } from "../sim/bench/oil";
import LevelChart, { type ChartPoint } from "./LevelChart";
import RulPanel from "./RulPanel";
import {
  DEMO_CONFIDENCE,
  DEMO_MODEL,
  DEMO_SERIES,
  DEMO_SIGMA_L,
  DEMO_WINDOWS,
  demoAlertsUpTo,
  demoFracFor,
} from "./demoData";
import { emitDemoOil, type DemoStageId } from "./demoBus";
import { t, type DictKey } from "../i18n";
import { formatNumber } from "../i18n/numberFormat";
import { localizeBackendMessage, localizeBackendZone } from "./backendNotes";
import { signingBadgeState } from "./signingBadge";
import { analyzerUnavailableNotice, isBackendOutage } from "./analyzerAvailability";
import { resolveReadingStale } from "./readingFreshness";
import { mergeLevelSeries } from "./levelSeries";
import { formatDemoLabNote } from "./demoCopy";
import { ALERT_SEVERITY_COLORS } from "./alertSeverity";
import { DEMO_REFERENCE_MS, demoDataset } from "../demo/dataset";
import { AlertBanner, Button, Notice, PageHeader, ProvenanceTag, SyntheticBadge, type Severity } from "../ui/foundation";
import BackendOutageNotice from "../ui/BackendOutageNotice";
export { BackendOutageNotice as BackendOutageBanner };
import {
  ChartLegend, FusionPanel, LadderPanel, NumericEvidence, TelemetryRow, WheelContext,
} from "../ops/wheel/WheelPanels";
import {
  LIVE_WHEEL_ID,
  alertBannerKey,
  channelStatesFrom,
  demoWheelTrace,
  formatUtcTime,
  highestLevel,
  isLiveWheel,
  levelValidity,
  rawTelemetryText,
  latestSensorReadings,
  resolveWheel,
  settlingTauSeconds,
  wheelLinks,
  type LevelValidity,
} from "../ops/wheel/logic";

type Source = "loading" | "live" | "demo";
type BackendNote =
  | { kind: "live"; rows: number; influx: string; influxMessage?: BackendMessage }
  | { kind: "error" }
  | null;

export function DashboardLevelSourceBadge({ live, source, validity }: { live: boolean; source: Source; validity: LevelValidity }) {
  if (live && (validity === "stale" || validity === "invalid")) {
    return <span className={`og-chip og-chip--${validity}`}>{t(validity === "stale" ? "ui.stale" : "ui.invalid")}</span>;
  }

  return (
    <span className={`og-badge og-badge--source og-badge--source-${source}`}>
      {live
        ? t(source === "loading" ? "dash.source.badge.loading" : source === "live" ? "dash.source.badge.live" : "dash.source.badge.demo")
        : t("wheel.source.demoWheel")}
    </span>
  );
}

export function shouldShowLevelReading(levelSource: "LIVE" | "DEMO", storeRows: number, sourceMessageCode?: string): boolean {
  return levelSource !== "LIVE" || (storeRows > 0 && sourceMessageCode !== "source_no_rows");
}

export function selectDashboardChartSeries({ demoActive, liveRows, livePoints, demoPoints }: {
  demoActive: boolean;
  liveRows: number;
  livePoints: ChartPoint[];
  demoPoints: ChartPoint[];
}): { points: ChartPoint[]; signalSource: "LIVE" | "DEMO" } {
  if (demoActive) return { points: demoPoints, signalSource: "DEMO" };
  if (liveRows > 0 && livePoints.length >= 3) return { points: livePoints, signalSource: "LIVE" };
  return { points: [], signalSource: "DEMO" };
}

export function dashboardLevelChartTitle(demoActive: boolean): string {
  const title = t("dash.series.levelHistory");
  return demoActive ? `${title} · ${t("dash.source.badge.demo")}` : title;
}

function dashboardReadingSourceBadge(validity: LevelValidity) {
  return validity === "stale" || validity === "invalid"
    ? <span className={`og-chip og-chip--${validity}`}>{t(validity === "stale" ? "ui.stale" : "ui.invalid")}</span>
    : <ProvenanceTag value="EN VIVO" />;
}

export function DashboardWindowsReadout({ windowCount, storeRows, validity = "valid" }: { windowCount: number; storeRows: number; validity?: LevelValidity }) {
  const rowToken = "__session_rows__";
  const text = t("dash.backend.windows", { count: windowCount, rows: rowToken });
  const rowIndex = text.indexOf(rowToken);
  return <>{text.slice(0, rowIndex)}{storeRows} {dashboardReadingSourceBadge(validity)}{text.slice(rowIndex + rowToken.length)}</>;
}

const DEMO_STAGES: DemoStageId[] = ["clean", "slow-leak", "abrupt-drop", "done"];
const LIVE_SENSOR_SIGNALS: LevelSeriesSignal[] = ["pressure_kpa", "temperature_c", "vib_rms_g"];

const DEMO_BLURB_KEYS: Record<DemoStageId, DictKey> = {
  idle: "dash.demo.blurb.idle",
  clean: "dash.demo.blurb.clean",
  "slow-leak": "dash.demo.blurb.slowLeak",
  "abrupt-drop": "dash.demo.blurb.abruptDrop",
  done: "dash.demo.blurb.done",
};

const DEMO_LABEL_KEYS: Record<DemoStageId, DictKey> = {
  idle: "dash.demo.stage.idle",
  clean: "dash.demo.stage.clean",
  "slow-leak": "dash.demo.stage.slowLeak",
  "abrupt-drop": "dash.demo.stage.abruptDrop",
  done: "dash.demo.stage.done",
};

function stageBlurb(stage: DemoStageId): string {
  const params = stage === "slow-leak" ? { labNote: formatDemoLabNote() } : undefined;
  return t(DEMO_BLURB_KEYS[stage], params);
}

function stageLabel(stage: DemoStageId): string {
  return t(DEMO_LABEL_KEYS[stage]);
}

// Tramo de avisos de disponibilidad de Dashboard en un componente renderizable:
// la misma rama que pinta la página en producción (apagón, analizador,
// lectura obsoleta y escalera), para cubrirla con prueba de integración sin
// leer cadenas fuente. La lectura obsoleta ocupa el lugar del mensaje de
// calma igual que el apagón: una escalera en calma calculada con datos
// viejos no debe tranquilizar. Durante el apagón manda su propio aviso.
// Vía productiva A02: cuando llegan marca temporal + reloj se resuelve aquí
// mismo con `resolveReadingStale` (la misma llamada que usa Dashboard); el
// booleano `readingStale` solo queda por compatibilidad con renders que ya
// resolvieron fuera. Así la prueba pasa la marca envejecida sin precalcular
// el booleano y revierte a falso si el cableado vuelve a `stale: false`.
export function DashboardStatusNotices({ activeLevel, backendOutage, analyzerNotice, readingStale, live, demoActive, lastUpdateMs, nowMs }: {
  activeLevel: Severity | null;
  backendOutage: boolean;
  analyzerNotice: string | null;
  readingStale?: boolean;
  live?: boolean;
  demoActive?: boolean;
  lastUpdateMs?: number | null;
  nowMs?: number;
}) {
  const hasReadingInput = live !== undefined || demoActive !== undefined || lastUpdateMs !== undefined || nowMs !== undefined;
  const resolvedStale = hasReadingInput
    ? resolveReadingStale({
        live: live ?? false,
        demoActive: demoActive ?? false,
        lastUpdateMs: lastUpdateMs ?? null,
        nowMs: nowMs ?? Date.now(),
      })
    : readingStale === true;
  const showStale = resolvedStale && !backendOutage;
  return (
    <>
      {backendOutage && <BackendOutageNotice />}
      {analyzerNotice && <div className="og-analyzer-notice" role="alert">{analyzerNotice}</div>}
      {showStale && (
        // Aviso obsoleto en su propia caja ámbar: sin el envoltorio rojo de
        // apagón para no anidar dos bordes ni mezclar carriles (el rojo queda
        // reservado al apagón). El `div` solo aporta `role="status"` sin
        // clases ni CSS nuevo; la única caja visible es el Notice `stale`.
        <div role="status">
          <Notice kind="stale">
            <span>
              <strong>{t("dash.reading.stale.title")}</strong>{" "}
              {t("dash.reading.stale.detail")}
            </span>
          </Notice>
        </div>
      )}
      {activeLevel
        ? <AlertBanner severity={activeLevel}>{t(alertBannerKey(activeLevel))}</AlertBanner>
        : backendOutage || showStale ? null : <Notice kind="info">{t("wheel.banner.none")}</Notice>}
    </>
  );
}

export default function Dashboard({ wheelId: initialWheelId }: { wheelId?: string | null }) {
  const [wheelId, setWheelId] = useState(() => resolveWheel(initialWheelId, demoDataset.wheels).id);
  const wheel = resolveWheel(wheelId, demoDataset.wheels);
  const live = isLiveWheel(wheel.id);
  const [source, setSource] = useState<Source>(live ? "loading" : "demo");
  const [backendNote, setBackendNote] = useState<BackendNote>(null);
  const [analysisAvailable, setAnalysisAvailable] = useState<boolean | undefined>();
  const [signingStatus, setSigningStatus] = useState<SigningStatus | undefined>();
  const [storeRows, setStoreRows] = useState(0);
  const [level, setLevel] = useState<LevelResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [rul, setRul] = useState<RulResponse | null>(null);
  const [windows, setWindows] = useState<WindowsResponse | null>(null);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [rawRows, setRawRows] = useState<LevelSeriesPoint[]>([]);
  const [sensorRows, setSensorRows] = useState<LevelSeriesPoint[]>([]);
  const [latestSignals, setLatestSignals] = useState<ReturnType<typeof latestSensorReadings> | null>(null);
  const [demoStage, setDemoStage] = useState<DemoStageId>("idle");
  const [demoTick, setDemoTick] = useState(0);
  const [fsmTick, setFsmTick] = useState(0);
  const mountT = useRef(Date.now());

  const fetchAll = useCallback(async () => {
    if (!live) return;
    try {
      const [h, lv, al, ru, wi, ls] = await Promise.all([
        getHealth(),
        getLevel(LIVE_WHEEL_ID),
        getAlerts(LIVE_WHEEL_ID),
        getRul(LIVE_WHEEL_ID),
        getWindows(50, LIVE_WHEEL_ID),
        getLevelSeries(300, LIVE_WHEEL_ID, LIVE_SENSOR_SIGNALS),
      ]);
      setStoreRows(h.store_rows);
      setSigningStatus(h.signing);
      setAnalysisAvailable(h.analysis.available);
      setLevel(lv);
      setAlerts(al);
      setRul(ru);
      setWindows(wi);
      setRawRows(ls.series.slice(-6));
      setSensorRows(ls.series);
      setLatestSignals(latestSensorReadings(ls.series));
      setBackendNote({
        kind: "live",
        rows: h.store_rows,
        influx: h.influx,
        influxMessage: h.influx_message,
      });
      setSource("live");
      const unavailable = h.analysis.available === false ||
        al.status === "unavailable" || ru.status === "unavailable";
      if (unavailable) {
        const diagnostic = h.analysis.reason ??
          (ru.status === "unavailable" ? ru.data.note : al.data.fallback);
        if (diagnostic) console.debug("OilGuard analyzer unavailable", diagnostic);
      }
      const lit = Number(lv.data.level_liters);
      if (Number.isFinite(lit)) {
        setHistory((prev) => {
          const seriesPoints = ls.series.flatMap((point) =>
            point.level_l !== null && Number.isFinite(point.level_l)
              ? [{ t_s: point.t_s, liters: point.level_l }]
              : [],
          );
          const merged = mergeLevelSeries(prev, seriesPoints);
          const t = merged.length === 0 ? 0 : merged[merged.length - 1].t_s + 2;
          return mergeLevelSeries(merged, [{ t_s: t, liters: lit }]).slice(-300);
        });
      }
    } catch (e) {
      console.debug("OilGuard backend request failed", e);
      setSigningStatus(undefined);
      setAnalysisAvailable(undefined);
      setLatestSignals(null);
      setSensorRows([]);
      setBackendNote({ kind: "error" });
      setSource("demo");
    }
  }, [live]);

  useEffect(() => {
    if (live) setSource("loading");
    else {
      setSource("demo");
      setBackendNote(null);
      setLevel(null);
      setAlerts(null);
      setRul(null);
      setWindows(null);
      setHistory([]);
      setRawRows([]);
      setSensorRows([]);
      setLatestSignals(null);
    }
    void fetchAll();
    // El parámetro demo=1 inicia la demostración al abrir Monitoreo.
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      setDemoTick(0);
      setDemoStage("clean");
    }
  }, [fetchAll, live]);

  // Reloj FSM en vivo compartido con el simulador del camión (mismo vocabulario stateAt).
  useEffect(() => {
    const id = window.setInterval(() => {
      setFsmTick((Date.now() - mountT.current) / 1000);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Runner demo: 5 s clean -> 15 s slow-leak -> 6 s abrupt-drop -> done.
  useEffect(() => {
    if (demoStage === "idle" || demoStage === "done") return;
    const id = window.setInterval(() => {
      setDemoTick((t) => {
        const next = t + 0.5;
        const limits: Record<string, number> = {
          clean: 5,
          "slow-leak": 15,
          "abrupt-drop": 6,
        };
        if (next >= (limits[demoStage] ?? 5)) {
          const idx = DEMO_STAGES.indexOf(demoStage);
          const following = DEMO_STAGES[idx + 1] ?? "done";
          setDemoStage(following);
          return 0;
        }
        return next;
      });
    }, 500);
    return () => window.clearInterval(id);
  }, [demoStage]);

  // Mueve el llenado 3D enlazado en cada tick de la demo.
  useEffect(() => {
    if (demoStage === "idle") return;
    emitDemoOil(demoFracFor(demoStage, demoTick), demoStage);
  }, [demoStage, demoTick]);

  const startDemo = () => {
    setDemoTick(0);
    setDemoStage("clean");
  };
  const resetDemo = () => {
    setDemoStage("idle");
    setDemoTick(0);
    emitDemoOil(1.0, "idle");
  };
  const selectWheel = (next: string) => {
    resetDemo();
    setWheelId(next);
    const url = new URL(window.location.href);
    url.searchParams.set("wheel", next);
    window.history.replaceState(null, "", url);
  };

  const demoActive = demoStage !== "idle";
  const analyzerNotice = analyzerUnavailableNotice({
    analysisAvailable,
    alertStatus: alerts?.status,
    rulStatus: rul?.status,
  });
  const analyzerUnavailable = analyzerNotice !== null;
  // Solo la rueda en vivo con el backend caído es una caída total: las ruedas
  // DEMO ya declaran su procedencia y la sonda inicial aún no falló.
  const backendOutage = isBackendOutage(live, backendNote?.kind);
  const fsm = stateAt(fsmTick);
  const moving = isMovingState(fsm.state);
  const recal = isRecalState(fsm.state);
  const trace = useMemo(() => demoWheelTrace(wheel), [wheel]);

  // DEMO solo alimenta el gráfico durante el modo explícito; sin filas en vivo no se dibuja una traza sustituta.
  const demoCutoff: Record<string, number> = {
    clean: 30,
    "slow-leak": 90,
    "abrupt-drop": 120,
    done: 120,
  };
  const selectedChartSeries = selectDashboardChartSeries({
    demoActive,
    liveRows: source === "live" ? storeRows : 0,
    livePoints: history,
    demoPoints: DEMO_SERIES.filter((p) => p.t_s <= (demoCutoff[demoStage] ?? 30)).slice(-90),
  });
  const liveSeries = selectedChartSeries.signalSource === "LIVE";
  const shownPoints = selectedChartSeries.points;
  const liveSignalRows = sensorRows.filter((row) =>
    typeof row.pressure_kpa === "number" && Number.isFinite(row.pressure_kpa) &&
    typeof row.temperature_c === "number" && Number.isFinite(row.temperature_c),
  );
  const sampleSignal = (key: "pressure_kpa" | "temperature_c", base: number, amplitude: number) => {
    const liveValues = liveSignalRows.map((row) => row[key] as number);
    if (source === "live" && liveValues.length >= 3 && shownPoints.length > 0) {
      return shownPoints.map((_, index) => liveValues[Math.round(index * (liveValues.length - 1) / Math.max(1, shownPoints.length - 1))]);
    }
    return shownPoints.map((_, index) => base + Math.sin(index * 0.43) * amplitude);
  };
  const signalSource = demoActive ? "DEMO" : source === "live" && liveSignalRows.length >= 3 ? "LIVE" : "DEMO";
  const chartPressure = sampleSignal("pressure_kpa", wheel.pressureKpa, 1.2);
  const chartTemperature = sampleSignal("temperature_c", wheel.temperatureC, 0.8);
  const shownAlerts = demoActive
    ? demoAlertsUpTo(demoStage)
    : analyzerUnavailable ? [] : (alerts?.data.alerts ?? []);
  const shownWindows = demoActive
    ? DEMO_WINDOWS
    : liveSeries ? (windows?.windows ?? []) : [];
  const backendSigma = source === "live" && !demoActive && alerts?.status === "ok"
    ? alerts.data.level?.sigma_liters : null;
  const sigmaSource = typeof backendSigma === "number" && Number.isFinite(backendSigma) ? "LIVE" : "DEMO";
  const sigmaL = demoActive ? DEMO_SIGMA_L : sigmaSource === "LIVE" ? backendSigma as number : trace.sigmaL;
  const backendAlertConfidence = source === "live" && !demoActive && alerts?.status === "ok"
    ? alerts.data.level?.confidence : null;
  const backendLevelConfidence = source === "live" && !demoActive ? level?.data.confidence : null;
  const backendConfidence = typeof backendAlertConfidence === "number" && Number.isFinite(backendAlertConfidence)
    ? backendAlertConfidence : backendLevelConfidence;
  const confidenceSource = typeof backendConfidence === "number" && Number.isFinite(backendConfidence) ? "LIVE" : "DEMO";
  const confidence = demoActive ? DEMO_CONFIDENCE : confidenceSource === "LIVE" ? backendConfidence as number : DEMO_CONFIDENCE;
  const demoFrac = demoActive ? demoFracFor(demoStage, demoTick) : 1.0;
  const demoOilState = oilStateFor(demoFrac);
  const demoOilCss = oilCssFor(demoOilState);
  const signingBadge = signingBadgeState(signingStatus);

  const liveLevel = source === "live" && level ? Number(level.data.level_liters) : null;
  const levelSource = liveLevel !== null && Number.isFinite(liveLevel) && !demoActive ? "LIVE" : "DEMO";
  const pressureKpa = latestSignals?.pressureKpa ?? wheel.pressureKpa;
  const temperatureC = latestSignals?.temperatureC ?? wheel.temperatureC;
  const vibrationG = latestSignals?.vibrationG ?? wheel.vibRms;
  const currentLevel = demoActive
    ? shownPoints[shownPoints.length - 1]?.liters ?? wheel.levelL
    : liveLevel !== null && Number.isFinite(liveLevel) ? liveLevel : wheel.levelL;
  const sensorsFromBackend = live || demoActive;
  const regime = sensorsFromBackend ? (moving ? "movement" : "rest") : wheel.regime;
  // La frescura sale de la marca real de última comunicación (t_iso del
  // backend en vivo), no de un falso constante (A02).
  const lastUpdateMs = demoActive
    ? DEMO_REFERENCE_MS
    : live
      ? (level?.data.t_iso ? Date.parse(level.data.t_iso) : null)
      : wheel.lastComm;
  const readingStale = resolveReadingStale({ live, demoActive, lastUpdateMs, nowMs: Date.now() });
  const validity = sensorsFromBackend
    ? levelValidity({ moving, confidence, stale: readingStale })
    : wheel.validity;

  // Escalera y canales: alertas reales (en vivo/demo) o las del conjunto DEMO de la rueda.
  const demoWheelAlert = demoDataset.alerts.find((alert) => alert.wheelId === wheel.id);
  const walkAlerts = sensorsFromBackend ? shownAlerts : [];
  const activeLevel = sensorsFromBackend ? highestLevel(walkAlerts) : wheel.alertLevel;
  const channelStates = sensorsFromBackend || !demoWheelAlert
    ? channelStatesFrom(walkAlerts)
    : channelStatesFrom([{
        channels: Object.fromEntries(demoWheelAlert.channels.map((channel) => [channel.name, channel.state === "fired"])),
      }]);
  const votes = (["pressure_drop", "level_trend", "vib_impact"] as const)
    .filter((name) => channelStates[name] === "fired").length;

  const sourceBadge = <DashboardLevelSourceBadge live={live} source={source} validity={validity} />;
  const links = wheelLinks(wheel.id);
  const rawFromBackend = liveSeries && rawRows.length > 0;
  const rawText = rawTelemetryText(
    rawFromBackend
      ? rawRows
      : shownPoints.slice(-6).map((point) => ({ t_s: point.t_s, level_l: point.liters, sigma_l: sigmaL })),
  );
  const wheelOptions = demoDataset.wheels
    .filter((item) => item.validated)
    .map((item) => ({ id: item.id, label: `${item.id} · ${item.truckId} ${item.position}` }));

  return (
    <div className="og-page og-wheel-detail">
    <div className="og-page__inner">
      <PageHeader
        eyebrow={t("wheel.eyebrow")}
        title={t("wheel.title", { value: wheel.id })}
        description={t("wheel.description")}
        meta={<SyntheticBadge />}
      />

      <WheelContext

        truckId={wheel.truckId}
        wheelId={wheel.id}
        position={wheel.position}
        regime={regime}
        sourceBadge={sourceBadge}
        lastUpdate={demoActive ? `${formatUtcTime(lastUpdateMs)} · DEMO` : formatUtcTime(lastUpdateMs)}
        wheelOptions={wheelOptions}
        onSelectWheel={selectWheel}
      />

      <Notice kind="simulation">
        {t("dash.intro", { model: t("rul.model.syntheticProxy") })}{" "}
        {t("dash.honesty")}
      </Notice>

      <DashboardStatusNotices activeLevel={activeLevel} backendOutage={backendOutage} analyzerNotice={analyzerNotice} live={live} demoActive={demoActive} lastUpdateMs={lastUpdateMs} nowMs={Date.now()} />

      <TelemetryRow

        level={currentLevel}
        sigma={sigmaL}
        confidence={confidence}
        validity={validity}
        levelSource={levelSource}
        hasLevelReading={shouldShowLevelReading(levelSource, storeRows, level?.data.source_message?.code)}
        sigmaSource={sigmaSource}
        confidenceSource={confidenceSource}
        pressureKpa={pressureKpa}
        temperatureC={temperatureC}
        vibrationG={vibrationG}
        tauS={settlingTauSeconds(temperatureC)}
        pressureLive={latestSignals?.pressureKpa !== undefined}
        temperatureLive={latestSignals?.temperatureC !== undefined}
        vibrationLive={latestSignals?.vibrationG !== undefined}
      />

      <section className="og-wheel-console" aria-label={t("wheel.console.title")}>
        <span className="og-label">{t("wheel.console.title")}</span>
        <span className={`og-badge og-badge--source og-badge--source-${source}`}>{t("wheel.console.demoLabel")}</span>
        <span className="og-wheel-console__spacer" />
        {live && (
          <Button type="button" variant="ghost" onClick={() => void fetchAll()}>
            {t("dash.action.refresh")}
          </Button>
        )}
        {!demoActive ? (
          <Button type="button" variant="primary" onClick={startDemo}>
            {t("demo.run")}
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={resetDemo}>
            {t("demo.reset")}
          </Button>
        )}
      </section>

      {demoActive && (
        <div className="og-wheel-stepper">
          {DEMO_STAGES.map((s) => (
            <span
              key={s}
              className={`og-badge og-badge--step${s === demoStage ? " og-badge--step-active" : ""}`}
            >
              {stageLabel(s)}
            </span>
          ))}
          <span className="og-wheel-stepper__blurb">
            {stageBlurb(demoStage)} · {t("dash.demo.oil")} {formatOilText(demoFrac)} · {t("dash.demo.benchLink")}
          </span>
        </div>
      )}

      <div className="og-wheel-grid og-dashboard-panels">
        <div className="og-wheel-main">
          <section className="og-wheel-panel og-dashboard-chart">
            <h3 className="og-wheel-panel__title">
              {t("wheel.chart.title")}
              <span className="og-wheel-panel__meta">
                <NumericEvidence field="sigma" source={sigmaSource} validity={validity}>
                  {t("wheel.numeric.sigma")} ±{formatNumber(sigmaL, 1)} L
                </NumericEvidence>{" · "}
                <NumericEvidence field="confidence" source={confidenceSource} validity={validity}>
                  {t("ui.confidence")} {formatNumber(confidence, 2)} {t("wheel.numeric.unitless")}
                </NumericEvidence>
              </span>
            </h3>
            <section aria-label={t("dash.series.levelHistory")} data-dashboard-series="level-history">
              <h4 data-dashboard-series="level-history-label">{dashboardLevelChartTitle(demoActive && shownPoints.length > 0)}</h4>
              <LevelChart points={shownPoints} sigmaL={sigmaL} windows={shownWindows} alerts={shownAlerts} variant="inline" pressureValues={chartPressure} temperatureValues={chartTemperature} signalSource={signalSource} />
            </section>
            <section aria-label={t("dash.series.sensors")}>
              <h4 data-dashboard-series="temperature">{t("dash.series.temperature")}</h4>
              <p>{formatNumber(temperatureC, 1)} °C</p>
              <h4 data-dashboard-series="vibration">{t("dash.series.vibration")}</h4>
              <p>{formatNumber(vibrationG, 2)} g</p>
              <h4 data-dashboard-series="current">{t("dash.series.current")}</h4>
              <p role="status">{t("dash.series.gap")}</p>
            </section>
            <ChartLegend />
            <p className="og-wheel-panel__note">
              {t("wheel.chart.note")} {t("dash.footnote", { pressure: formatNumber(wheel.pressureKpa, 1) })}
            </p>
            <div className="og-wheel-status">
              <span style={{ color: demoOilCss, fontWeight: 700 }}>
                {demoActive
                  ? t("dash.demo.fill", { value: formatOilText(demoFrac) })
                  : level && live && source === "live" && shouldShowLevelReading(levelSource, storeRows, level.data.source_message?.code)
                    ? `${formatNumber(Number(level.data.level_liters), 1)} L · ${formatNumber(Number(level.data.level_pct), 1)}%`
                    : "—"}
              </span>
              <span className="og-wheel-status__source">
                {demoActive
                  ? formatDemoLabNote()
                  : `${t("dash.source.label")}: ${localizeBackendMessage(level?.data.source_message, level?.data.source ?? t("dash.backend.noPayload"))}`}
              </span>
            </div>
          </section>

          <section className="og-wheel-panel og-wheel-mode">
            <div>
              <span className="og-label">{t("dash.mode.title")}</span>{" "}
              <strong style={{ color: moving ? "var(--og-blue)" : "var(--og-green)" }}>
                {t(moving ? "hud.moving" : "hud.rest")}
              </strong>{" "}
              <small style={{ color: recal ? "var(--og-green)" : "var(--og-muted)" }}>
                {t(recal ? "dash.mode.recalibrating" : "dash.mode.recalGated")}
              </small>
            </div>
            <p className="og-wheel-panel__note">
              FSM <strong>{fsm.state}</strong> (t+{formatNumber(fsmTick, 0)} s {t("dash.fsm.sharedClock")}) ·{" "}
              {source === "live"
                ? <DashboardWindowsReadout windowCount={windows?.count ?? 0} storeRows={storeRows} validity={validity} />
                : t("dash.backend.localWindows")}
            </p>
            <p className="og-wheel-panel__note">
              <span className={`og-badge og-badge--source og-badge--source-${source}`}>
                {source === "loading"
                  ? t("dash.backend.probing")
                  : source === "live" && backendNote?.kind === "live"
                    ? <>{(() => {
                        const rowToken = "__session_rows__";
                        const text = t("dash.backend.summary", {
                          rows: rowToken,
                        influx: localizeBackendMessage(backendNote.influxMessage, backendNote.influx),
                        });
                        const rowIndex = text.indexOf(rowToken);
                        return <>{text.slice(0, rowIndex)}{backendNote.rows} {dashboardReadingSourceBadge(validity)}{text.slice(rowIndex + rowToken.length)}</>;
                      })()}</>
                    : live ? t("dash.backend.offline") : t("wheel.source.demoWheel")}
              </span>
              {signingBadge && (
                <span className={`og-badge og-badge--${signingBadge.tone}`}>
                  {signingBadge.kind === "off"
                    ? t("dash.signing.off")
                    : t("dash.signing.verified")}
                  {" · "}{signingBadge.rejected} {t("dash.signing.rejected")}
                </span>
              )}
            </p>
          </section>
        </div>

        <aside className="og-wheel-side og-dashboard-side">
          <LadderPanel active={activeLevel} colors={ALERT_SEVERITY_COLORS} />
          <FusionPanel channels={channelStates} votes={votes} />
          <section className="og-wheel-panel og-wheel-rul">
            <RulPanel
              rul={demoActive ? demoRulFor(demoStage) : (rul?.data ?? null)}
              analyzerUnavailable={analyzerUnavailable && !demoActive}
              evaluationReason={demoActive ? undefined : (rul?.reason ?? alerts?.reason)}
            />
          </section>
          <section className="og-wheel-panel">
            <h3 className="og-wheel-panel__title">
              {t("dash.alerts.title")}
              <span className="og-wheel-panel__meta">
                {(analyzerUnavailable && !demoActive ? [] : demoActive ? shownAlerts.map((a) => a.level) : alerts?.data.escalation ?? shownAlerts.map((a) => a.level)).join(" → ") || t("dash.alerts.none")}
              </span>
            </h3>
            {shownAlerts.length === 0 ? (
              <p className="og-wheel-panel__note">{t("dash.alerts.empty")}</p>
            ) : (
              <ul className="og-wheel-alerts">
                {shownAlerts.map((a) => (
                  <li key={a.alert_id} style={`--tone: ${ALERT_SEVERITY_COLORS[a.level] ?? "var(--og-line-dashboard)"}`}>
                    <span className={`og-badge og-badge--alert og-badge--${a.level.toLowerCase()}`}>
                      {a.level}
                    </span>
                    <strong>{a.alert_id}</strong>
                    <span className="og-wheel-alerts__meta"> · t {formatNumber(a.t_s, 1)} s · {localizeBackendZone(a.zone)}</span>
                    <p>{localizeBackendMessage(a.reason_message, a.reason)}</p>
                  </li>
                ))}
              </ul>
            )}
            {alerts && !demoActive && !analyzerUnavailable && live && (
              <p className="og-wheel-panel__note">
                {localizeBackendMessage(alerts.data.note_message, alerts.data.note)} · {localizeBackendMessage(alerts.data.fallback_message, alerts.data.fallback)}
              </p>
            )}
          </section>
        </aside>
      </div>

      <details className="og-wheel-raw">
        <summary>
          {t("wheel.raw.title")}
          <span className="og-chip">{rawFromBackend ? t("wheel.raw.live") : t("wheel.raw.demo")}</span>
        </summary>
        <pre>{rawText || t("wheel.raw.empty")}</pre>
      </details>

      <nav className="og-wheel-links" aria-label={t("wheel.links")}>
        <a href={links.history}>{t("wheel.link.history")}</a>
        <a href={links.alerts}>{t("wheel.link.alerts")}</a>
      </nav>
    </div>
    </div>
  );
}

function demoRulFor(stage: DemoStageId) {
  if (stage === "clean") {
    return {
      hours: null,
      haul_cycles: null,
      shifts: null,
      confidence: 0,
      status: "suppressed" as const,
      anomaly_only: true as const,
      model: DEMO_MODEL,
      note: t("dash.demo.rul.cleanNote"),
      fallback: "local DEMO fallback (backend down or demo override)",
    };
  }
  if (stage === "slow-leak") {
    return {
      hours: 0.5,
      hours_to_warning: 0.35,
      hours_to_critical: 0.5,
      haul_cycles: 62.2,
      shifts: 0.06,
      confidence: 0.822,
      status: "ok" as const,
      anomaly_only: false as const,
      slope_L_per_h: -124.7953,
      r2: 0.822,
      current_level_L: 90.67,
      model: DEMO_MODEL,
      note: t("dash.demo.rul.slowNote", {
        model: t("rul.model.syntheticProxy"),
        qualifier: t("rul.unproven"),
        labNote: formatDemoLabNote(),
      }),
      fallback: "local DEMO fallback (backend down or demo override)",
    };
  }
  return {
    hours: 0.07,
    hours_to_warning: 0.04,
    hours_to_critical: 0.07,
    haul_cycles: 8.7,
    shifts: 0.01,
    confidence: 0.713,
    status: "ok" as const,
    anomaly_only: false as const,
    slope_L_per_h: -734.3637,
    r2: 0.713,
    current_level_L: 79.97,
    model: DEMO_MODEL,
    note: t("dash.demo.rul.abruptNote", {
      model: t("rul.model.syntheticProxy"),
      qualifier: t("rul.unproven"),
    }),
    fallback: "local DEMO fallback (backend down or demo override)",
  };
}
