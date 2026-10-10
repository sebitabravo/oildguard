// T11 pro dashboard (S6 slice): level + confidence band, rest-window
// markers, N1–N4 timeline, RUL panel, sim-linked mode indicator, and the
// one-click clean -> slow-leak -> abrupt-drop -> N4 demo scenario.
//
// Data: S4 API via sim/api.ts (GET /level /alerts /rul /windows). When the
// backend is down the view falls back to local DEMO data and says so —
// the DEMO badge is never silent. Model label everywhere:
// `synthetic-proxy` (UNPROVEN until S7 bench drain-and-weigh).

import { useCallback, useEffect, useRef, useState } from "preact/hooks";
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
import { buildWheelDetailHref } from "../sim/bench/wheelUrl";
import { DEMO_FLEET_WHEELS, evaluateCombinedRisk, latestWheelMetrics } from "./fleetRisk";
import { localizeBackendMessage, localizeBackendZone } from "./backendNotes";
import { signingBadgeState } from "./signingBadge";
import { analyzerUnavailableNotice } from "./analyzerAvailability";
import { mergeLevelSeries } from "./levelSeries";

type Source = "loading" | "live" | "demo";
type BackendNote =
  | { kind: "live"; rows: number; influx: string; influxMessage?: BackendMessage }
  | { kind: "error" }
  | null;

const DEMO_STAGES: DemoStageId[] = ["clean", "slow-leak", "abrupt-drop", "done"];

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
  const params = stage === "slow-leak" ? { labNote: t("dash.demo.labNote", lang) } : undefined;
  return t(DEMO_BLURB_KEYS[stage], lang, params);
}

function stageLabel(stage: DemoStageId, lang: Lang): string {
  return t(DEMO_LABEL_KEYS[stage], lang);
}

const ALERT_CSS: Record<string, string> = {
  N1: "var(--og-amber)",
  N2: "var(--og-orange)",
  N3: "var(--og-orange)",
  N4: "var(--og-red)",
};

export default function Dashboard() {
  const [lang] = useLang();
  const [source, setSource] = useState<Source>("loading");
  const [backendNote, setBackendNote] = useState<BackendNote>(null);
  const [analysisAvailable, setAnalysisAvailable] = useState<boolean | undefined>();
  const [signingStatus, setSigningStatus] = useState<SigningStatus | undefined>();
  const [storeRows, setStoreRows] = useState(0);
  const [level, setLevel] = useState<LevelResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [rul, setRul] = useState<RulResponse | null>(null);
  const [windows, setWindows] = useState<WindowsResponse | null>(null);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [demoStage, setDemoStage] = useState<DemoStageId>("idle");
  const [demoTick, setDemoTick] = useState(0);
  const [fsmTick, setFsmTick] = useState(0);
  const mountT = useRef(Date.now());

  const fetchAll = useCallback(async () => {
    try {
      const [h, lv, al, ru, wi, ls] = await Promise.all([
        getHealth(),
        getLevel(),
        getAlerts(),
        getRul(),
        getWindows(50),
        getLevelSeries(),
      ]);
      setStoreRows(h.store_rows);
      setSigningStatus(h.signing);
      setAnalysisAvailable(h.analysis.available);
      setLevel(lv);
      setAlerts(al);
      setRul(ru);
      setWindows(wi);
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
      setBackendNote({ kind: "error" });
      setSource("demo");
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    // El parámetro demo=1 inicia la demostración al abrir Monitoreo.
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      setDemoTick(0);
      setDemoStage("clean");
    }
  }, [fetchAll]);

  // Live FSM clock shared with the truck sim (same stateAt vocabulary).
  useEffect(() => {
    const id = window.setInterval(() => {
      setFsmTick((Date.now() - mountT.current) / 1000);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Demo runner: 5 s clean -> 15 s slow-leak -> 6 s abrupt-drop -> done.
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

  // Drive the linked 3D oil fill on every demo tick.
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

  const demoActive = demoStage !== "idle";
  const analyzerNotice = analyzerUnavailableNotice({
    analysisAvailable,
    alertStatus: alerts?.status,
    rulStatus: rul?.status,
  }, lang);
  const analyzerUnavailable = analyzerNotice !== null;
  const fsm = stateAt(fsmTick);
  const moving = isMovingState(fsm.state);
  const recal = isRecalState(fsm.state);

  // Rendered series: live history (polled /level) or demo trace.
  const demoCutoff: Record<string, number> = {
    clean: 30,
    "slow-leak": 90,
    "abrupt-drop": 120,
    done: 120,
  };
  const shownPoints: ChartPoint[] = demoActive
    ? DEMO_SERIES.filter((p) => p.t_s <= (demoCutoff[demoStage] ?? 30)).slice(-90)
    : history.length > 0
      ? history
      : DEMO_SERIES.slice(0, 31);
  const shownAlerts = demoActive
    ? demoAlertsUpTo(demoStage)
    : analyzerUnavailable ? [] : (alerts?.data.alerts ?? []);
  const shownWindows = demoActive
    ? DEMO_WINDOWS
    : (windows?.windows ?? DEMO_WINDOWS);
  const sigmaL =
    alerts?.data.level?.sigma_liters ?? DEMO_SIGMA_L;
  const confidence =
    alerts?.data.level?.confidence ?? DEMO_CONFIDENCE;
  const demoFrac = demoActive ? demoFracFor(demoStage, demoTick) : 1.0;
  const demoOilState = oilStateFor(demoFrac);
  const demoOilCss = oilCssFor(demoOilState);
  const signingBadge = signingBadgeState(signingStatus);

  return (
    <div className="og-page">
    <div className="og-page__inner">
      <p style={{ margin: "0 0 12px", color: "var(--og-muted)" }}>
        {t("dash.intro", lang, { model: t("rul.model.syntheticProxy", lang) })}{" "}
        {t("dash.honesty", lang)}
      </p>

      {analyzerNotice && <div className="og-analyzer-notice" role="alert">{analyzerNotice}</div>}

      <section className="og-fleet-panel" aria-labelledby="og-fleet-title">
        <div className="og-fleet-panel__heading">
          <div>
            <h2 id="og-fleet-title">{t("dash.fleet.title", lang)}</h2>
            <p>{t("dash.fleet.proxy", lang)}</p>
          </div>
          <span className="og-fleet-panel__risk-title">{t("dash.fleet.risk", lang)}</span>
        </div>
        <p className="og-fleet-panel__assumption">{t("dash.fleet.assumptions", lang)}</p>
        <div className="og-fleet-wrap">
          <table className="og-fleet-table">
            <thead>
              <tr>
                <th>{t("dash.fleet.truck", lang)}</th>
                <th>{t("dash.fleet.wheel", lang)}</th>
                <th>{t("dash.fleet.oil", lang)}</th>
                <th>{t("dash.fleet.temp", lang)}</th>
                <th>{t("dash.fleet.vibration", lang)}</th>
                <th>{t("dash.fleet.current", lang)}</th>
                <th>{t("dash.fleet.risk", lang)}</th>
                <th>{t("dash.fleet.detailColumn", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_FLEET_WHEELS.map((wheel) => {
                const metrics = latestWheelMetrics(wheel);
                const risk = evaluateCombinedRisk(metrics);
                return (
                  <tr key={`${wheel.truckId}-${wheel.wheelId}`}>
                    <td className="og-num">{wheel.truckId}</td>
                    <td className="og-num">
                      {wheel.wheelId}
                      {wheel.instrumented && <span className="og-fleet-instrumented">{t("dash.fleet.instrumented", lang)}</span>}
                    </td>
                    <td className="og-num">{formatNumber(wheel.oilLitres, lang, 1)}</td>
                    <td className="og-num">{wheel.temperatureC.map((value) => formatNumber(value, lang, 0)).join(" · ")}</td>
                    <td className="og-num">{wheel.vibrationMmS.map((value) => formatNumber(value, lang, 1)).join(" · ")}</td>
                    <td className="og-num">{wheel.currentA.map((value) => formatNumber(value, lang, 0)).join(" · ")}</td>
                    <td>
                      <span className={`og-fleet-risk${risk.alert ? " og-fleet-risk--alert" : ""}`}>
                        {risk.alert ? t("dash.fleet.alert", lang) : t("dash.fleet.normal", lang)}
                      </span>
                      {risk.channels.length > 0 && (
                        <span className="og-fleet-channels">
                          {risk.channels.map((channel) => t(`dash.fleet.${channel === "low-oil" ? "lowOil" : channel === "high-temperature" ? "highTemperature" : "highVibration"}`, lang)).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td>
                      <a className="og-fleet-link" href={buildWheelDetailHref(wheel.truckId, wheel.wheelId)}>
                        {t("dash.fleet.detail", lang)}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* source + backend row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.5,
            color: "var(--og-panel-inset)",
            background: source === "live" ? "var(--og-green)" : "var(--og-amber)",
            borderRadius: 4,
            padding: "4px 10px",
          }}
        >
          {t(
            source === "loading"
              ? "dash.source.badge.loading"
              : source === "live"
                ? "dash.source.badge.live"
                : "dash.source.badge.demo",
            lang,
          )}
        </span>
        <span style={{ fontSize: 12, color: "var(--og-muted)" }}>
          {source === "live" && backendNote?.kind === "live"
            ? t("dash.backend.summary", lang, {
                rows: backendNote.rows,
                influx: localizeBackendMessage(backendNote.influxMessage, backendNote.influx, lang),
              })
            : t(
                  source === "loading"
                    ? "dash.backend.probing"
                    : source === "live"
                      ? "dash.backend.connected"
                      : "dash.backend.offline",
                  lang,
                )}
        </span>
        {signingBadge && (
          <span className={`og-badge og-badge--${signingBadge.tone}`}>
            {signingBadge.kind === "off"
              ? t("dash.signing.off", lang)
              : t("dash.signing.verified", lang)}
            {" · "}{signingBadge.rejected} {t("dash.signing.rejected", lang)}
          </span>
        )}
        <button
          type="button"
          onClick={() => void fetchAll()}
          style={{
            cursor: "pointer",
            color: "var(--og-text)",
            background: "transparent",
            border: "1px solid var(--og-amber)",
            borderRadius: 6,
            padding: "5px 12px",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {t("dash.action.refresh", lang)}
        </button>
        {!demoActive ? (
          <button
            type="button"
            onClick={startDemo}
            style={{
              cursor: "pointer",
              color: "var(--og-panel-inset)",
              background: "var(--og-amber)",
              border: "1px solid transparent",
              borderRadius: 6,
              padding: "5px 12px",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {t("demo.run", lang)}
          </button>
        ) : (
          <button
            type="button"
            onClick={resetDemo}
            style={{
              cursor: "pointer",
              color: "var(--og-text)",
              background: "transparent",
              border: "1px solid var(--og-line-soft)",
              borderRadius: 6,
              padding: "5px 12px",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {t("demo.reset", lang)}
          </button>
        )}
      </div>

      {/* demo stage stepper */}
      {demoActive && (
        <div
          style={{
            border: "1px solid var(--og-amber)",
            borderRadius: 6,
            padding: "10px 12px",
            marginBottom: 12,
            background: "var(--og-panel-dashboard)",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {DEMO_STAGES.map((s) => (
              <span
                key={s}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: s === demoStage ? "var(--og-panel-inset)" : "var(--og-text)",
                  background: s === demoStage ? "var(--og-amber)" : "transparent",
                  border: `1px solid ${s === demoStage ? "var(--og-amber)" : "var(--og-line-soft)"}`,
                  borderRadius: 4,
                  padding: "3px 10px",
                }}
              >
                {stageLabel(s, lang)}
              </span>
            ))}
            <span style={{ fontSize: 13, color: "var(--og-body)" }}>
              {stageBlurb(demoStage, lang)} · {t("dash.demo.oil", lang)} {formatOilText(demoFrac, lang)} · {t("dash.demo.benchLink", lang)}
            </span>
          </div>
        </div>
      )}

      <div className="og-dashboard-panels" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* level chart */}
        <div className="og-dashboard-chart" style={{ flex: "2 1 560px", minWidth: 320, border: "1px solid var(--og-line-dashboard)", padding: 16, background: "var(--og-panel-dashboard)" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>
            {t("dash.chart.title", lang)}{" "}
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--og-muted)" }}>
              ±{formatNumber(sigmaL, lang, 2)} L · conf {formatNumber(Number(confidence), lang, 3)} · {t("dash.chart.restWindows", lang)}
            </span>
          </h2>
          <LevelChart points={shownPoints} sigmaL={sigmaL} windows={shownWindows} alerts={shownAlerts} />
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--og-muted)" }}>
            {t("dash.footnote", lang)}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, fontSize: 13 }}>
            <span style={{ color: demoOilCss, fontWeight: 700 }}>
              {demoActive
                ? t("dash.demo.fill", lang, { value: formatOilText(demoFrac, lang) })
                : level
                  ? `${formatNumber(Number(level.data.level_liters), lang, 1)} L · ${formatNumber(Number(level.data.level_pct), lang, 1)}%`
                  : "—"}
            </span>
            <span style={{ color: "var(--og-muted)" }}>
              {demoActive
                ? t("dash.demo.labNote", lang)
                : `${t("dash.source.label", lang)}: ${localizeBackendMessage(level?.data.source_message, level?.data.source ?? t("dash.backend.noPayload", lang), lang)}`}
            </span>
          </div>
        </div>

        {/* side column */}
        <div className="og-dashboard-side" style={{ flex: "1 1 280px", minWidth: 260, maxWidth: 400, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* mode indicator */}
          <div style={{ border: "1px solid var(--og-line-dashboard)", borderRadius: 6, padding: "10px 12px", background: "var(--og-panel-dashboard)" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {t("dash.mode.title", lang)}{" "}
              <span style={{ color: moving ? "var(--og-blue)" : "var(--og-green)" }}>
                {t(moving ? "hud.moving" : "hud.rest", lang)}
              </span>{" "}
              <span style={{ fontSize: 12, color: recal ? "var(--og-green)" : "var(--og-muted)" }}>
                {t(recal ? "dash.mode.recalibrating" : "dash.mode.recalGated", lang)}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--og-body)" }}>
              FSM <strong>{fsm.state}</strong> (t+{formatNumber(fsmTick, lang, 0)} s {t("dash.fsm.sharedClock", lang)}) ·{" "}
              {source === "live"
                ? t("dash.backend.windows", lang, { count: windows?.count ?? 0, rows: storeRows })
                : t("dash.backend.localWindows", lang)}
            </div>
          </div>

          <RulPanel
            rul={demoActive ? demoRulFor(demoStage, lang) : (rul?.data ?? null)}
            analyzerUnavailable={analyzerUnavailable && !demoActive}
            evaluationReason={demoActive ? undefined : (rul?.reason ?? alerts?.reason)}
          />

          {/* N1–N4 timeline */}
          <div style={{ border: "1px solid var(--og-line-dashboard)", borderRadius: 6, padding: "10px 12px", background: "var(--og-panel-dashboard)" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {t("dash.alerts.title", lang)}{" "}
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--og-muted)" }}>
                {(analyzerUnavailable && !demoActive ? [] : alerts?.data.escalation ?? shownAlerts.map((a) => a.level)).join(" → ") || t("dash.alerts.none", lang)}
              </span>
            </div>
            {shownAlerts.length === 0 ? (
              <p style={{ margin: 0, color: "var(--og-muted)", fontSize: 13 }}>
                {t("dash.alerts.empty", lang)}
              </p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {shownAlerts.map((a) => (
                  <li key={a.alert_id} style={{ marginBottom: 8, border: `1px solid ${ALERT_CSS[a.level] ?? "var(--og-line-dashboard)"}`, borderRadius: 6, padding: "6px 8px" }}>
                    <span style={{ display: "inline-block", fontSize: 12, fontWeight: 800, color: "var(--og-panel-inset)", background: ALERT_CSS[a.level] ?? "var(--og-text)", borderRadius: 4, padding: "1px 8px", marginRight: 8 }}>
                      {a.level}
                    </span>
                    <strong style={{ fontSize: 13 }}>{a.alert_id}</strong>
                    <span style={{ fontSize: 12, color: "var(--og-muted)" }}> · t {formatNumber(a.t_s, lang, 1)} s · {localizeBackendZone(a.zone, lang)}</span>
                    <br />
                    <span style={{ fontSize: 13, color: "var(--og-body)" }}>
                      {localizeBackendMessage(a.reason_message, a.reason, lang)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {alerts && !demoActive && !analyzerUnavailable && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--og-muted)" }}>
                {localizeBackendMessage(alerts.data.note_message, alerts.data.note, lang)} · {localizeBackendMessage(alerts.data.fallback_message, alerts.data.fallback, lang)}
              </p>
            )}
          </div>
        </div>
      </div>
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
        labNote: t("dash.demo.labNote", lang),
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
