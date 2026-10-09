import { useEffect, useState } from "preact/hooks";
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
import { CAPACITY_L, GDY106_TRAIN, stageRatio, trainRatio } from "../../twin/physics";
import { parseWheelUrl } from "./wheelUrl";
import { t, type DictKey, useLang } from "../../i18n";
import Drawer from "../../ui/Drawer";
import HonestyBadge from "../../ui/HonestyBadge";

// Vista Rueda GDY106: corte 3D en el visor; el detalle (lectura de aceite,
// sensores, cadena, inspección pasos 1-11) vive en el panel lateral.
// Manual-faithful (user-supplied manuals, authoritative over placeholders).
// Labels show EN/ES + manual item numbers.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface InspStep {
  n: number;
}

export const INSPECTION_STEPS: InspStep[] = Array.from({ length: 11 }, (_, index) => ({ n: index + 1 }));

const GDY106_CHAIN_PARTS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export default function BenchView() {
  const [initial] = useState(() => parseWheelUrl(window.location.search));
  const [selectedId, setSelectedId] = useState<string | null>(initial.sensorId);
  const [oilPct, setOilPct] = useState(Math.round((initial.oilLitres / CAPACITY_L) * 100));
  const [viscosity, setViscosity] = useState(VISC_NOMINAL);
  const [mode, setMode] = useState<BenchMode>(initial.mode);
  const [cutaway, setCutaway] = useState(initial.cutaway);
  const [exploded, setExploded] = useState(initial.exploded);
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
  const oilLitresText = new Intl.NumberFormat(lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(frac * CAPACITY_L);
  const oilValueText = t("bench.field.oilValueText", lang, {
    litres: oilLitresText,
    percent: oilPct,
  });
  const viscosityValue = new Intl.NumberFormat(lang, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(viscosity);
  const viscosityStateKey = viscosity < 0.8
    ? "bench.viscosity.state.dilute"
    : viscosity < 1.5
      ? "bench.viscosity.state.nominal"
      : "bench.viscosity.state.degraded";
  const viscosityValueText = t("bench.field.viscosityValueText", lang, {
    value: viscosityValue,
    state: t(viscosityStateKey, lang),
  });
  const settlingMs = estimateSettlingMs(viscosity);
  const resting = mode === "rest";
  const dock = (
    <div
      className="og-hud"
      style={{ position: "static", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}
    >
      <label className="og-field">
        <span className="og-field__label">
          <span>{t("bench.field.oil", lang)}</span>
          <span className="og-num" style={{ color: oilCss }}>{formatOilText(frac)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={oilPct}
          aria-label={t("bench.field.oilAccessible", lang)}
          aria-valuetext={oilValueText}
          onInput={(e) => setOilPct(Number(e.currentTarget.value))}
        />
      </label>
      <label className="og-field">
        <span className="og-field__label">
          <span>{t("bench.field.viscosity", lang)}</span>
          <span className="og-num">{viscosity.toFixed(2)} ({viscosityLabel(viscosity, lang)})</span>
        </span>
        <input
          type="range"
          min={VISC_MIN}
          max={VISC_MAX}
          step={0.05}
          value={viscosity}
          aria-label={t("bench.field.viscosity", lang)}
          aria-valuetext={viscosityValueText}
          onInput={(e) => setViscosity(Number(e.currentTarget.value))}
        />
      </label>
      <button
        type="button"
        className={`og-btn ${resting ? "og-btn--ok" : "og-btn--primary"}`}
        onClick={() => setMode(resting ? "move" : "rest")}
      >
        {t(resting ? "bench.action.startMove" : "bench.action.stopForRest", lang)}
      </button>
      <label className="og-check">
        <input
          type="checkbox"
          checked={cutaway}
          onChange={(e) => setCutaway(e.currentTarget.checked)}
        />
        {t("bench.action.cutaway", lang)}
      </label>
      <label className="og-check">
        <input
          type="checkbox"
          checked={exploded}
          onChange={(e) => setExploded(e.currentTarget.checked)}
        />
        {t("bench.action.exploded", lang)}
      </label>
    </div>
  );

  const status = (
    <>
      <h2 className="og-h2">{t("bench.readout.title", lang)}</h2>
      {initial.truckId && initial.wheelId && (
        <p className="og-body og-num" aria-live="polite">
          {t("wheel.fleetContext", lang)}: {initial.truckId} · {initial.wheelId}
        </p>
      )}
      <div className="og-card og-card--tone" style={{ ["--tone" as string]: oilCss }}>
        <div className="og-value og-value--lg" style={{ color: oilCss }}>
          {formatOilText(frac)}
        </div>
        <div className="og-body og-num" style={{ margin: "4px 0 0" }}>
          {oilStateLabel(oilState, lang)} · {t("wheel.reference", lang)}
        </div>
        <div className="og-body og-num" style={{ margin: "4px 0 0" }}>
          {t("bench.readout.settling", lang, {
            milliseconds: settlingMs,
            value: viscosity.toFixed(2),
            label: viscosityLabel(viscosity, lang),
          })}
        </div>
        <div className="og-body og-num" style={{ margin: "4px 0 0" }}>
          {t("bench.readout.train", lang, {
            highSpeed: stageRatio(GDY106_TRAIN.hs).toFixed(2),
            lowSpeed: stageRatio(GDY106_TRAIN.ls).toFixed(2),
            overall: trainRatio().toFixed(2),
          })}
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
            : t("bench.readout.moving", lang)}
        </div>
      </div>
      <h2 className="og-h2">{t("bench.sensor.title", lang)}</h2>
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
                <strong>{t(`bench.sensor.${sensor.id}.label` as DictKey, lang)}</strong>
                <br />
                <span className="og-muted" style={{ fontSize: 13 }}>
                  {t(`bench.sensor.${sensor.id}.signal` as DictKey, lang)}
                </span>
                <br />
                <span style={{ color: "var(--og-body)", fontSize: 13 }}>
                  {t(`bench.sensor.${sensor.id}.mount` as DictKey, lang)}
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
      <h2 className="og-h2">{t("bench.chain.title", lang)}</h2>
      <ol className="og-list">
        {GDY106_CHAIN_PARTS.map((part) => (
          <li key={part}>{t(`bench.chain.${part}` as DictKey, lang)}</li>
        ))}
      </ol>
      <p className="og-body og-muted">{t("bench.narrative.oilDuct", lang)}</p>
      <p className="og-body">{t("bench.narrative.noDrill", lang)}</p>
    </>
  );

  const notes = (
    <>
      <h2 className="og-h2">{t("bench.notes.title", lang)}</h2>
      <p className="og-body">{t("bench.notes.about", lang)}</p>
      <p className="og-body">{t("app.scope", lang)}</p>
      <p className="og-body">{t("bench.honesty", lang)}</p>
      <h2 className="og-h2">{t("bench.inspection.title", lang)}</h2>
      <ol className="og-list">
        {INSPECTION_STEPS.map((s) => (
          <li key={s.n}>
            <strong>{t("bench.inspection.stepLabel", lang, { number: s.n })}</strong> {t(`bench.inspection.step.${s.n}` as DictKey, lang)}
          </li>
        ))}
      </ol>
      <p className="og-note">{t("bench.environment.note", lang)}</p>
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
          exploded={exploded}
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
