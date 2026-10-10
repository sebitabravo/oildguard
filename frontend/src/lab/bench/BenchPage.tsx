import { useMemo, useState } from "preact/hooks";
import { formatNumber } from "../../i18n/numberFormat";
import { t, useLang, type Lang } from "../../i18n";
import { DataTable, PageHeader, Button, Slider, StatusBadge, SyntheticBadge, TelemetryCard, TimeSeriesChart } from "../../ui/foundation";
import { LabBanner } from "../shared/LabBanner";
import {
  BENCH_DEFAULTS,
  BENCH_LIMITS,
  PROTOCOL_STEP_IDS,
  benchReading,
  protocolLevelSteps,
  stopTransient,
  type BenchInput,
} from "./logic";
import "./bench.css";

type SliderKey = keyof BenchInput;

function BenchSlider({
  lang,
  field,
  label,
  hint,
  unit,
  digits,
  value,
  onChange,
}: {
  lang: Lang;
  field: SliderKey;
  label: string;
  hint?: string;
  unit: string;
  digits: number;
  value: number;
  onChange: (field: SliderKey, value: number) => void;
}) {
  const limits = BENCH_LIMITS[field];
  return (
    <label className="lab-field bench-slider">
      <span className="bench-slider__head">
        <span>{label}</span>
        <strong className="lab-mono">{formatNumber(value, lang, digits)} {unit}</strong>
      </span>
      <Slider
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        aria-valuetext={`${formatNumber(value, lang, digits)} ${unit}`}
        onInput={(event) => onChange(field, Number(event.currentTarget.value))}
      />
      <span className="bench-slider__range">
        <span>{formatNumber(limits.min, lang, 0)}</span>
        {hint && <em>{hint}</em>}
        <span>{formatNumber(limits.max, lang, 0)}</span>
      </span>
    </label>
  );
}

export default function BenchPage() {
  const [lang] = useLang();
  const [input, setInput] = useState<BenchInput>({ ...BENCH_DEFAULTS });
  const reading = useMemo(() => benchReading(input), [input]);
  const curve = useMemo(() => stopTransient(input), [input]);
  const steps = useMemo(() => protocolLevelSteps(reading.input.temperatureC), [reading.input.temperatureC]);

  const pressures = curve.map((sample) => sample.pressureKpa);
  const asymptote = reading.restPressureKpa;
  const low = Math.min(...pressures);
  const span = asymptote - low || 0.1;
  const domain: [number, number] = [low - span * 0.15, asymptote + span * 0.15];
  const xLabels = [0, 2, 4].map((value) => `${formatNumber(value, lang, 0)} s`);

  function update(field: SliderKey, value: number) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  const stepRows = steps.map((step) => ({
    id: String(step.volumeL),
    cells: {
      volume: <span className="lab-mono">{formatNumber(step.volumeL, lang, 1)}</span>,
      percent: <span className="lab-mono">{formatNumber(step.percent, lang, 0)}</span>,
      expected: <span className="lab-mono">{formatNumber(step.pressureKpa, lang, 3)}</span>,
      measured: <span className="lab-chip-status">{t("lab.pending", lang)}</span>,
    },
  }));

  return (
    <div className="og-page lab-page bench-page">
      <div className="og-page__inner">
        <LabBanner lang={lang} title={t("lab.bench.banner", lang)} detail={t("lab.bench.bannerDetail", lang)} />
        <PageHeader
          eyebrow={t("lab.eyebrow", lang)}
          title={t("lab.bench.title", lang)}
          description={t("lab.bench.description", lang)}
          meta={<SyntheticBadge lang={lang} />}
        />

        <div className="bench-page__grid">
          <div className="bench-page__main">
            <div className="bench-page__top">
              <section className="lab-panel" aria-labelledby="bench-inputs-title">
                <div className="lab-panel__head">
                  <h3 id="bench-inputs-title">{t("lab.bench.inputs.title", lang)}</h3>
                  <Button type="button" variant="ghost" onClick={() => setInput({ ...BENCH_DEFAULTS })}>{t("lab.bench.reset", lang)}</Button>
                </div>
                <div className="bench-page__sliders">
                  <BenchSlider lang={lang} field="fillL" label={t("lab.bench.fill", lang)} unit="L" digits={1} value={input.fillL} onChange={update} />
                  <BenchSlider lang={lang} field="temperatureC" label={t("lab.bench.temperature", lang)} unit="°C" digits={0} value={input.temperatureC} onChange={update} />
                  <BenchSlider
                    lang={lang}
                    field="wheelRpm"
                    label={t("lab.bench.rpm", lang)}
                    hint={t("lab.bench.rpmHint", lang)}
                    unit="rpm"
                    digits={0}
                    value={input.wheelRpm}
                    onChange={update}
                  />
                </div>
                <p className="lab-note">{t("lab.bench.assumption", lang)}</p>
              </section>

              <section className="lab-panel" aria-labelledby="bench-readings-title">
                <div className="lab-panel__head">
                  <h3 id="bench-readings-title">{t("lab.bench.readings.title", lang)}</h3>
                  <StatusBadge
                    lang={lang}
                    tone={reading.restGate ? "nominal" : "warning"}
                    label={t(reading.restGate ? "lab.bench.gate.open" : "lab.bench.gate.closed", lang)}
                  />
                </div>
                <div className="bench-page__cards">
                  <TelemetryCard lang={lang} label={t("lab.bench.reading.rest", lang)} value={formatNumber(reading.restPressureKpa, lang, 3)} unit="kPa" />
                  <TelemetryCard lang={lang} label={t("lab.bench.reading.now", lang)} value={formatNumber(reading.pressureNowKpa, lang, 3)} unit="kPa" />
                  <TelemetryCard lang={lang} label={t("lab.bench.reading.head", lang)} value={formatNumber(reading.headMm, lang, 0)} unit="mm" />
                </div>
                <dl className="bench-page__facts">
                  <div><dt>{t("lab.bench.reading.density", lang)}</dt><dd className="lab-mono">{formatNumber(reading.densityKgM3, lang, 0)} kg/m³</dd></div>
                  <div><dt>{t("lab.bench.reading.holdUp", lang)}</dt><dd className="lab-mono">{formatNumber(reading.holdUpL, lang, 1)} L</dd></div>
                  <div><dt>{t("lab.bench.reading.viscosity", lang)}</dt><dd className="lab-mono">{formatNumber(reading.viscosityProxy, lang, 2)}</dd></div>
                  <div><dt>{t("lab.bench.reading.tau", lang)}</dt><dd className="lab-mono">{formatNumber(reading.tauS, lang, 2)} s</dd></div>
                  <div><dt>{t("lab.bench.reading.settle", lang)}</dt><dd className="lab-mono">{formatNumber(reading.settleMs / 1000, lang, 1)} s</dd></div>
                  <div><dt>{t("lab.bench.reading.regime", lang)}</dt><dd>{t(`lab.bench.regime.${reading.regime}`, lang)}</dd></div>
                </dl>
              </section>
            </div>

            <section className="lab-panel" aria-labelledby="bench-curve-title">
              <div className="lab-panel__head">
                <div>
                  <h3 id="bench-curve-title">{t("lab.bench.curve.title", lang)}</h3>
                  <p>{t("lab.bench.curve.description", lang)}</p>
                </div>
                <span className="lab-chip-status">{t("lab.bench.curve.model", lang)}</span>
              </div>
              <div className="bench-page__curve">
                <TimeSeriesChart
                  lang={lang}
                  values={pressures}
                  title={t("lab.bench.curve.aria", lang)}
                  xLabels={xLabels}
                  yUnit="kPa"
                  yDecimals={3}
                  domain={domain}
                  thresholds={[{ value: asymptote, label: t("lab.bench.curve.asymptote", lang) }]}
                />
              </div>
              <p className="lab-note bench-page__axis">{t("lab.bench.curve.axis", lang)}</p>
            </section>

            <section className="lab-panel" aria-labelledby="bench-steps-title">
              <div className="lab-panel__head"><h3 id="bench-steps-title">{t("lab.bench.steps.title", lang)}</h3></div>
              <DataTable
                lang={lang}
                compact
                caption={t("lab.bench.steps.caption", lang)}
                columns={[
                  { key: "volume", label: t("lab.bench.steps.volume", lang) },
                  { key: "percent", label: t("lab.bench.steps.percent", lang) },
                  { key: "expected", label: t("lab.bench.steps.expected", lang) },
                  { key: "measured", label: t("lab.bench.steps.measured", lang) },
                ]}
                rows={stepRows}
              />
            </section>
          </div>

          <section className="lab-panel bench-page__protocol" aria-labelledby="bench-protocol-title">
            <div className="lab-panel__head">
              <div>
                <h3 id="bench-protocol-title">{t("lab.bench.protocol.title", lang)}</h3>
                <p>{t("lab.bench.protocol.description", lang)}</p>
              </div>
            </div>
            <ol className="bench-protocol">
              {PROTOCOL_STEP_IDS.map((id) => (
                <li>
                  <span className="bench-protocol__box" aria-hidden="true">{formatNumber(id, lang, 0)}</span>
                  <span className="bench-protocol__text">{t(`lab.bench.protocol.step.${id}`, lang)}</span>
                  <span className="lab-chip-status">{t("lab.pending", lang)}</span>
                </li>
              ))}
            </ol>
            <p className="lab-note">{t("lab.bench.protocol.status", lang)}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
