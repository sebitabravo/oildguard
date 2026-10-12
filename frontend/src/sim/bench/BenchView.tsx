import { useEffect, useRef, useState } from "preact/hooks";
import BenchScene, { type BenchMode } from "./BenchScene";
import { BENCH_SENSORS } from "./sensors";
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
import { CAPACITY_L } from "../../twin/physics";
import { parseWheelUrl } from "./wheelUrl";
import { buildGearRatioDisplay } from "./gearRatioDisplay";
import { t, type DictKey } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import Drawer from "../../ui/Drawer";
import HonestyBadge from "../../ui/HonestyBadge";
import { ProvenanceTag } from "../../ui/foundation";
import { detectWebGL } from "../../ui/webgl";
import { mountReferenceTruck, REFERENCE_TRUCK_ATTRIBUTION } from "../../twin/render/reference-truck";

// Vista Rueda GDY106: corte 3D en el visor; el detalle (lectura de aceite,
// sensores, cadena, inspección pasos 1-11) vive en el panel lateral.
// Manual-faithful (user-supplied manuals, authoritative over placeholders).
// Labels show EN/ES + manual item numbers.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface InspStep {
  n: number;
}

export const INSPECTION_STEPS: InspStep[] = Array.from({ length: 11 }, (_, index) => ({ n: index + 1 }));

export function BenchOilSourceBadge() {
  return <ProvenanceTag value="DEMO" />;
}

const GDY106_CHAIN_PARTS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export default function BenchView() {
  const [webglAvailable, setWebglAvailable] = useState(detectWebGL);
  const [referenceTruckState, setReferenceTruckState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const referenceTruckContainer = useRef<HTMLDivElement>(null);
  const referenceTruckRequested = referenceTruckState === "loading" || referenceTruckState === "loaded";
  const [initial] = useState(() => parseWheelUrl(window.location.search));
  const [selectedId, setSelectedId] = useState<string | null>(initial.sensorId);
  const [oilPct, setOilPct] = useState(Math.round((initial.oilLitres / CAPACITY_L) * 100));
  const [viscosity, setViscosity] = useState(VISC_NOMINAL);
  const [mode, setMode] = useState<BenchMode>(initial.mode);
  const [cutaway, setCutaway] = useState(initial.cutaway);
  const [exploded, setExploded] = useState(initial.exploded);
  const onWebGLUnavailable = () => setWebglAvailable(false);
  const gearRatioDisplay = buildGearRatioDisplay();

  useEffect(() => {
    if (!referenceTruckRequested) return;
    const container = referenceTruckContainer.current;
    if (!container) return;
    try {
      return mountReferenceTruck(
        container,
        () => setReferenceTruckState("loaded"),
        () => setReferenceTruckState("error"),
      );
    } catch {
      setReferenceTruckState("error");
    }
  }, [referenceTruckRequested]);

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
  const oilLitresText = formatNumber(frac * CAPACITY_L, 1);
  const oilValueText = t("bench.field.oilValueText", {
    litres: oilLitresText,
    percent: formatNumber(oilPct, 0),
  });
  const viscosityValue = formatNumber(viscosity, 2);
  const viscosityStateKey = viscosity < 0.8
    ? "bench.viscosity.state.dilute"
    : viscosity < 1.5
      ? "bench.viscosity.state.nominal"
      : "bench.viscosity.state.degraded";
  const viscosityValueText = t("bench.field.viscosityValueText", {
    value: viscosityValue,
    state: t(viscosityStateKey),
  });
  const settlingMs = estimateSettlingMs(viscosity);
  const resting = mode === "rest";
  const dock = (
    <div
      className="og-hud"
      style={{ position: "static", display: "flex", gap: "var(--og-dock-gap)", flexWrap: "wrap", alignItems: "flex-end" }}
    >
      <label className="og-field">
        <span className="og-field__label">
          <span>{t("bench.field.oil")}</span>
          <span className="og-num" style={{ color: oilCss }}>{formatOilText(frac)}</span>
          <BenchOilSourceBadge />
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={oilPct}
          aria-label={t("bench.field.oilAccessible")}
          aria-valuetext={oilValueText}
          onInput={(e) => setOilPct(Number(e.currentTarget.value))}
        />
      </label>
      <label className="og-field">
        <span className="og-field__label">
          <span>{t("bench.field.viscosity")}</span>
          <span className="og-num">{formatNumber(viscosity, 2)} ({viscosityLabel(viscosity)})</span>
          <ProvenanceTag value="ASSUMPTION" />
        </span>
        <input
          type="range"
          min={VISC_MIN}
          max={VISC_MAX}
          step={0.05}
          value={viscosity}
          aria-label={t("bench.field.viscosity")}
          aria-valuetext={viscosityValueText}
          onInput={(e) => setViscosity(Number(e.currentTarget.value))}
        />
      </label>
      {webglAvailable && <>
        <button
          type="button"
          className={`og-btn ${resting ? "og-btn--ok" : "og-btn--primary"}`}
          onClick={() => setMode(resting ? "move" : "rest")}
        >
          {t(resting ? "bench.action.startMove" : "bench.action.stopForRest")}
        </button>
        <label className="og-check">
          <input
            type="checkbox"
            checked={cutaway}
            onChange={(e) => setCutaway(e.currentTarget.checked)}
          />
          {t("bench.action.cutaway")}
        </label>
        <label className="og-check">
          <input
            type="checkbox"
            checked={exploded}
            onChange={(e) => setExploded(e.currentTarget.checked)}
          />
          {t("bench.action.exploded")}
        </label>
      </>}
    </div>
  );

  const status = (
    <>
      <h2 className="og-h2">{t("bench.readout.title")}</h2>
      {initial.truckId && initial.wheelId && (
        <p className="og-body og-num" aria-live="polite">
          {t("wheel.fleetContext")}: {initial.truckId} · {initial.wheelId}
        </p>
      )}
      <div className="og-card og-card--tone" style={{ ["--tone" as string]: oilCss }}>
        <div className="og-value og-value--lg" style={{ color: oilCss }}>
          {formatOilText(frac)}
        </div>
        <div className="og-body og-num" style={{ margin: "4px 0 0" }}>
          {oilStateLabel(oilState)} · {t("wheel.reference")}
        </div>
        <div className="og-body og-num" style={{ margin: "4px 0 0" }}>
          <span>{t("bench.readout.settling", {
            milliseconds: formatNumber(settlingMs, 0),
            value: formatNumber(viscosity, 2),
            label: viscosityLabel(viscosity),
          })}</span> <ProvenanceTag value="ASSUMPTION" />
        </div>
        <div className="og-body og-num" style={{ margin: "4px 0 0" }}>
          {t("bench.readout.train", gearRatioDisplay)}
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
            ? t("hud.recal")
            : t("bench.readout.moving")}
        </div>
      </div>
      <h2 className="og-h2">{t("bench.sensor.title")}</h2>
      <ul className="og-plain">
        {BENCH_SENSORS.map((sensor) => {
          const active = sensor.id === selectedId;
          return (
            <li key={sensor.id} style={{ marginBottom: 8 }}>
              <button
                type="button"
                className={`og-card og-card--sensor${active ? " og-card--sensor-active" : ""}`}
                aria-pressed={active}
                onClick={() => setSelectedId(active ? null : sensor.id)}
              >
                <span className="og-sensor-id" aria-hidden="true">{sensor.identityCue}</span>
                <strong>{t(`bench.sensor.${sensor.id}.label` as DictKey)}</strong>
                <br />
                <span className="og-muted" style={{ fontSize: 13 }}>
                  <span>{t(`bench.sensor.${sensor.id}.signal` as DictKey)}</span>
                  {sensor.id === "vibration" && <> <ProvenanceTag value="CONFIGURACIÓN" /></>}
                </span>
                <br />
                <span style={{ color: "var(--og-body)", fontSize: 13 }}>
                  {t(`bench.sensor.${sensor.id}.mount` as DictKey)}
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
      <h2 className="og-h2">{t("bench.chain.title")}</h2>
      <ol className="og-list">
        {GDY106_CHAIN_PARTS.map((part) => (
          <li key={part}>{t(`bench.chain.${part}` as DictKey)}</li>
        ))}
      </ol>
      <p className="og-body og-muted">{t("bench.narrative.oilDuct")}</p>
      <p className="og-body">{t("bench.narrative.noDrill")}</p>
    </>
  );

  const notes = (
    <>
      <h2 className="og-h2">{t("bench.notes.title")}</h2>
      <p className="og-body">{t("bench.notes.about")}</p>
      <p className="og-body og-num">{t("bench.notes.train", gearRatioDisplay)}</p>
      <p className="og-body">{t("app.scope")}</p>
      <p className="og-body">{t("bench.honesty")}</p>
      <h2 className="og-h2">{t("bench.inspection.title")}</h2>
      <ol className="og-list">
        {INSPECTION_STEPS.map((s) => (
          <li key={s.n}>
            <strong>{t("bench.inspection.stepLabel", { number: s.n })}</strong> {t(`bench.inspection.step.${s.n}` as DictKey)}
          </li>
        ))}
      </ol>
      <p className="og-note">{t("bench.environment.note")}</p>
    </>
  );

  return (
    <div className="og-view og-view--wheel">
      <div className="og-viewport og-viewport--wheel">
        <div className="og-viewport__scene">
          <BenchScene
            webglAvailable={webglAvailable}
            onWebGLUnavailable={onWebGLUnavailable}
            selectedId={selectedId}
            onSelect={setSelectedId}
            oilLevel={frac}
            viscosityProxy={viscosity}
            mode={mode}
            cutaway={cutaway}
            exploded={exploded}
            badge={<HonestyBadge label={t("badge.proxy")} text={t("bench.honesty")} />}
          />
        </div>
        <div className="og-dock">{dock}</div>
      </div>
      <section className="og-reference-truck" aria-labelledby="reference-truck-heading" style={{ margin: "16px 0", padding: "0 16px" }}>
        <h2 id="reference-truck-heading" className="og-h2">{t("bench.referenceTruck.heading")}</h2>
        <button
          type="button"
          className="og-btn og-btn--primary"
          disabled={referenceTruckState === "loading"}
          aria-expanded={referenceTruckState === "loading" || referenceTruckState === "loaded"}
          onClick={() => setReferenceTruckState((current) => current === "loaded" ? "idle" : "loading")}
        >
          {t("bench.referenceTruck.button")}
        </button>
        {referenceTruckState === "error" && <p className="og-body" role="alert">{t("bench.referenceTruck.error")}</p>}
        {(referenceTruckState === "loading" || referenceTruckState === "loaded") && <>
          {referenceTruckState === "loading" && <p className="og-body" role="status">{t("bench.referenceTruck.loading")}</p>}
          <div
            ref={referenceTruckContainer}
            role="img"
            aria-label={t("bench.referenceTruck.viewer")}
            style={{ width: "100%", height: "clamp(240px, 42vw, 420px)", maxWidth: 960, overflow: "hidden", background: "var(--og-panel, #111923)", borderRadius: 8 }}
          />
          <p className="og-body" style={{ marginBottom: 4 }}>
            {t("bench.referenceTruck.attribution", REFERENCE_TRUCK_ATTRIBUTION)}
          </p>
          <a className="og-body" href={REFERENCE_TRUCK_ATTRIBUTION.source} target="_blank" rel="noreferrer">
            {t("bench.referenceTruck.source")}
          </a>
        </>}
      </section>
      <Drawer
        tabs={[
          { id: "status", label: t("drawer.status"), content: status },
          { id: "sheet", label: t("drawer.sheet"), content: sheet },
          { id: "notes", label: t("drawer.notes"), content: notes },
        ]}
      />
    </div>
  );
}
