import { useState } from "preact/hooks";
import TruckScene from "./TruckScene";
import { HAUL_STATE_CSS, TRUCK_CALLOUTS, TRUCK_DIMS_M, TRUCK_WEIGHTS_KG } from "./cycle";
import { PLM_ORDER, type PlmState } from "../../twin/fleet/fleetSim";
import { t, useLang } from "../../i18n";
import Drawer from "../../ui/Drawer";
import HonestyBadge from "../../ui/HonestyBadge";
import ProvenanceTable from "./ProvenanceTable";
import { resetFleetStore } from "./mineWorld";

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
  const es = lang === "es";

  const plmLabels: Record<PlmState, string> = es
    ? { tare_zone: "Zona de tara", empty: "Vacío", loading: "Cargando", maneuvering: "Maniobrando", final_zone: "Zona final", hauling: "Acarreando", dumping: "Vaciando", after_dump: "Post-vaciado" }
    : { tare_zone: "Tare zone", empty: "Empty", loading: "Loading", maneuvering: "Maneuvering", final_zone: "Final zone", hauling: "Hauling", dumping: "Dumping", after_dump: "After dump" };

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
      <button type="button" className="og-btn" onClick={() => { resetFleetStore(); setRunId((n) => n + 1); }}>
        {t("truck.restart", lang)}
      </button>
      <a
        className="og-btn"
        href="/wheel?from=mine&truck=930E-4SE&wheel=RH&sensor=pressure&oil=66.5&mode=rest&cutaway=1"
      >
        {es ? "Abrir rueda GDY106" : "Open GDY106 wheel"}
      </a>
    </div>
  );

  const status = (
    <>
      <h2 className="og-h2">{es ? "Payload Meter III" : "Payload Meter III"}</h2>
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
                {plmLabels[s]} · {s}
              </strong>
              <br />
              <span className="og-muted" style={{ fontSize: 13 }}>
                {es ? "Estado estimado por la FSM PLM III del modelo sintético." : "State estimated by the synthetic PLM III state machine."}
              </span>
            </li>
          );
        })}
      </ul>
      <h2 className="og-h2">{es ? "Matriz de detención y precaución" : "Red-STOP vs amber-caution matrix"}</h2>
      <p className="og-body">
        <span style={{ color: "var(--og-red)", fontWeight: 700 }}>STOP </span>
        {es
          ? "Rojo = detener de inmediato (falla crítica, N4). Ámbar = precaución; planificar una ventana (N1-N3). RUL suprimido = solo anomalías."
          : "red = stop now (critical fault, N4). Amber = caution, plan a window (N1-N3). Suppressed RUL = anomaly-only."}
      </p>
    </>
  );

  const sheet = (
    <>
      <h2 className="og-h2">{es ? "930E-4SE: dimensiones y pesos" : "930E-4SE dimensions & weights"}</h2>
      <p className="og-body og-num">
        {es
          ? `Envolvente del curso: ${TRUCK_DIMS_M.L} × ${TRUCK_DIMS_M.W} × ${TRUCK_DIMS_M.H} m; altura con tolva elevada: ${TRUCK_DIMS_M.bodyUp} m (el modelo 3D usa el folleto: 15.60 × 8.69 × 7.37 m, altura con tolva elevada: 14.02 m). Vacío: ${TRUCK_WEIGHTS_KG.empty} kg (delantero ${TRUCK_WEIGHTS_KG.emptyF} / trasero ${TRUCK_WEIGHTS_KG.emptyR}); cargado: ${TRUCK_WEIGHTS_KG.loaded} kg (delantero ${TRUCK_WEIGHTS_KG.loadedF} / trasero ${TRUCK_WEIGHTS_KG.loadedR}); carga útil: ${TRUCK_WEIGHTS_KG.payload} kg, ${TRUCK_WEIGHTS_KG.volumeM3} m³. Máximo: ${TRUCK_WEIGHTS_KG.maxT} t (10 % ${TRUCK_WEIGHTS_KG.maxT}-${TRUCK_WEIGHTS_KG.overloadT} t permitido; nunca superar ${TRUCK_WEIGHTS_KG.overloadT} t).`
          : `Course envelope ${TRUCK_DIMS_M.L} × ${TRUCK_DIMS_M.W} × ${TRUCK_DIMS_M.H} m; body-up ${TRUCK_DIMS_M.bodyUp} m (the 3D model uses the brochure: 15.60 × 8.69 × 7.37 m, body-up 14.02 m). Empty ${TRUCK_WEIGHTS_KG.empty} kg (F ${TRUCK_WEIGHTS_KG.emptyF} / R ${TRUCK_WEIGHTS_KG.emptyR}); loaded ${TRUCK_WEIGHTS_KG.loaded} kg (F ${TRUCK_WEIGHTS_KG.loadedF} / R ${TRUCK_WEIGHTS_KG.loadedR}); payload ${TRUCK_WEIGHTS_KG.payload} kg, ${TRUCK_WEIGHTS_KG.volumeM3} m3. Max ${TRUCK_WEIGHTS_KG.maxT} T (10% ${TRUCK_WEIGHTS_KG.maxT}-${TRUCK_WEIGHTS_KG.overloadT} T allowed, never above ${TRUCK_WEIGHTS_KG.overloadT} T).`}
      </p>
      <h2 className="og-h2">{es ? "Fluidos (nota de conciliación)" : "Fluids (reconciliation footnote)"}</h2>
      <p className="og-body">
        {es
          ? "Combustible: 5299 L (INCAEX) vs. 4542 L utilizables (OM); hidráulico: 1324/1325 L; cárter QSK78: 340 L vs. SSDA16V160: 280 L; engranajes de propulsión: 94 L c/u vs. 76 L de la caja de rueda OM (definición del compartimiento; se adoptan 94 L con la nota OM). Las variantes difieren por definición del compartimiento y por capacidad utilizable frente a nominal; ver thesis-annex."
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
          ? "Frenado de servicio <8 km/h en todas las ruedas; bloqueo trasero a baja presión; freno de estacionamiento trasero por resorte/hidráulico, solo con el camión detenido; freno de emergencia automático. Cabina: RSC tortuga/liebre + interruptor amarillo, anulación, parada de emergencia, levante HOLD/FLOAT, captura VHMS + indicador azul, enlace rojo, servicio del motor azul y campos PLM. VHMS es de solo lectura."
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
          ? `930E-4SE ${TRUCK_DIMS_M.L}×${TRUCK_DIMS_M.W}×${TRUCK_DIMS_M.H} m, tolva arriba ${TRUCK_DIMS_M.bodyUp} m; FSM PLM III de ocho estados. Arrastra para orbitar o elige un preajuste (Foso/3/4/Cabina/Lateral/Rueda/Pala/Chancadora/Rampa). RECAL solo detenido+nivelado+motor encendido.`
          : `930E-4SE ${TRUCK_DIMS_M.L}×${TRUCK_DIMS_M.W}×${TRUCK_DIMS_M.H} m, body-up ${TRUCK_DIMS_M.bodyUp} m; eight-state PLM III FSM. Drag to orbit or use Pit/3/4/Cab/Side/Wheel/Shovel/Crusher/Ramp. RECAL requires stopped+level+engine-on.`}
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
