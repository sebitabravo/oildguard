import { useEffect, useState } from "react";
import BenchScene, { type BenchMode } from "./BenchScene";
import {
  BENCH_SENSORS,
  ENV_NOTE,
  ENV_NOTE_ES,
  GDY106_CHAIN_EN,
  GDY106_CHAIN_ES,
  NO_DRILL_NARRATIVE,
  NO_DRILL_NARRATIVE_ES,
  OIL_DUCT_NARRATIVE,
  OIL_DUCT_NARRATIVE_ES,
} from "./sensors";
import {
  formatOilText,
  oilCssFor,
  oilStateFor,
  oilStateLabel,
} from "./oil";
import {
  VISC_MAX,
  VISC_MIN,
  VISC_NOMINAL,
  estimateSettlingMs,
  viscosityLabel,
} from "./settling";
import { DEMO_OIL_EVENT, parseDemoOil } from "../../dash/demoBus";
import { useLang } from "../../i18n";

// Bench view: cutaway GDY106 chain + oil volume + settling + inspection Steps 1-11.
// Manual-faithful (user-supplied manuals, authoritative over placeholders).
// Labels show EN/ES + manual item numbers.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface InspStep {
  n: number;
  en: string;
  es: string;
}

export const INSPECTION_STEPS: InspStep[] = [
  { n: 1, en: "Park level, 20 min settle, engine off; confirm OM decal level rule.", es: "Estacionar nivelado, asentar 20 min, motor apagado; confirmar regla de nivel de la calcomania OM." },
  { n: 2, en: "Drain-plug port item 56 at 6 o'clock: fit new 12 in hose each time, sample every 250 h.", es: "Puerto item 56 a las 6 en punto: usar manguera nueva de 12 pulg cada vez, muestrear cada 250 h." },
  { n: 3, en: "Magnetic plug item 41: classify Normal (soft ring paste) / Flaky (bearing-cup laminar) / Pasty (chunk disintegration = last warning).", es: "Tapon magnetico item 41: clasificar Normal (pasta anular blanda) / Escamoso (laminar de taza) / Pastoso (desintegracion = ultimo aviso)." },
  { n: 4, en: "Plug map 1-8 + planetaries 1-4: record position of every chip.", es: "Mapa de tapones 1-8 + planetarios 1-4: registrar la posicion de cada particula." },
  { n: 5, en: "Washer N/P 1489: nominal 0.869 in, condemn at <= 0.824 in.", es: "Arandela N/P 1489: nominal 0.869 pulg, condenar si <= 0.824 pulg." },
  { n: 6, en: "Inner washer GE1309: nominal 0.558 in, replace at <= 0.513 in.", es: "Arandela interior GE1309: nominal 0.558 pulg, reemplazar si <= 0.513 pulg." },
  { n: 7, en: "Final axial play 0.100-0.125 in; grooves-visible rule holds.", es: "Juego axial final 0.100-0.125 pulg; aplica la regla de surcos visibles." },
  { n: 8, en: "Level correct if oil visible at port + 20 min level-ground rule.", es: "Nivel correcto si hay aceite visible + regla de 20 min en terreno nivelado." },
  { n: 9, en: "ISO 4406 target 18/13 (>5 um 130k-250k / >15 um 4k-8k per 100 ml); micro-filter oil above 50 C until 18/13.", es: "Meta ISO 4406 18/13 (>5 um 130k-250k / >15 um 4k-8k por 100 ml); microfiltrar sobre 50 C hasta 18/13." },
  { n: 10, en: "Spectrometry limits: Fe 200/233, Cu 24/35, Cr 3/3, Ni 3/3, Ca 30/50+P check, Zn 40/50, P-hyd 200/250; watch rate-of-change. Cu = cage/axial wear, Cr = platinated-flake bearings, Ca+P = hydraulic crossover.", es: "Limites espectrometria: Fe 200/233, Cu 24/35, Cr 3/3, Ni 3/3, Ca 30/50+revision P, Zn 40/50, P-hid 200/250; vigilar tasa de cambio. Cu = jaula/axial, Cr = rodamientos de hojuela platinada, Ca+P = cruce hidraulico." },
  { n: 11, en: "Commissioning samples 20/50/100/250/500/750/1000 h; missing windows affects warranty.", es: "Muestras de puesta en marcha 20/50/100/250/500/750/1000 h; omitir ventanas afecta la garantia." },
];

export default function BenchView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [oilPct, setOilPct] = useState(70);
  const [viscosity, setViscosity] = useState(VISC_NOMINAL);
  const [mode, setMode] = useState<BenchMode>("rest");
  const [cutaway, setCutaway] = useState(true);
  const [lang] = useLang();

  useEffect(() => {
    const onDemoOil = (e: Event) => {
      const detail = parseDemoOil(e);
      if (detail) setOilPct(Math.round(detail.frac * 100));
    };
    window.addEventListener(DEMO_OIL_EVENT, onDemoOil);
    return () => window.removeEventListener(DEMO_OIL_EVENT, onDemoOil);
  }, []);

  const frac = clamp01(oilPct / 100);
  const oilState = oilStateFor(frac);
  const oilCss = oilCssFor(oilState);
  const settlingMs = estimateSettlingMs(viscosity);
  const resting = mode === "rest";
  const chain = lang === "es" ? GDY106_CHAIN_ES : GDY106_CHAIN_EN;

  return (
    <div>
      <p style={{ margin: "0 0 16px", color: "#9fb0c9" }}>
        {lang === "es"
          ? "Banco S1 (T3): cadena GDY106 Fig.95 GEK-91680A — motor AC → eje → portador alta → pinon solar GE1288 → portador baja/planetarios → tubo torsion → maza en rodillos conicos → neumaticos; frenos humedos + estacionamiento por resorte. Arrastra para orbitar, haz clic en un marcador (items 56/41/39-36/cable). Deten el banco y observa el asentamiento antes de la ventana de recalibracion. Ver docs/inspection.md (pasos 1-11)."
          : "S1 bench rig (T3): GDY106 Fig.95 GEK-91680A chain — AC motor → shaft → high-speed carrier → sun pinion GE1288 → low-speed carrier/planetaries → torque tube → hub on tapered rollers → tires; wet brakes + spring parking brake. Drag to orbit, click a marker (items 56/41/39-36/cable). Stop the rig and watch settling into the recalibration window. See docs/inspection.md (Steps 1-11)."}
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 520px",
            minWidth: 320,
            border: "1px solid #2a3a55",
          }}
        >
          <BenchScene
            selectedId={selectedId}
            onSelect={setSelectedId}
            oilLevel={frac}
            viscosityProxy={viscosity}
            mode={mode}
            cutaway={cutaway}
          />
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              padding: "12px 16px",
              borderTop: "1px solid #2a3a55",
              background: "#111a2c",
            }}
          >
            <label style={{ flex: "1 1 200px", fontSize: 13, color: "#c7d3e8" }}>
              {lang === "es" ? "Aceite" : "Oil fill"}: {formatOilText(frac)}
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={oilPct}
                aria-label={lang === "es" ? "Nivel de aceite" : "Oil fill"}
                onChange={(e) => setOilPct(Number(e.target.value))}
                style={{ width: "100%", accentColor: oilCss }}
              />
            </label>
            <label style={{ flex: "1 1 200px", fontSize: 13, color: "#c7d3e8" }}>
              {lang === "es" ? "Proxy viscosidad" : "Viscosity proxy"}: {viscosity.toFixed(2)} ({viscosityLabel(viscosity)})
              <input
                type="range"
                min={VISC_MIN}
                max={VISC_MAX}
                step={0.05}
                value={viscosity}
                aria-label="Viscosity proxy"
                onChange={(e) => setViscosity(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#f5a623" }}
              />
            </label>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                paddingBottom: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setMode(resting ? "move" : "rest")}
                style={{
                  cursor: "pointer",
                  color: resting ? "#0e1420" : "#e8edf5",
                  background: resting ? "#2fbf71" : "#f5a623",
                  border: "1px solid transparent",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontWeight: 700,
                }}
              >
                {resting
                  ? lang === "es" ? "Detenido — iniciar marcha" : "Resting — start Move"
                  : lang === "es" ? "En marcha — detener" : "Moving — stop to Rest"}
              </button>
              <label
                style={{
                  fontSize: 13,
                  color: "#c7d3e8",
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  paddingBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={cutaway}
                  onChange={(e) => setCutaway(e.target.checked)}
                />
                {lang === "es" ? "Corte" : "Cutaway"}
              </label>
            </div>
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
            {lang === "es" ? "Lectura de aceite" : "Oil readout"}
          </h2>
          <div
            style={{
              border: `1px solid ${oilCss}`,
              borderRadius: 6,
              padding: "10px 12px",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: oilCss }}>
              {formatOilText(frac)}
            </div>
            <div style={{ fontSize: 13, color: "#c7d3e8", marginTop: 4 }}>
              {oilStateLabel(oilState, lang)} · 95 L reference
            </div>
            <div style={{ fontSize: 13, color: "#c7d3e8", marginTop: 4 }}>
              {lang === "es" ? "Asentamiento ≈" : "Settling ≈"} {settlingMs} ms · {lang === "es" ? "proxy" : "viscosity proxy"}{" "}
              {viscosity.toFixed(2)} ({viscosityLabel(viscosity)})
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginTop: 4,
                color: resting ? "#2fbf71" : "#8b98ad",
              }}
            >
              {resting
                ? lang === "es"
                  ? "RECALIBRANDO (detenido+nivelado+motor encendido)"
                  : "RECALIBRATING (stopped+leveled+engine-on)"
                : lang === "es"
                  ? "En movimiento — recalibracion bloqueada"
                  : "Moving — recalibration gated"}
            </div>
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            {lang === "es" ? "Cadena GDY106 Fig.95 (GEK-91680A)" : "GDY106 Fig.95 chain (GEK-91680A)"}
          </h2>
          <ol style={{ margin: "0 0 12px", paddingLeft: 20, color: "#c7d3e8", fontSize: 13 }}>
            {chain.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
          <p style={{ margin: "0 0 12px", color: "#9fb0c9", fontSize: 13 }}>
            {lang === "es" ? OIL_DUCT_NARRATIVE_ES : OIL_DUCT_NARRATIVE}
          </p>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            {lang === "es" ? "Sensores (sin perforar + items)" : "Sensor markers (no-drill + items)"}
          </h2>
          <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0 }}>
            {BENCH_SENSORS.map((sensor) => {
              const active = sensor.id === selectedId;
              return (
                <li key={sensor.id} style={{ marginBottom: 10 }}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedId(active ? null : sensor.id)
                    }
                    style={{
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                      color: "#e8edf5",
                      background: active ? "#1b2946" : "transparent",
                      border: `1px solid ${
                        active ? sensor.cssColor : "#2a3a55"
                      }`,
                      borderRadius: 6,
                      padding: "8px 10px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: sensor.cssColor,
                        marginRight: 8,
                      }}
                    />
                    <strong>{lang === "es" ? sensor.labelEs : sensor.label}</strong>
                    <br />
                    <span style={{ color: "#9fb0c9", fontSize: 13 }}>
                      {lang === "es" ? sensor.signalEs : sensor.signal}
                    </span>
                    <br />
                    <span style={{ color: "#c7d3e8", fontSize: 13 }}>
                      {lang === "es" ? sensor.mountEs : sensor.mount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            {lang === "es" ? "Inspeccion pasos 1-11" : "Inspection Steps 1-11"}
          </h2>
          <ol style={{ margin: "0 0 12px", paddingLeft: 20, color: "#c7d3e8", fontSize: 13 }}>
            {INSPECTION_STEPS.map((s) => (
              <li key={s.n} style={{ marginBottom: 6 }}>
                <strong>Step {s.n} / Paso {s.n}:</strong> {lang === "es" ? s.es : s.en}
              </li>
            ))}
          </ol>
          <p style={{ margin: "0 0 12px", color: "#c7d3e8", fontSize: 13 }}>
            {lang === "es" ? NO_DRILL_NARRATIVE_ES : NO_DRILL_NARRATIVE}
          </p>
          <p
            style={{
              margin: 0,
              color: "#9fb0c9",
              fontSize: 13,
              borderTop: "1px solid #2a3a55",
              paddingTop: 12,
            }}
          >
            {lang === "es" ? ENV_NOTE_ES : ENV_NOTE}
          </p>
        </aside>
      </div>
    </div>
  );
}
