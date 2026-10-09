import { useState } from "preact/hooks";
import TruckScene from "./TruckScene";
import { HAUL_STATE_CSS, TRUCK_CALLOUTS, TRUCK_DIMS_M, TRUCK_WEIGHTS_KG } from "./cycle";
import { PLM_ORDER, type PlmState } from "../../twin/fleet/fleetSim";
import { t, type DictKey, useLang } from "../../i18n";
import Drawer from "../../ui/Drawer";
import HonestyBadge from "../../ui/HonestyBadge";
import ProvenanceTable from "./ProvenanceTable";
import { resetFleetStore } from "./mineWorld";

const PLM_LABEL_KEYS: Record<PlmState, DictKey> = {
  tare_zone: "truck.state.tareZone",
  empty: "truck.state.empty",
  loading: "truck.state.loading",
  maneuvering: "truck.state.maneuvering",
  final_zone: "truck.state.finalZone",
  hauling: "truck.state.hauling",
  dumping: "truck.state.dumping",
  after_dump: "truck.state.afterDump",
};

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
                {t(PLM_LABEL_KEYS[s], lang)} · {s}
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

  const sheet = (
    <>
      <h2 className="og-h2">{t("truck.sheet.dimensionsTitle", lang)}</h2>
      <p className="og-body og-num">
        {t("truck.sheet.dimensions", lang, {
          length: TRUCK_DIMS_M.L,
          width: TRUCK_DIMS_M.W,
          height: TRUCK_DIMS_M.H,
          bodyUp: TRUCK_DIMS_M.bodyUp,
          empty: TRUCK_WEIGHTS_KG.empty,
          emptyFront: TRUCK_WEIGHTS_KG.emptyF,
          emptyRear: TRUCK_WEIGHTS_KG.emptyR,
          loaded: TRUCK_WEIGHTS_KG.loaded,
          loadedFront: TRUCK_WEIGHTS_KG.loadedF,
          loadedRear: TRUCK_WEIGHTS_KG.loadedR,
          payload: TRUCK_WEIGHTS_KG.payload,
          volume: TRUCK_WEIGHTS_KG.volumeM3,
          max: TRUCK_WEIGHTS_KG.maxT,
          overload: TRUCK_WEIGHTS_KG.overloadT,
        })}
      </p>
      <h2 className="og-h2">{t("truck.sheet.fluidsTitle", lang)}</h2>
      <p className="og-body">{t("truck.sheet.fluids", lang)}</p>
      <h2 className="og-h2">{t("truck.sheet.powertrainTitle", lang)}</h2>
      <p className="og-body">{t("truck.sheet.powertrain", lang)}</p>
      <h2 className="og-h2">{t("truck.sheet.brakesTitle", lang)}</h2>
      <p className="og-body">{t("truck.sheet.brakes", lang)}</p>
      <ProvenanceTable lang={lang} />
    </>
  );

  const notes = (
    <>
      <h2 className="og-h2">{t("truck.notes.title", lang)}</h2>
      <p className="og-body">
        {t("truck.notes.about", lang, {
          length: TRUCK_DIMS_M.L,
          width: TRUCK_DIMS_M.W,
          height: TRUCK_DIMS_M.H,
          bodyUp: TRUCK_DIMS_M.bodyUp,
        })}
      </p>
      <p className="og-body">{t("app.scope", lang)}</p>
      <p className="og-body">{t("truck.honesty", lang)}</p>
      <h2 className="og-h2">{t("truck.notes.calloutsTitle", lang)}</h2>
      <ol className="og-list">
        {TRUCK_CALLOUTS.map((c) => (
          <li key={c.n}>
            <strong>{c.n}.</strong> {t(`truck.callout.${c.n}` as DictKey, lang)}
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
          { id: "sheet", label: t("drawer.sheet", lang), content: sheet },
          { id: "notes", label: t("drawer.notes", lang), content: notes },
        ]}
      />
    </div>
  );
}
