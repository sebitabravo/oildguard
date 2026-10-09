import { useState } from "react";
import TruckScene, { STATE_ES } from "./TruckScene";
import {
  HAUL_DURATIONS,
  HAUL_ORDER,
  HAUL_STATE_BLURB,
  HAUL_STATE_BLURB_ES,
  HAUL_STATE_CSS,
  TRUCK_CALLOUTS,
  TRUCK_DIMS_M,
  TRUCK_WEIGHTS_KG,
  isMovingState,
  isRecalState,
  type HaulState,
} from "./cycle";
import { t, useLang } from "../../i18n";
import Drawer from "../../ui/Drawer";
import HonestyBadge from "../../ui/HonestyBadge";
import ProvenanceTable from "./ProvenanceTable";

// Vista Mina y flota: el visor 3D ocupa todo el alto y el detalle (ciclo,
// ficha técnica 930E-4SE, notas) vive en el panel lateral con pestañas.
// Envolvente del curso 15.29 x 8.89 x 8.10 m (tolva arriba 14.80 m) junto a las
// cotas del folleto con las que se construye el modelo; pesos; fluidos; tren de
// potencia; frenos; cabina; matriz STOP/precaución; llamadas 1-22 EN/ES; tabla de
// procedencia de cada cota del modelo paramétrico.

export default function TruckView() {
  const [current, setCurrent] = useState<HaulState>("LOAD");
  // ?pause=1 congela el ciclo (capturas reproducibles junto con ?t= y ?cam=).
  const [paused, setPaused] = useState(() => new URLSearchParams(window.location.search).get("pause") === "1");
  const [stepTick, setStepTick] = useState(0);
  const [requestedTab, setRequestedTab] = useState<{ id: string; nonce: number }>({ id: "status", nonce: 0 });
  const [runId, setRunId] = useState(0);
  const [lang] = useLang();
  const es = lang === "es";

  const loop = HAUL_ORDER.map((s) => `${es ? STATE_ES[s] : s} ${HAUL_DURATIONS[s]} s`).join(" → ");

  const dock = (
    <div className="og-hud" style={{ position: "static", display: "flex", gap: 8 }}>
      <button
        type="button"
        className={`og-btn ${paused ? "og-btn--ok" : "og-btn--primary"}`}
        onClick={() => setPaused((p) => !p)}
      >
        {paused ? (es ? "Reanudar ciclo" : "Resume cycle") : es ? "Pausar ciclo" : "Pause cycle"}
      </button>
      <button
        type="button"
        className="og-btn"
        disabled={!paused}
        title={
          paused
            ? es ? "Avanzar 1 s" : "Advance the FSM clock 1 s"
            : es ? "Pausa primero" : "Pause the cycle first, then step"
        }
        onClick={() => setStepTick((n) => n + 1)}
      >
        {es ? "Paso +1 s" : "Step +1 s"}
      </button>
      <button type="button" className="og-btn" onClick={() => setRunId((n) => n + 1)}>
        {es ? "Reiniciar (CARGA)" : "Restart (LOAD)"}
      </button>
    </div>
  );

  const status = (
    <>
      <h2 className="og-h2">{es ? "Ciclo de acarreo" : "Haul cycle"}</h2>
      <ul className="og-plain">
        {HAUL_ORDER.map((s) => {
          const active = s === current;
          const css = HAUL_STATE_CSS[s];
          return (
            <li
              key={s}
              className={`og-card og-card--tone${active ? " og-card--active" : ""}`}
              style={{ ["--tone" as string]: css }}
            >
              <span className="og-dot" style={{ marginRight: 8 }} />
              <strong className="og-num">
                {es ? STATE_ES[s] : s} · {HAUL_DURATIONS[s]} s ·{" "}
                {isMovingState(s) ? (es ? "en movimiento" : "moving") : es ? "detenido" : "stopped"}
              </strong>
              <br />
              <span className="og-muted" style={{ fontSize: 13 }}>
                {es ? HAUL_STATE_BLURB_ES[s] : HAUL_STATE_BLURB[s]}
              </span>
              <br />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isRecalState(s) ? "var(--og-green)" : "var(--og-muted)",
                }}
              >
                {isRecalState(s)
                  ? es ? "Ventana RECAL" : "RECAL window"
                  : es ? "recal bloqueado" : "recal gated"}
              </span>
            </li>
          );
        })}
      </ul>
      <h2 className="og-h2">{es ? "Matriz rojo-STOP vs ambar" : "Red-STOP vs amber-caution matrix"}</h2>
      <p className="og-body">
        <span style={{ color: "var(--og-red)", fontWeight: 700 }}>STOP </span>
        {es
          ? "rojo = detener de inmediato (falla critica, N4). Ambar = precaucion, planificar ventana (N1-N3). RUL suprimido = solo anomalias."
          : "red = stop now (critical fault, N4). Amber = caution, plan a window (N1-N3). Suppressed RUL = anomaly-only."}
      </p>
    </>
  );

  const sheet = (
    <>
      <h2 className="og-h2">{es ? "930E-4SE dimensiones y pesos" : "930E-4SE dimensions & weights"}</h2>
      <p className="og-body og-num">
        {es
          ? `Envolvente del curso ${TRUCK_DIMS_M.L} × ${TRUCK_DIMS_M.W} × ${TRUCK_DIMS_M.H} m; tolva arriba ${TRUCK_DIMS_M.bodyUp} m (el modelo 3D usa el folleto: 15.60 × 8.69 × 7.37 m, tolva arriba 14.02 m). Vacio ${TRUCK_WEIGHTS_KG.empty} kg (del ${TRUCK_WEIGHTS_KG.emptyF} / tras ${TRUCK_WEIGHTS_KG.emptyR}); cargado ${TRUCK_WEIGHTS_KG.loaded} kg (del ${TRUCK_WEIGHTS_KG.loadedF} / tras ${TRUCK_WEIGHTS_KG.loadedR}); util ${TRUCK_WEIGHTS_KG.payload} kg, ${TRUCK_WEIGHTS_KG.volumeM3} m3. Max ${TRUCK_WEIGHTS_KG.maxT} T (10% ${TRUCK_WEIGHTS_KG.maxT}-${TRUCK_WEIGHTS_KG.overloadT} T permitido, nunca sobre ${TRUCK_WEIGHTS_KG.overloadT} T).`
          : `Course envelope ${TRUCK_DIMS_M.L} × ${TRUCK_DIMS_M.W} × ${TRUCK_DIMS_M.H} m; body-up ${TRUCK_DIMS_M.bodyUp} m (the 3D model uses the brochure: 15.60 × 8.69 × 7.37 m, body-up 14.02 m). Empty ${TRUCK_WEIGHTS_KG.empty} kg (F ${TRUCK_WEIGHTS_KG.emptyF} / R ${TRUCK_WEIGHTS_KG.emptyR}); loaded ${TRUCK_WEIGHTS_KG.loaded} kg (F ${TRUCK_WEIGHTS_KG.loadedF} / R ${TRUCK_WEIGHTS_KG.loadedR}); payload ${TRUCK_WEIGHTS_KG.payload} kg, ${TRUCK_WEIGHTS_KG.volumeM3} m3. Max ${TRUCK_WEIGHTS_KG.maxT} T (10% ${TRUCK_WEIGHTS_KG.maxT}-${TRUCK_WEIGHTS_KG.overloadT} T allowed, never above ${TRUCK_WEIGHTS_KG.overloadT} T).`}
      </p>
      <h2 className="og-h2">{es ? "Fluidos (nota de conciliacion)" : "Fluids (reconciliation footnote)"}</h2>
      <p className="og-body">
        {es
          ? "Combustible 5299 L (INCAEX) vs 4542 L utilizable (OM); hidraulico 1324/1325 L; carter QSK78 340 L vs SSDA16V160 280 L; engranajes de propulsion 94 L c/u vs 76 L caja de rueda OM (definicion de compartimiento; se adopta 94 con nota OM). Las variantes difieren por definicion de compartimiento y utilizable vs nominal — ver thesis-annex."
          : "Fuel 5299 L (INCAEX) vs 4542 L usable (OM); hydraulic 1324/1325 L; sump QSK78 340 L vs SSDA16V160 280 L; propulsion gears 94 L each vs OM wheel gearbox 76 L (compartment definition; adopt 94 with OM note). Variants differ by compartment definition and usable vs nominal — see thesis-annex."}
      </p>
      <h2 className="og-h2">{es ? "Tren de potencia" : "Powertrain"}</h2>
      <p className="og-body">
        {es
          ? "QSK78 3500 HP @1900 (3429 volante; nota variante SSDA). GTA-39 AC→DC→AC por inversores/condensadores; soplador 453 m3/min; gabinete PCS/PLM/AID/VHMS/IM; motores MT de induccion AC; rejillas 5400 corto/3300 cont hp 0.7 s; caja del eje + Hydrair II del 12.92/tras 9.40 ±6.5°."
          : "QSK78 3500 HP @1900 (3429 flywheel; SSDA variant note). GTA-39 AC→DC→AC via inverters/condensers; blower 453 m3/min; cabinet PCS/PLM/AID/VHMS/IM; MT AC induction motors; retard grids 5400 short/3300 cont hp 0.7 s; axle box + Hydrair II F12.92/R9.40 ±6.5deg."}
      </p>
      <h2 className="og-h2">{es ? "Frenos y cabina" : "Brakes & cab"}</h2>
      <p className="og-body">
        {es
          ? "Servicio <8 km/h todas las ruedas; bloqueo trasero a baja presion; estacionamiento por resorte/hidraulico trasero solo detenido; emergencia automatica. Cabina: RSC tortuga/liebre + interruptor amarillo, override, parada de emergencia, levante HOLD/FLOAT, VHMS captura+azul, enlace rojo, servicio motor azul, campos PLM. VHMS es solo lectura."
          : "Service <8 km/h all wheels; rear lock at low pressure; spring/hydraulic parking rear stopped-only; emergency auto. Cab: RSC turtle/rabbit + yellow switch, override, e-stop, hoist HOLD/FLOAT, VHMS snapshot+blue, red link, blue engine service, PLM fields. VHMS is read-only."}
      </p>
      <ProvenanceTable lang={lang} />
    </>
  );

  const notes = (
    <>
      <h2 className="og-h2">{es ? "Sobre esta vista" : "About this view"}</h2>
      <p className="og-body">
        {es
          ? `930E-4SE ${TRUCK_DIMS_M.L}×${TRUCK_DIMS_M.W}×${TRUCK_DIMS_M.H} m, tolva arriba ${TRUCK_DIMS_M.bodyUp} m; ciclo ${loop}. Arrastra para orbitar o elige un preajuste de camara (Foso/3/4/Cabina/Lateral/Rueda). Azul = EN MOVIMIENTO, verde = DETENIDO; RECAL solo detenido+nivelado+motor encendido.`
          : `930E-4SE ${TRUCK_DIMS_M.L}×${TRUCK_DIMS_M.W}×${TRUCK_DIMS_M.H} m, body-up ${TRUCK_DIMS_M.bodyUp} m; loop ${loop}. Drag to orbit or pick a camera preset (Pit/3/4/Cab/Side/Wheel). Blue = MOVING, green = REST; RECAL only stopped+leveled+engine-on.`}
      </p>
      <p className="og-body">{t("app.scope", lang)}</p>
      <p className="og-body">{t("truck.honesty", lang)}</p>
      <h2 className="og-h2">{es ? "Vista superior 1-22" : "Top-view callouts 1-22"}</h2>
      <ol className="og-list">
        {TRUCK_CALLOUTS.map((c) => (
          <li key={c.n}>
            <strong>{c.n}.</strong> {es ? c.es : c.en}
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
