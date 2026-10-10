import { useState } from "preact/hooks";
import TruckScene from "./TruckScene";
import { HAUL_STATE_CSS, TRUCK_CALLOUTS, TRUCK_DIMS_M } from "./cycle";
import { PLM_ORDER, type PlmState } from "../../twin/fleet/fleetSim";
import { t, type DictKey, useLang } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import Drawer from "../../ui/Drawer";
import HonestyBadge from "../../ui/HonestyBadge";
import TruckSheet from "./TruckSheet";
import { resetFleetStore } from "./mineWorld";
import { buildPlmStateLabel } from "./mineSceneCopy";

// Vista Mina y flota: el visor 3D ocupa todo el alto y el detalle (ciclo,
// ficha técnica 930E-4SE, notas) vive en el panel lateral con pestañas.
// Envolvente del curso 15.29 x 8.89 x 8.10 m (tolva arriba 14.80 m) junto a las
// cotas del folleto con las que se construye el modelo; pesos; fluidos; tren de
// potencia; frenos; cabina; matriz STOP/precaución; llamadas 1-22 EN/ES; tabla de
// procedencia de cada cota del modelo paramétrico.

export default function TruckView() {
  const [current, setCurrent] = useState<PlmState>("empty");
  // ?pause=1 congela el ciclo (capturas reproducibles junto con ?t= y ?cam=).
  const [paused, setPaused] = useState(() => new URLSearchParams(window.location.search).get("pause") === "1");
  const [stepTick, setStepTick] = useState(0);
  const [requestedTab, setRequestedTab] = useState<{ id: string; nonce: number }>({ id: "status", nonce: 0 });
  const [runId, setRunId] = useState(0);
  const [lang] = useLang();

  const dock = (
    <div className="og-hud" style={{ position: "static", display: "flex", gap: 8 }}>
      <button
        type="button"
        className={`og-btn ${paused ? "og-btn--ok" : "og-btn--primary"}`}
        onClick={() => setPaused((p) => !p)}
      >
        {t(paused ? "truck.action.resume" : "truck.action.pause", lang)}
      </button>
      <button
        type="button"
        className="og-btn"
        disabled={!paused}
        title={t(paused ? "truck.action.stepTitle" : "truck.action.stepPausedTitle", lang)}
        onClick={() => setStepTick((n) => n + 1)}
      >
        {t("truck.action.step", lang)}
      </button>
      <button type="button" className="og-btn" onClick={() => { resetFleetStore(); setRunId((n) => n + 1); }}>
        {t("truck.restart", lang)}
      </button>
      <a
        className="og-btn"
        href="/wheel?from=mine&truck=930E-4SE&wheel=RH&sensor=pressure&oil=66.5&mode=rest&cutaway=1"
      >
        {t("truck.action.openWheel", lang)}
      </a>
    </div>
  );

  const status = (
    <>
      <h2 className="og-h2">{t("truck.section.payloadMeter", lang)}</h2>
      <ul className="og-plain">
        {PLM_ORDER.map((s) => {
          const active = s === current;
          const css = HAUL_STATE_CSS[s === "loading" ? "LOAD" : s === "dumping" ? "DUMP" : s === "hauling" || s === "maneuvering" || s === "final_zone" ? "HAUL" : "WAIT"];
          return (
            <li
              key={s}
              className={`og-card og-card--tone${active ? " og-card--active" : ""}`}
              style={{ ["--tone" as string]: css }}
            >
              <span className="og-dot" style={{ marginRight: 8 }} />
              <strong className="og-num">
                {buildPlmStateLabel(s, lang)} · {s}
              </strong>
              <br />
              <span className="og-muted" style={{ fontSize: 13 }}>
                {t("truck.state.estimated", lang)}
              </span>
            </li>
          );
        })}
      </ul>
      <h2 className="og-h2">{t("truck.state.matrixTitle", lang)}</h2>
      <p className="og-body">
        <span style={{ color: "var(--og-red)", fontWeight: 700 }}>STOP </span>
        {t("truck.state.matrixBody", lang)}
      </p>
    </>
  );

  const notes = (
    <>
      <h2 className="og-h2">{t("truck.notes.title", lang)}</h2>
      <p className="og-body">
        {t("truck.notes.about", lang, {
          length: formatNumber(TRUCK_DIMS_M.L, lang, 2),
          width: formatNumber(TRUCK_DIMS_M.W, lang, 2),
          height: formatNumber(TRUCK_DIMS_M.H, lang, 2),
          bodyUp: formatNumber(TRUCK_DIMS_M.bodyUp, lang, 2),
        })}
      </p>
      <p className="og-body">{t("app.scope", lang)}</p>
      <p className="og-body">{t("truck.honesty", lang)}</p>
      <h2 className="og-h2">{t("truck.notes.calloutsTitle", lang)}</h2>
      <ol className="og-list">
        {TRUCK_CALLOUTS.map((c) => (
          <li key={c.n}>
            <strong>{formatNumber(c.n, lang, 0)}.</strong> {t(`truck.callout.${c.n}` as DictKey, lang)}
          </li>
        ))}
      </ol>
    </>
  );

  return (
    <div className="og-view">
      <div className="og-viewport">
        <TruckScene
          key={runId}
          paused={paused}
          stepTick={stepTick}
          onPhase={setCurrent}
          dock={dock}
          badge={
            <HonestyBadge
              label={t("badge.model", lang)}
              text={t("truck.model", lang)}
              actionLabel={t("badge.model.open", lang)}
              onAction={() => setRequestedTab((r) => ({ id: "sheet", nonce: r.nonce + 1 }))}
            />
          }
        />
      </div>
      <Drawer
        requestedTab={requestedTab}
        tabs={[
          { id: "status", label: t("drawer.status", lang), content: status },
          { id: "sheet", label: t("drawer.sheet", lang), content: <TruckSheet lang={lang} /> },
          { id: "notes", label: t("drawer.notes", lang), content: notes },
        ]}
      />
    </div>
  );
}
