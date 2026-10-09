import { useState } from "react";
import TruckScene from "./TruckScene";
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
import { useLang } from "../../i18n";

// Truck view: 930E-4SE fidelity panels (manual-faithful, display only).
// Dimensions 15.29 x 8.89 x 8.10 m, body-up 14.80 m; weights; fluids footnote;
// powertrain; brakes; cab; STOP/caution matrix; callouts 1-22 EN/ES.

export default function TruckView() {
  const [current, setCurrent] = useState<HaulState>("LOAD");
  const [paused, setPaused] = useState(false);
  const [stepTick, setStepTick] = useState(0);
  const [runId, setRunId] = useState(0);
  const [lang] = useLang();

  return (
    <div>
      <p style={{ margin: "0 0 16px", color: "#9fb0c9" }}>
        {lang === "es"
          ? `Sim camion S2 (T4+T5): 930E-4SE ${TRUCK_DIMS_M.L}×${TRUCK_DIMS_M.W}×${TRUCK_DIMS_M.H} m, tolva arriba ${TRUCK_DIMS_M.bodyUp} m; ciclo CARGA 6 s → ACARREO 12 s → DESCARGA 6 s → ESPERA 5 s. 980E-5 (GDY108-C) es futuro sin validar. Arrastra para orbitar o elige preajuste (Foso/Cabina/Lateral/Rueda). Azul = EN MOVIMIENTO, verde = DETENIDO; RECAL solo detenido+nivelado+motor encendido.`
          : `S2 truck sim (T4+T5): 930E-4SE ${TRUCK_DIMS_M.L}×${TRUCK_DIMS_M.W}×${TRUCK_DIMS_M.H} m, body-up ${TRUCK_DIMS_M.bodyUp} m; loop LOAD 6 s → HAUL 12 s → DUMP 6 s → WAIT 5 s. 980E-5 (GDY108-C) is future work without validation. Drag to orbit or pick a preset (Pit/Cab/Side/Wheel). Blue = MOVING, green = REST; RECAL only stopped+leveled+engine-on.`}
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 520px",
            minWidth: 320,
            border: "1px solid #2a3a55",
          }}
        >
          <TruckScene
            key={runId}
            paused={paused}
            stepTick={stepTick}
            onPhase={setCurrent}
          />
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "12px 16px",
              borderTop: "1px solid #2a3a55",
              background: "#111a2c",
            }}
          >
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              style={{
                cursor: "pointer",
                color: paused ? "#0e1420" : "#e8edf5",
                background: paused ? "#2fbf71" : "#f5a623",
                border: "1px solid transparent",
                borderRadius: 6,
                padding: "8px 16px",
                fontWeight: 700,
              }}
            >
              {paused
                ? lang === "es" ? "Reanudar ciclo" : "Resume cycle"
                : lang === "es" ? "Pausar ciclo" : "Pause cycle"}
            </button>
            <button
              type="button"
              disabled={!paused}
              title={
                paused
                  ? lang === "es" ? "Avanzar 1 s" : "Advance the FSM clock 1 s"
                  : lang === "es" ? "Pausa primero" : "Pause the cycle first, then step"
              }
              onClick={() => setStepTick((n) => n + 1)}
              style={{
                cursor: paused ? "pointer" : "not-allowed",
                color: "#e8edf5",
                background: "transparent",
                border: `1px solid ${paused ? "#f5a623" : "#3a4a63"}`,
                borderRadius: 6,
                padding: "8px 16px",
                fontWeight: 600,
                opacity: paused ? 1 : 0.5,
              }}
            >
              Step +1s
            </button>
            <button
              type="button"
              onClick={() => setRunId((n) => n + 1)}
              style={{
                cursor: "pointer",
                color: "#e8edf5",
                background: "transparent",
                border: "1px solid #f5a623",
                borderRadius: 6,
                padding: "8px 16px",
                fontWeight: 600,
              }}
            >
              {lang === "es" ? "Reiniciar (CARGA)" : "Restart (LOAD)"}
            </button>
          </div>
        </div>
        <aside
          style={{
            flex: "1 1 280px",
            minWidth: 260,
            maxWidth: 420,
            border: "1px solid #2a3a55",
            padding: 16,
            background: "#111a2c",
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            {lang === "es" ? "Ciclo de acarreo" : "Haul cycle"}
          </h2>
          <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0 }}>
            {HAUL_ORDER.map((s) => {
              const active = s === current;
              const css = HAUL_STATE_CSS[s];
              return (
                <li
                  key={s}
                  style={{
                    marginBottom: 8,
                    border: `1px solid ${active ? css : "#2a3a55"}`,
                    borderRadius: 6,
                    padding: "8px 10px",
                    background: active ? "#1b2946" : "transparent",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: css,
                      marginRight: 8,
                    }}
                  />
                  <strong>
                    {s} · {HAUL_DURATIONS[s]} s ·{" "}
                    {isMovingState(s)
                      ? lang === "es" ? "en movimiento" : "moving"
                      : lang === "es" ? "detenido" : "stopped"}
                  </strong>
                  <br />
                  <span style={{ color: "#9fb0c9", fontSize: 13 }}>
                    {lang === "es" ? HAUL_STATE_BLURB_ES[s] : HAUL_STATE_BLURB[s]}
                  </span>
                  <br />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isRecalState(s) ? "#2fbf71" : "#8b98ad",
                    }}
                  >
                    {isRecalState(s)
                      ? lang === "es" ? "Ventana RECAL" : "RECAL window"
                      : lang === "es" ? "recal bloqueado" : "recal gated"}
                  </span>
                </li>
              );
            })}
          </ul>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            {lang === "es" ? "930E-4SE dimensiones y pesos" : "930E-4SE dimensions & weights"}
          </h2>
          <p style={{ margin: "0 0 12px", color: "#c7d3e8", fontSize: 13 }}>
            {lang === "es"
              ? `Dimensiones ${TRUCK_DIMS_M.L} × ${TRUCK_DIMS_M.W} × ${TRUCK_DIMS_M.H} m; tolva arriba ${TRUCK_DIMS_M.bodyUp} m. Vacio ${TRUCK_WEIGHTS_KG.empty} kg (del ${TRUCK_WEIGHTS_KG.emptyF} / tras ${TRUCK_WEIGHTS_KG.emptyR}); cargado ${TRUCK_WEIGHTS_KG.loaded} kg (del ${TRUCK_WEIGHTS_KG.loadedF} / tras ${TRUCK_WEIGHTS_KG.loadedR}); util ${TRUCK_WEIGHTS_KG.payload} kg, ${TRUCK_WEIGHTS_KG.volumeM3} m3. Max ${TRUCK_WEIGHTS_KG.maxT} T (10% ${TRUCK_WEIGHTS_KG.maxT}-${TRUCK_WEIGHTS_KG.overloadT} T permitido, nunca sobre ${TRUCK_WEIGHTS_KG.overloadT} T).`
              : `Envelope ${TRUCK_DIMS_M.L} × ${TRUCK_DIMS_M.W} × ${TRUCK_DIMS_M.H} m; body-up ${TRUCK_DIMS_M.bodyUp} m. Empty ${TRUCK_WEIGHTS_KG.empty} kg (F ${TRUCK_WEIGHTS_KG.emptyF} / R ${TRUCK_WEIGHTS_KG.emptyR}); loaded ${TRUCK_WEIGHTS_KG.loaded} kg (F ${TRUCK_WEIGHTS_KG.loadedF} / R ${TRUCK_WEIGHTS_KG.loadedR}); payload ${TRUCK_WEIGHTS_KG.payload} kg, ${TRUCK_WEIGHTS_KG.volumeM3} m3. Max ${TRUCK_WEIGHTS_KG.maxT} T (10% ${TRUCK_WEIGHTS_KG.maxT}-${TRUCK_WEIGHTS_KG.overloadT} T allowed, never above ${TRUCK_WEIGHTS_KG.overloadT} T).`}
          </p>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            {lang === "es" ? "Fluidos (nota de conciliacion)" : "Fluids (reconciliation footnote)"}
          </h2>
          <p style={{ margin: "0 0 12px", color: "#9fb0c9", fontSize: 13 }}>
            {lang === "es"
              ? "Combustible 5299 L (INCAEX) vs 4542 L utilizable (OM); hidraulico 1324/1325 L; carter QSK78 340 L vs SSDA16V160 280 L; engranajes de propulsion 94 L c/u vs 76 L caja de rueda OM (definicion de compartimiento; se adopta 94 con nota OM). Las variantes difieren por definicion de compartimiento y utilizable vs nominal — ver thesis-annex."
              : "Fuel 5299 L (INCAEX) vs 4542 L usable (OM); hydraulic 1324/1325 L; sump QSK78 340 L vs SSDA16V160 280 L; propulsion gears 94 L each vs OM wheel gearbox 76 L (compartment definition; adopt 94 with OM note). Variants differ by compartment definition and usable vs nominal — see thesis-annex."}
          </p>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            {lang === "es" ? "Tren de potencia" : "Powertrain"}
          </h2>
          <p style={{ margin: "0 0 12px", color: "#c7d3e8", fontSize: 13 }}>
            {lang === "es"
              ? "QSK78 3500 HP @1900 (3429 volante; nota variante SSDA). GTA-39 AC→DC→AC por inversores/condensadores; soplador 453 m3/min; gabinete PCS/PLM/AID/VHMS/IM; motores MT de induccion AC; rejillas 5400 corto/3300 cont hp 0.7 s; caja del eje + Hydrair II del 12.92/tras 9.40 ±6.5°."
              : "QSK78 3500 HP @1900 (3429 flywheel; SSDA variant note). GTA-39 AC→DC→AC via inverters/condensers; blower 453 m3/min; cabinet PCS/PLM/AID/VHMS/IM; MT AC induction motors; retard grids 5400 short/3300 cont hp 0.7 s; axle box + Hydrair II F12.92/R9.40 ±6.5deg."}
          </p>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            {lang === "es" ? "Frenos y cabina" : "Brakes & cab"}
          </h2>
          <p style={{ margin: "0 0 12px", color: "#c7d3e8", fontSize: 13 }}>
            {lang === "es"
              ? "Servicio <8 km/h todas las ruedas; bloqueo trasero a baja presion; estacionamiento por resorte/hidraulico trasero solo detenido; emergencia automatica. Cabina: RSC tortuga/liebre + interruptor amarillo, override, parada de emergencia, levante HOLD/FLOAT, VHMS captura+azul, enlace rojo, servicio motor azul, campos PLM. VHMS es solo lectura."
              : "Service <8 km/h all wheels; rear lock at low pressure; spring/hydraulic parking rear stopped-only; emergency auto. Cab: RSC turtle/rabbit + yellow switch, override, e-stop, hoist HOLD/FLOAT, VHMS snapshot+blue, red link, blue engine service, PLM fields. VHMS is read-only."}
          </p>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            {lang === "es" ? "Matriz rojo-STOP vs ambar" : "Red-STOP vs amber-caution matrix"}
          </h2>
          <p style={{ margin: "0 0 12px", color: "#c7d3e8", fontSize: 13 }}>
            <span style={{ color: "#ff3b30", fontWeight: 700 }}>STOP </span>
            {lang === "es"
              ? "rojo = detener de inmediato (falla critica, N4). Ambar = precaucion, planificar ventana (N1-N3). RUL suprimido = solo anomalias."
              : "red = stop now (critical fault, N4). Amber = caution, plan a window (N1-N3). Suppressed RUL = anomaly-only."}
          </p>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            {lang === "es" ? "Vista superior 1-22" : "Top-view callouts 1-22"}
          </h2>
          <ol style={{ margin: "0 0 12px", paddingLeft: 20, color: "#c7d3e8", fontSize: 13 }}>
            {TRUCK_CALLOUTS.map((c) => (
              <li key={c.n} style={{ marginBottom: 2 }}>
                <strong>{c.n}.</strong> {lang === "es" ? c.es : c.en}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
