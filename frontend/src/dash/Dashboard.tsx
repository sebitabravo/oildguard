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
import { t, type DictKey, type Lang, useLang } from "../i18n";
import { formatNumber } from "../i18n/numberFormat";
import { localizeBackendMessage, localizeBackendZone } from "./backendNotes";
import { signingBadgeState } from "./signingBadge";
import { analyzerUnavailableNotice, isBackendOutage } from "./analyzerAvailability";
import { resolveReadingStale } from "./readingFreshness";
import { mergeLevelSeries } from "./levelSeries";
import { formatDemoLabNote } from "./demoCopy";
import { ALERT_SEVERITY_COLORS } from "./alertSeverity";
import { DEMO_REFERENCE_MS, demoDataset } from "../demo/dataset";
import { AlertBanner, Button, Notice, PageHeader, SyntheticBadge, type Severity } from "../ui/foundation";
import {
  ChartLegend, FusionPanel, LadderPanel, TelemetryRow, WheelContext,
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
} from "../ops/wheel/logic";

type Source = "loading" | "live" | "demo";
type BackendNote =
  | { kind: "live"; rows: number; influx: string; influxMessage?: BackendMessage }
  | { kind: "error" }
  | null;

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

function stageBlurb(stage: DemoStageId, lang: Lang): string {
  const params = stage === "slow-leak" ? { labNote: formatDemoLabNote(lang) } : undefined;
  return t(DEMO_BLURB_KEYS[stage], lang, params);
}

function stageLabel(stage: DemoStageId, lang: Lang): string {
  return t(DEMO_LABEL_KEYS[stage], lang);
}

// La caída total del backend nunca debe leerse como flota sana: este aviso
// ocupa el lugar del mensaje de calma y exige rol de alerta.
// El título y el detalle van en un único hijo para que el flex de Notice no
// los parta en dos columnas a 390px: así envuelven como un aviso coherente.
export function BackendOutageBanner() {
  const [lang] = useLang();
  return (
    <div className="og-analyzer-notice" role="alert">
      <Notice lang={lang} kind="error">
        <span>
          <strong>{t("dash.backend.outage.title", lang)}</strong>{" "}
          {t("dash.backend.outage.detail", lang)}
        </span>
      </Notice>
    </div>
  );
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
  const [lang] = useLang();
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
      {backendOutage && <BackendOutageBanner />}
      {analyzerNotice && <div className="og-analyzer-notice" role="alert">{analyzerNotice}</div>}
      {showStale && (
        // Aviso obsoleto en su propia caja ámbar: sin el envoltorio rojo de
        // apagón para no anidar dos bordes ni mezclar carriles (el rojo queda
        // reservado al apagón). El `div` solo aporta `role="status"` sin
        // clases ni CSS nuevo; la única caja visible es el Notice `stale`.
        <div role="status">
          <Notice lang={lang} kind="stale">
            <span>
              <strong>{t("dash.reading.stale.title", lang)}</strong>{" "}
              {t("dash.reading.stale.detail", lang)}
            </span>
          </Notice>
        </div>
      )}
      {activeLevel
        ? <AlertBanner lang={lang} severity={activeLevel}>{t(alertBannerKey(activeLevel), lang)}</AlertBanner>
        : backendOutage || showStale ? null : <Notice lang={lang} kind="info">{t("wheel.banner.none", lang)}</Notice>}
    </>
  );
}

export default function Dashboard({ wheelId: initialWheelId }: { wheelId?: string | null }) {
  const [lang] = useLang();
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
  }, lang);
  const analyzerUnavailable = analyzerNotice !== null;
  // Solo la rueda en vivo con el backend caído es una caída total: las ruedas
  // DEMO ya declaran su procedencia y la sonda inicial aún no falló.
  const backendOutage = isBackendOutage(live, backendNote?.kind);
  const fsm = stateAt(fsmTick);
  const moving = isMovingState(fsm.state);
  const recal = isRecalState(fsm.state);
  const trace = useMemo(() => demoWheelTrace(wheel), [wheel]);

  // Serie mostrada: historia en vivo (/level sondeado), la caminata demo o la traza
  // DEMO de 60 min cuando el backend no tiene muestras suficientes (siempre rotulada).
  const demoCutoff: Record<string, number> = {
    clean: 30,
    "slow-leak": 90,
    "abrupt-drop": 120,
    done: 120,
  };
  const liveSeries = source === "live" && history.length >= 3;
  const usingTrace = !demoActive && !liveSeries;
  const shownPoints: ChartPoint[] = demoActive
    ? DEMO_SERIES.filter((p) => p.t_s <= (demoCutoff[demoStage] ?? 30)).slice(-90)
    : liveSeries ? history : trace.points;
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
  const signalSource = source === "live" && liveSignalRows.length >= 3 ? "LIVE" : "DEMO";
  const chartPressure = sampleSignal("pressure_kpa", wheel.pressureKpa, 1.2);
  const chartTemperature = sampleSignal("temperature_c", wheel.temperatureC, 0.8);
  const shownAlerts = demoActive
    ? demoAlertsUpTo(demoStage)
    : analyzerUnavailable ? [] : (alerts?.data.alerts ?? []);
  const shownWindows = demoActive
    ? DEMO_WINDOWS
    : liveSeries ? (windows?.windows ?? []) : trace.windows;
  const sigmaL = demoActive
    ? DEMO_SIGMA_L
    : (alerts?.data.level?.sigma_liters ?? trace.sigmaL);
  const confidence = demoActive
    ? DEMO_CONFIDENCE
    : (alerts?.data.level?.confidence ?? (live && source === "live" ? Number(level?.data.confidence ?? 0) : DEMO_CONFIDENCE));
  const demoFrac = demoActive ? demoFracFor(demoStage, demoTick) : 1.0;
  const demoOilState = oilStateFor(demoFrac);
  const demoOilCss = oilCssFor(demoOilState);
  const signingBadge = signingBadgeState(signingStatus);

  const liveLevel = source === "live" && level ? Number(level.data.level_liters) : null;
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

  const sourceBadge = (
    <span className={`og-badge og-badge--source og-badge--source-${source}`}>
      {live
        ? t(source === "loading" ? "dash.source.badge.loading" : source === "live" ? "dash.source.badge.live" : "dash.source.badge.demo", lang)
        : t("wheel.source.demoWheel", lang)}
    </span>
  );
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
        eyebrow={t("wheel.eyebrow", lang)}
        title={t("wheel.title", lang, { value: wheel.id })}
        description={t("wheel.description", lang)}
        meta={<SyntheticBadge lang={lang} />}
      />

      <WheelContext
        lang={lang}
        truckId={wheel.truckId}
        wheelId={wheel.id}
        position={wheel.position}
        regime={regime}
        sourceBadge={sourceBadge}
        lastUpdate={demoActive ? `${formatUtcTime(lastUpdateMs)} · DEMO` : formatUtcTime(lastUpdateMs)}
        wheelOptions={wheelOptions}
        onSelectWheel={selectWheel}
      />

      <Notice lang={lang} kind="simulation">
        {t("dash.intro", lang, { model: t("rul.model.syntheticProxy", lang) })}{" "}
        {t("dash.honesty", lang)}
      </Notice>

      <DashboardStatusNotices activeLevel={activeLevel} backendOutage={backendOutage} analyzerNotice={analyzerNotice} live={live} demoActive={demoActive} lastUpdateMs={lastUpdateMs} nowMs={Date.now()} />

      <TelemetryRow
        lang={lang}
        level={currentLevel}
        sigma={sigmaL}
        confidence={confidence}
        validity={validity}
        pressureKpa={pressureKpa}
        temperatureC={temperatureC}
        vibrationG={vibrationG}
        tauS={settlingTauSeconds(temperatureC)}
        pressureLive={latestSignals?.pressureKpa !== undefined}
        temperatureLive={latestSignals?.temperatureC !== undefined}
        vibrationLive={latestSignals?.vibrationG !== undefined}
      />

      <section className="og-wheel-console" aria-label={t("wheel.console.title", lang)}>
        <span className="og-label">{t("wheel.console.title", lang)}</span>
        <span className={`og-badge og-badge--source og-badge--source-${source}`}>{t("wheel.console.demoLabel", lang)}</span>
        <span className="og-wheel-console__spacer" />
        {live && (
          <Button type="button" variant="ghost" onClick={() => void fetchAll()}>
            {t("dash.action.refresh", lang)}
          </Button>
        )}
        {!demoActive ? (
          <Button type="button" variant="primary" onClick={startDemo}>
            {t("demo.run", lang)}
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={resetDemo}>
            {t("demo.reset", lang)}
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
              {stageLabel(s, lang)}
            </span>
          ))}
          <span className="og-wheel-stepper__blurb">
            {stageBlurb(demoStage, lang)} · {t("dash.demo.oil", lang)} {formatOilText(demoFrac, lang)} · {t("dash.demo.benchLink", lang)}
          </span>
        </div>
      )}

      <div className="og-wheel-grid og-dashboard-panels">
        <div className="og-wheel-main">
          <section className="og-wheel-panel og-dashboard-chart">
            <h3 className="og-wheel-panel__title">
              {t("wheel.chart.title", lang)}
              <span className="og-wheel-panel__meta">
                ±{formatNumber(sigmaL, lang, 2)} L · {t("ui.confidence", lang)} {formatNumber(Number(confidence), lang, 3)}
              </span>
            </h3>
            {usingTrace && live && source === "live" && (
              <p className="og-wheel-panel__warn">{t("wheel.chart.demoTrace", lang)}</p>
            )}
            <LevelChart points={shownPoints} sigmaL={sigmaL} windows={shownWindows} alerts={shownAlerts} variant="inline" pressureValues={chartPressure} temperatureValues={chartTemperature} signalSource={signalSource} />
            <ChartLegend lang={lang} />
            <p className="og-wheel-panel__note">
              {t("wheel.chart.note", lang)} {t("dash.footnote", lang, { pressure: formatNumber(wheel.pressureKpa, lang, 1) })}
            </p>
            <div className="og-wheel-status">
              <span style={{ color: demoOilCss, fontWeight: 700 }}>
                {demoActive
                  ? t("dash.demo.fill", lang, { value: formatOilText(demoFrac, lang) })
                  : level && live
                    ? `${formatNumber(Number(level.data.level_liters), lang, 1)} L · ${formatNumber(Number(level.data.level_pct), lang, 1)}%`
                    : "—"}
              </span>
              <span className="og-wheel-status__source">
                {demoActive
                  ? formatDemoLabNote(lang)
                  : `${t("dash.source.label", lang)}: ${localizeBackendMessage(level?.data.source_message, level?.data.source ?? t("dash.backend.noPayload", lang), lang)}`}
              </span>
            </div>
          </section>

          <section className="og-wheel-panel og-wheel-mode">
            <div>
              <span className="og-label">{t("dash.mode.title", lang)}</span>{" "}
              <strong style={{ color: moving ? "var(--og-blue)" : "var(--og-green)" }}>
                {t(moving ? "hud.moving" : "hud.rest", lang)}
              </strong>{" "}
              <small style={{ color: recal ? "var(--og-green)" : "var(--og-muted)" }}>
                {t(recal ? "dash.mode.recalibrating" : "dash.mode.recalGated", lang)}
              </small>
            </div>
            <p className="og-wheel-panel__note">
              FSM <strong>{fsm.state}</strong> (t+{formatNumber(fsmTick, lang, 0)} s {t("dash.fsm.sharedClock", lang)}) ·{" "}
              {source === "live"
                ? t("dash.backend.windows", lang, { count: windows?.count ?? 0, rows: storeRows })
                : t("dash.backend.localWindows", lang)}
            </p>
            <p className="og-wheel-panel__note">
              <span className={`og-badge og-badge--source og-badge--source-${source}`}>
                {source === "loading"
                  ? t("dash.backend.probing", lang)
                  : source === "live" && backendNote?.kind === "live"
                    ? t("dash.backend.summary", lang, {
                        rows: backendNote.rows,
                        influx: localizeBackendMessage(backendNote.influxMessage, backendNote.influx, lang),
                      })
                    : live ? t("dash.backend.offline", lang) : t("wheel.source.demoWheel", lang)}
              </span>
              {signingBadge && (
                <span className={`og-badge og-badge--${signingBadge.tone}`}>
                  {signingBadge.kind === "off"
                    ? t("dash.signing.off", lang)
                    : t("dash.signing.verified", lang)}
                  {" · "}{signingBadge.rejected} {t("dash.signing.rejected", lang)}
                </span>
              )}
            </p>
          </section>
        </div>

        <aside className="og-wheel-side og-dashboard-side">
          <LadderPanel lang={lang} active={activeLevel} colors={ALERT_SEVERITY_COLORS} />
          <FusionPanel lang={lang} channels={channelStates} votes={votes} />
          <section className="og-wheel-panel og-wheel-rul">
            <RulPanel
              rul={demoActive ? demoRulFor(demoStage, lang) : (rul?.data ?? null)}
              analyzerUnavailable={analyzerUnavailable && !demoActive}
              evaluationReason={demoActive ? undefined : (rul?.reason ?? alerts?.reason)}
            />
          </section>
          <section className="og-wheel-panel">
            <h3 className="og-wheel-panel__title">
              {t("dash.alerts.title", lang)}
              <span className="og-wheel-panel__meta">
                {(analyzerUnavailable && !demoActive ? [] : demoActive ? shownAlerts.map((a) => a.level) : alerts?.data.escalation ?? shownAlerts.map((a) => a.level)).join(" → ") || t("dash.alerts.none", lang)}
              </span>
            </h3>
            {shownAlerts.length === 0 ? (
              <p className="og-wheel-panel__note">{t("dash.alerts.empty", lang)}</p>
            ) : (
              <ul className="og-wheel-alerts">
                {shownAlerts.map((a) => (
                  <li key={a.alert_id} style={`--tone: ${ALERT_SEVERITY_COLORS[a.level] ?? "var(--og-line-dashboard)"}`}>
                    <span className={`og-badge og-badge--alert og-badge--${a.level.toLowerCase()}`}>
                      {a.level}
                    </span>
                    <strong>{a.alert_id}</strong>
                    <span className="og-wheel-alerts__meta"> · t {formatNumber(a.t_s, lang, 1)} s · {localizeBackendZone(a.zone, lang)}</span>
                    <p>{localizeBackendMessage(a.reason_message, a.reason, lang)}</p>
                  </li>
                ))}
              </ul>
            )}
            {alerts && !demoActive && !analyzerUnavailable && live && (
              <p className="og-wheel-panel__note">
                {localizeBackendMessage(alerts.data.note_message, alerts.data.note, lang)} · {localizeBackendMessage(alerts.data.fallback_message, alerts.data.fallback, lang)}
              </p>
            )}
          </section>
        </aside>
      </div>

      <details className="og-wheel-raw">
        <summary>
          {t("wheel.raw.title", lang)}
          <span className="og-chip">{rawFromBackend ? t("wheel.raw.live", lang) : t("wheel.raw.demo", lang)}</span>
        </summary>
        <pre>{rawText || t("wheel.raw.empty", lang)}</pre>
      </details>

      <nav className="og-wheel-links" aria-label={t("wheel.links", lang)}>
        <a href={links.history}>{t("wheel.link.history", lang)}</a>
        <a href={links.alerts}>{t("wheel.link.alerts", lang)}</a>
      </nav>
    </div>
    </div>
  );
}

function demoRulFor(stage: DemoStageId, lang: Lang) {
  if (stage === "clean") {
    return {
      hours: null,
      haul_cycles: null,
      shifts: null,
      confidence: 0,
      status: "suppressed" as const,
      anomaly_only: true as const,
      model: DEMO_MODEL,
      note: t("dash.demo.rul.cleanNote", lang),
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
      note: t("dash.demo.rul.slowNote", lang, {
        model: t("rul.model.syntheticProxy", lang),
        qualifier: t("rul.unproven", lang),
        labNote: formatDemoLabNote(lang),
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
    note: t("dash.demo.rul.abruptNote", lang, {
      model: t("rul.model.syntheticProxy", lang),
      qualifier: t("rul.unproven", lang),
    }),
    fallback: "local DEMO fallback (backend down or demo override)",
  };
}
