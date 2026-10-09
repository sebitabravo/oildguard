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
  BACKEND_URL,
  getAlerts,
  getHealth,
  getLevel,
  getRul,
  getWindows,
  type AlertsResponse,
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
  DEMO_LAB_NOTE,
  DEMO_LAB_NOTE_ES,
  DEMO_MODEL,
  DEMO_SERIES,
  DEMO_SIGMA_L,
  DEMO_WINDOWS,
  demoAlertsUpTo,
  demoFracFor,
} from "./demoData";
import { emitDemoOil, type DemoStageId } from "./demoBus";
import { t, useLang } from "../i18n";
import { buildWheelDetailHref } from "../sim/bench/wheelUrl";
import { DEMO_FLEET_WHEELS, evaluateCombinedRisk, latestWheelMetrics } from "./fleetRisk";
import { localizeDashboardBackendText } from "./backendNotes";
import { signingBadgeState } from "./signingBadge";

type Source = "loading" | "live" | "demo";

const DEMO_STAGES: DemoStageId[] = ["clean", "slow-leak", "abrupt-drop", "done"];

function stageBlurb(stage: string, es: boolean): string {
  if (es) {
    if (stage === "clean") return "Base: 95 L, sin alertas. RUL suprimido (sin tendencia).";
    if (stage === "slow-leak") return `Fuga lenta (${DEMO_LAB_NOTE_ES}). Recorrido N1 → N2 → N3.`;
    if (stage === "abrupt-drop") return "Caída brusca de 15 L. Se activa N4 crítico; el RUL lineal no es válido.";
    return "Recorrido completo: N1 → N2 → N3 → N4. Reinicia para repetir.";
  }
  if (stage === "clean") return "Baseline: 95 L, no alerts. RUL suppressed (no leak trend).";
  if (stage === "slow-leak") return `Slow leak (${DEMO_LAB_NOTE}). N1 -> N2 -> N3 walk.`;
  if (stage === "abrupt-drop") return "Abrupt 15 L step. N4 critical fires; linear RUL invalid.";
  return "Walk complete: N1 -> N2 -> N3 -> N4. Reset to run again.";
}

function stageLabel(stage: DemoStageId, es: boolean): string {
  const labels: Record<DemoStageId, { en: string; es: string }> = {
    idle: { en: "Idle", es: "Inactivo" },
    clean: { en: "Baseline", es: "Línea base" },
    "slow-leak": { en: "Slow leak", es: "Fuga lenta" },
    "abrupt-drop": { en: "Abrupt drop", es: "Caída brusca" },
    done: { en: "Complete", es: "Completo" },
  };
  return labels[stage][es ? "es" : "en"];
}

const ALERT_CSS: Record<string, string> = {
  N1: "var(--og-amber)",
  N2: "var(--og-orange)",
  N3: "var(--og-orange)",
  N4: "var(--og-red)",
};

export default function Dashboard() {
  const [lang] = useLang();
  const es = lang === "es";
  const [source, setSource] = useState<Source>("loading");
  const [backendNote, setBackendNote] = useState("");
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
      const [h, lv, al, ru, wi] = await Promise.all([
        getHealth(),
        getLevel(),
        getAlerts(),
        getRul(),
        getWindows(50),
      ]);
      setStoreRows(h.store_rows);
      setSigningStatus(h.signing);
      setLevel(lv);
      setAlerts(al);
      setRul(ru);
      setWindows(wi);
      setBackendNote(`store_rows=${h.store_rows} · ${h.influx}`);
      setSource("live");
      const lit = Number(lv.data.level_liters);
      if (Number.isFinite(lit)) {
        setHistory((prev) => {
          const t = prev.length === 0 ? 0 : prev[prev.length - 1].t_s + 2;
          const next = [...prev, { t_s: t, liters: lit }];
          return next.slice(-120);
        });
      }
    } catch (e) {
      setSigningStatus(undefined);
      setBackendNote(
        `backend unreachable (${BACKEND_URL}): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
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
    : (alerts?.data.alerts ?? []);
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
        {es
          ? <>Nivel fusionado + confianza, ventanas de reposo, escalera N1–N4, RUL e indicador de modo. Modelo <code>{DEMO_MODEL}</code>.</>
          : <>Fused level + confidence, rest windows, N1–N4 ladder, RUL, and the sim-linked mode indicator. Model <code>{DEMO_MODEL}</code>.</>}{" "}
        {t("dash.honesty", lang)}
      </p>

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
                <th></th>
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
                    <td className="og-num">{wheel.oilLitres.toFixed(1)}</td>
                    <td className="og-num">{wheel.temperatureC.join(" · ")}</td>
                    <td className="og-num">{wheel.vibrationMmS.map((value) => value.toFixed(1)).join(" · ")}</td>
                    <td className="og-num">{wheel.currentA.join(" · ")}</td>
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
          {source === "loading" ? (es ? "CONECTANDO…" : "CONNECTING…") : source === "live" ? (es ? "EN VIVO · backend" : "LIVE · backend") : (es ? "DEMO · local" : "DEMO · local fallback")}
        </span>
        <span style={{ fontSize: 12, color: "var(--og-muted)" }}>
          {es
            ? source === "loading" ? t("dash.backend.probing", lang) : source === "live" ? t("dash.backend.connected", lang) : t("dash.backend.offline", lang)
            : backendNote || t("dash.backend.probing", lang)}
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
          {es ? "Actualizar desde backend" : "Refresh from backend"}
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
            {es ? "Ejecutar demo de fuga (limpio → N4)" : "Run leak demo (clean → N4)"}
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
            {es ? "Reiniciar demo" : "Reset demo"}
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
                {stageLabel(s, es)}
              </span>
            ))}
            <span style={{ fontSize: 13, color: "var(--og-body)" }}>
              {stageBlurb(demoStage, es)} · {es ? "aceite" : "oil"} {formatOilText(demoFrac)} · {es ? "también mueve el nivel del banco 3D" : "also driving the Bench 3D fill"}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* level chart */}
        <div style={{ flex: "2 1 560px", minWidth: 320, border: "1px solid var(--og-line-dashboard)", padding: 16, background: "var(--og-panel-dashboard)" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>
            {es ? "Nivel de aceite + confianza" : "Oil level + confidence"}{" "}
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--og-muted)" }}>
              ±{sigmaL.toFixed(2)} L · conf {Number(confidence).toFixed(3)} · {es ? "bandas verdes = ventanas de reposo" : "green bands = rest windows"}
            </span>
          </h2>
          <LevelChart points={shownPoints} sigmaL={sigmaL} windows={shownWindows} alerts={shownAlerts} />
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--og-muted)" }}>
            {t("dash.footnote", lang)}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, fontSize: 13 }}>
            <span style={{ color: demoOilCss, fontWeight: 700 }}>
              {demoActive ? `${es ? "Demo " : "Demo fill "}${formatOilText(demoFrac)}` : level ? `${Number(level.data.level_liters).toFixed(1)} L · ${Number(level.data.level_pct).toFixed(1)}%` : "—"}
            </span>
            <span style={{ color: "var(--og-muted)" }}>
              {demoActive
                ? (es ? DEMO_LAB_NOTE_ES : DEMO_LAB_NOTE)
                : `${es ? "origen" : "source"}: ${localizeDashboardBackendText(level?.data.source ?? (es ? "sin datos del backend" : "no backend payload yet"), lang)}`}
            </span>
          </div>
        </div>

        {/* side column */}
        <div style={{ flex: "1 1 280px", minWidth: 260, maxWidth: 400, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* mode indicator */}
          <div style={{ border: "1px solid var(--og-line-dashboard)", borderRadius: 6, padding: "10px 12px", background: "var(--og-panel-dashboard)" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {es ? "Modo · " : "Mode · "}
              <span style={{ color: moving ? "var(--og-blue)" : "var(--og-green)" }}>
                {moving ? (es ? "EN MOVIMIENTO" : "MOVING") : (es ? "DETENIDO" : "REST")}
              </span>{" "}
              <span style={{ fontSize: 12, color: recal ? "var(--og-green)" : "var(--og-muted)" }}>
                {recal ? (es ? "· RECALIBRANDO" : "· RECALIBRATING") : (es ? "· recal bloqueado" : "· recal gated")}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--og-body)" }}>
              FSM <strong>{fsm.state}</strong> (t+{fsmTick.toFixed(0)} s {es ? "reloj compartido con el camión" : "shared clock with the Truck sim"}) ·{" "}
              {source === "live"
                ? `backend windows: ${windows?.count ?? 0} (store_rows=${storeRows})`
                : (es ? "backend caído — ventanas del conjunto DEMO local" : "backend down — windows from local DEMO set")}
            </div>
          </div>

          <RulPanel rul={demoActive ? demoRulFor(demoStage) : (rul?.data ?? null)} />

          {/* N1–N4 timeline */}
          <div style={{ border: "1px solid var(--og-line-dashboard)", borderRadius: 6, padding: "10px 12px", background: "var(--og-panel-dashboard)" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {es ? "Alertas N1–N4 " : "Alerts timeline "}
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--og-muted)" }}>
                {(alerts?.data.escalation ?? shownAlerts.map((a) => a.level)).join(" → ") || (es ? "sin alertas" : "no alerts")}
              </span>
            </div>
            {shownAlerts.length === 0 ? (
              <p style={{ margin: 0, color: "var(--og-muted)", fontSize: 13 }}>
                {es ? "(sin alertas — línea base limpia; RUL suprimido, solo anomalías)" : "(no alerts — clean baseline; RUL stays suppressed anomaly-only)"}
              </p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {shownAlerts.map((a) => (
                  <li key={a.alert_id} style={{ marginBottom: 8, border: `1px solid ${ALERT_CSS[a.level] ?? "var(--og-line-dashboard)"}`, borderRadius: 6, padding: "6px 8px" }}>
                    <span style={{ display: "inline-block", fontSize: 12, fontWeight: 800, color: "var(--og-panel-inset)", background: ALERT_CSS[a.level] ?? "var(--og-text)", borderRadius: 4, padding: "1px 8px", marginRight: 8 }}>
                      {a.level}
                    </span>
                    <strong style={{ fontSize: 13 }}>{a.alert_id}</strong>
                    <span style={{ fontSize: 12, color: "var(--og-muted)" }}> · t {a.t_s} s · {a.zone}</span>
                    <br />
                    <span style={{ fontSize: 13, color: "var(--og-body)" }}>{a.reason}</span>
                  </li>
                ))}
              </ul>
            )}
            {alerts && !demoActive && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--og-muted)" }}>
                {localizeDashboardBackendText(alerts.data.note, lang)} · {localizeDashboardBackendText(alerts.data.fallback, lang)}
              </p>
            )}
          </div>
        </div>
      </div>
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
      note: "RUL suppressed: no leak trend (slope >= 0); anomaly-only. Clean baseline holds 95 L.",
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
      note: `model=${DEMO_MODEL} (UNPROVEN until the bench). ${DEMO_LAB_NOTE}.`,
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
    note: `model=${DEMO_MODEL} (UNPROVEN until the bench). Abrupt step: linear RUL invalid, N4 fires instead.`,
    fallback: "local DEMO fallback (backend down or demo override)",
  };
}
