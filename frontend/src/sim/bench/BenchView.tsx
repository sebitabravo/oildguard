import { useEffect, useState } from "preact/hooks";
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
import { t, useLang } from "../../i18n";
import Drawer from "../../ui/Drawer";
import HonestyBadge from "../../ui/HonestyBadge";

// Vista Rueda GDY106: corte 3D en el visor; el detalle (lectura de aceite,
// sensores, cadena, inspección pasos 1-11) vive en el panel lateral.
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
  const es = lang === "es";

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
  const chain = es ? GDY106_CHAIN_ES : GDY106_CHAIN_EN;

  const dock = (
    <div
      className="og-hud"
      style={{ position: "static", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}
    >
      <label className="og-field">
        <span className="og-field__label">
          <span>{es ? "Aceite" : "Oil fill"}</span>
          <span className="og-num" style={{ color: oilCss }}>{formatOilText(frac)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={oilPct}
          aria-label={es ? "Nivel de aceite" : "Oil fill"}
          onChange={(e) => setOilPct(Number(e.currentTarget.value))}
        />
      </label>
      <label className="og-field">
        <span className="og-field__label">
          <span>{es ? "Proxy viscosidad" : "Viscosity proxy"}</span>
          <span className="og-num">{viscosity.toFixed(2)} ({viscosityLabel(viscosity)})</span>
        </span>
        <input
          type="range"
          min={VISC_MIN}
          max={VISC_MAX}
          step={0.05}
          value={viscosity}
          aria-label={es ? "Proxy de viscosidad" : "Viscosity proxy"}
          onChange={(e) => setViscosity(Number(e.currentTarget.value))}
        />
      </label>
      <button
        type="button"
        className={`og-btn ${resting ? "og-btn--ok" : "og-btn--primary"}`}
        onClick={() => setMode(resting ? "move" : "rest")}
      >
        {resting
          ? es ? "Detenido — iniciar marcha" : "Resting — start Move"
          : es ? "En marcha — detener" : "Moving — stop to Rest"}
      </button>
      <label className="og-check">
        <input
          type="checkbox"
          checked={cutaway}
          onChange={(e) => setCutaway(e.currentTarget.checked)}
        />
        {es ? "Corte" : "Cutaway"}
      </label>
    </div>
  );

  const status = (
    <>
      <h2 className="og-h2">{es ? "Lectura de aceite" : "Oil readout"}</h2>
      <div className="og-card og-card--tone" style={{ ["--tone" as string]: oilCss }}>
        <div className="og-value og-value--lg" style={{ color: oilCss }}>
          {formatOilText(frac)}
        </div>
        <div className="og-body og-num" style={{ margin: "4px 0 0" }}>
          {oilStateLabel(oilState, lang)} · 95 L reference
        </div>
        <div className="og-body og-num" style={{ margin: "4px 0 0" }}>
          {es ? "Asentamiento ≈" : "Settling ≈"} {settlingMs} ms · {es ? "proxy" : "viscosity proxy"}{" "}
          {viscosity.toFixed(2)} ({viscosityLabel(viscosity)})
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            marginTop: 6,
            color: resting ? "var(--og-green)" : "var(--og-muted)",
          }}
        >
          {resting
            ? t("hud.recal", lang)
            : es ? "En movimiento — recalibracion bloqueada" : "Moving — recalibration gated"}
        </div>
      </div>
      <h2 className="og-h2">{es ? "Sensores (sin perforar + items)" : "Sensor markers (no-drill + items)"}</h2>
      <ul className="og-plain">
        {BENCH_SENSORS.map((sensor) => {
          const active = sensor.id === selectedId;
          return (
            <li key={sensor.id} style={{ marginBottom: 8 }}>
              <button
                type="button"
                className={`og-card og-card--tone${active ? " og-card--active" : ""}`}
                style={{ ["--tone" as string]: active ? sensor.cssColor : undefined }}
                aria-pressed={active}
                onClick={() => setSelectedId(active ? null : sensor.id)}
              >
                <span className="og-dot" style={{ ["--tone" as string]: sensor.cssColor, marginRight: 8 }} />
                <strong>{es ? sensor.labelEs : sensor.label}</strong>
                <br />
                <span className="og-muted" style={{ fontSize: 13 }}>
                  {es ? sensor.signalEs : sensor.signal}
                </span>
                <br />
                <span style={{ color: "var(--og-body)", fontSize: 13 }}>
                  {es ? sensor.mountEs : sensor.mount}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );

  const sheet = (
    <>
      <h2 className="og-h2">{es ? "Cadena GDY106 Fig.95 (GEK-91680A)" : "GDY106 Fig.95 chain (GEK-91680A)"}</h2>
      <ol className="og-list">
        {chain.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ol>
      <p className="og-body og-muted">{es ? OIL_DUCT_NARRATIVE_ES : OIL_DUCT_NARRATIVE}</p>
      <p className="og-body">{es ? NO_DRILL_NARRATIVE_ES : NO_DRILL_NARRATIVE}</p>
    </>
  );

  const notes = (
    <>
      <h2 className="og-h2">{es ? "Sobre esta vista" : "About this view"}</h2>
      <p className="og-body">
        {es
          ? "Cadena GDY106 Fig.95 GEK-91680A — motor AC → eje → portador alta → pinon solar GE1288 → portador baja/planetarios → tubo torsion → maza en rodillos conicos → neumaticos; frenos humedos + estacionamiento por resorte. Arrastra para orbitar, haz clic en un marcador (items 56/41/39-36/cable). Deten el banco y observa el asentamiento antes de la ventana de recalibracion. Ver docs/inspection.md (pasos 1-11)."
          : "GDY106 Fig.95 GEK-91680A chain — AC motor → shaft → high-speed carrier → sun pinion GE1288 → low-speed carrier/planetaries → torque tube → hub on tapered rollers → tires; wet brakes + spring parking brake. Drag to orbit, click a marker (items 56/41/39-36/cable). Stop the rig and watch settling into the recalibration window. See docs/inspection.md (Steps 1-11)."}
      </p>
      <p className="og-body">{t("app.scope", lang)}</p>
      <p className="og-body">{t("bench.honesty", lang)}</p>
      <h2 className="og-h2">{es ? "Inspeccion pasos 1-11" : "Inspection Steps 1-11"}</h2>
      <ol className="og-list">
        {INSPECTION_STEPS.map((s) => (
          <li key={s.n}>
            <strong>Step {s.n} / Paso {s.n}:</strong> {es ? s.es : s.en}
          </li>
        ))}
      </ol>
      <p className="og-note">{es ? ENV_NOTE_ES : ENV_NOTE}</p>
    </>
  );

  return (
    <div className="og-view">
      <div className="og-viewport">
        <BenchScene
          selectedId={selectedId}
          onSelect={setSelectedId}
          oilLevel={frac}
          viscosityProxy={viscosity}
          mode={mode}
          cutaway={cutaway}
          dock={dock}
          badge={<HonestyBadge label={t("badge.proxy", lang)} text={t("bench.honesty", lang)} />}
        />
      </div>
      <Drawer
        tabs={[
          { id: "status", label: t("drawer.status", lang), content: status },
          { id: "sheet", label: t("drawer.sheet", lang), content: sheet },
          { id: "notes", label: t("drawer.notes", lang), content: notes },
        ]}
      />
    </div>
  );
}
