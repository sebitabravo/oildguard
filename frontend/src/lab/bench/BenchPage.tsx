import { useMemo, useState } from "preact/hooks";
import { formatNumber } from "../../i18n/numberFormat";
import { t } from "../../i18n";
import { DataTable, PageHeader, Button, ProvenanceTag, Slider, StatusBadge, SyntheticBadge, TelemetryCard, TimeSeriesChart } from "../../ui/foundation";
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
  field,
  label,
  hint,
  unit,
  digits,
  value,
  onChange,
}: {
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
        <strong className="lab-mono">{formatNumber(value, digits)} {unit} <ProvenanceTag value="CONFIGURACIÓN" /></strong>
      </span>
      <Slider
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        aria-valuetext={`${formatNumber(value, digits)} ${unit}`}
        onInput={(event) => onChange(field, Number(event.currentTarget.value))}
      />
      <span className="bench-slider__range">
        <span>{formatNumber(limits.min, 0)} <ProvenanceTag value="CONFIGURACIÓN" /></span>
        {hint && <em>{hint}</em>}
        <span>{formatNumber(limits.max, 0)} <ProvenanceTag value="CONFIGURACIÓN" /></span>
      </span>
    </label>
  );
}

export default function BenchPage() {
  const [input, setInput] = useState<BenchInput>({ ...BENCH_DEFAULTS });
  const reading = useMemo(() => benchReading(input), [input]);
  const curve = useMemo(() => stopTransient(input), [input]);
  const steps = useMemo(() => protocolLevelSteps(reading.input.temperatureC), [reading.input.temperatureC]);

  const pressures = curve.map((sample) => sample.pressureKpa);
  const asymptote = reading.restPressureKpa;
  const low = Math.min(...pressures);
  const span = asymptote - low || 0.1;
  const domain: [number, number] = [low - span * 0.15, asymptote + span * 0.15];
  const xLabels = [0, 2, 4].map((value) => `${formatNumber(value, 0)} s`);

  function update(field: SliderKey, value: number) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  const stepRows = steps.map((step) => ({
    id: String(step.volumeL),
    cells: {
      volume: <span className="lab-mono">{formatNumber(step.volumeL, 1)} <ProvenanceTag value="CONFIGURACIÓN" /></span>,
      percent: <span className="lab-mono">{formatNumber(step.percent, 0)} <ProvenanceTag value="CONFIGURACIÓN" /></span>,
      expected: <span className="lab-mono">{formatNumber(step.pressureKpa, 3)} <ProvenanceTag value="ASSUMPTION" /></span>,
      measured: <span className="lab-chip-status">{t("lab.pending")}</span>,
    },
  }));

  return (
    <div className="og-page lab-page bench-page">
      <div className="og-page__inner">
        <LabBanner title={t("lab.bench.banner")} detail={t("lab.bench.bannerDetail")} />
        <PageHeader
          eyebrow={t("lab.eyebrow")}
          title={t("lab.bench.title")}
          description={t("lab.bench.description")}
          meta={<SyntheticBadge />}
        />

        <div className="bench-page__grid">
          <div className="bench-page__main">
            <div className="bench-page__top">
              <section className="lab-panel" aria-labelledby="bench-inputs-title">
                <div className="lab-panel__head">
                  <h3 id="bench-inputs-title">{t("lab.bench.inputs.title")}</h3>
                  <Button type="button" variant="ghost" onClick={() => setInput({ ...BENCH_DEFAULTS })}>{t("lab.bench.reset")}</Button>
                </div>
                <div className="bench-page__sliders">
                  <BenchSlider field="fillL" label={t("lab.bench.fill")} unit="L" digits={1} value={input.fillL} onChange={update} />
                  <BenchSlider field="temperatureC" label={t("lab.bench.temperature")} unit="°C" digits={0} value={input.temperatureC} onChange={update} />
                  <BenchSlider

                    field="wheelRpm"
                    label={t("lab.bench.rpm")}
                    hint={t("lab.bench.rpmHint")}
                    unit="rpm"
                    digits={0}
                    value={input.wheelRpm}
                    onChange={update}
                  />
                </div>
                <p className="lab-note">{t("lab.bench.assumption")}</p>
              </section>

              <section className="lab-panel" aria-labelledby="bench-readings-title">
                <div className="lab-panel__head">
                  <h3 id="bench-readings-title">{t("lab.bench.readings.title")}</h3>
                  <StatusBadge

                    tone={reading.restGate ? "nominal" : "warning"}
                    label={t(reading.restGate ? "lab.bench.gate.open" : "lab.bench.gate.closed")}
                  />
                </div>
                <div className="bench-page__cards">
                  <TelemetryCard label={t("lab.bench.reading.rest")} value={formatNumber(reading.restPressureKpa, 3)} unit="kPa"><ProvenanceTag value="ASSUMPTION" /></TelemetryCard>
                  <TelemetryCard label={t("lab.bench.reading.now")} value={formatNumber(reading.pressureNowKpa, 3)} unit="kPa"><ProvenanceTag value="ASSUMPTION" /></TelemetryCard>
                  <TelemetryCard label={t("lab.bench.reading.head")} value={formatNumber(reading.headMm, 0)} unit="mm"><ProvenanceTag value="DERIVED" /></TelemetryCard>
                </div>
                <dl className="bench-page__facts">
                  <div><dt>{t("lab.bench.reading.density")}</dt><dd className="lab-mono">{formatNumber(reading.densityKgM3, 0)} kg/m³ <ProvenanceTag value="DERIVED" /></dd></div>
                  <div><dt>{t("lab.bench.reading.holdUp")}</dt><dd className="lab-mono">{formatNumber(reading.holdUpL, 1)} L <ProvenanceTag value="DERIVED" /></dd></div>
                  <div><dt>{t("lab.bench.reading.viscosity")}</dt><dd className="lab-mono">{formatNumber(reading.viscosityProxy, 2)} <ProvenanceTag value="ASSUMPTION" /></dd></div>
                  <div><dt>{t("lab.bench.reading.tau")}</dt><dd className="lab-mono">{formatNumber(reading.tauS, 2)} s <ProvenanceTag value="ASSUMPTION" /></dd></div>
                  <div><dt>{t("lab.bench.reading.settle")}</dt><dd className="lab-mono">{formatNumber(reading.settleMs / 1000, 1)} s <ProvenanceTag value="DERIVED" /></dd></div>
                  <div><dt>{t("lab.bench.reading.regime")}</dt><dd>{t(`lab.bench.regime.${reading.regime}`)}</dd></div>
                </dl>
              </section>
            </div>

            <section className="lab-panel" aria-labelledby="bench-curve-title">
              <div className="lab-panel__head">
                <div>
                  <h3 id="bench-curve-title">{t("lab.bench.curve.title")}</h3>
                  <p>{t("lab.bench.curve.description")}</p>
                </div>
                <span className="lab-chip-status">{t("lab.bench.curve.model")}</span>
              </div>
              <div className="bench-page__curve">
                <TimeSeriesChart
                  values={pressures}
                  title={t("lab.bench.curve.aria")}
                  xLabels={xLabels}
                  yUnit="kPa"
                  yDecimals={3}
                  domain={domain}
                  thresholds={[{ value: asymptote, label: t("lab.bench.curve.asymptote") }]}
                />
              </div>
              <p className="lab-note bench-page__axis">{t("lab.bench.curve.axis")} <ProvenanceTag value="CONFIGURACIÓN" /></p>
            </section>

            <section className="lab-panel" aria-labelledby="bench-steps-title">
              <div className="lab-panel__head"><h3 id="bench-steps-title">{t("lab.bench.steps.title")}</h3></div>
              <DataTable

                compact
                caption={t("lab.bench.steps.caption")}
                columns={[
                  { key: "volume", label: t("lab.bench.steps.volume") },
                  { key: "percent", label: t("lab.bench.steps.percent") },
                  { key: "expected", label: t("lab.bench.steps.expected") },
                  { key: "measured", label: t("lab.bench.steps.measured") },
                ]}
                rows={stepRows}
              />
            </section>
          </div>

          <section className="lab-panel bench-page__protocol" aria-labelledby="bench-protocol-title">
            <div className="lab-panel__head">
              <div>
                <h3 id="bench-protocol-title">{t("lab.bench.protocol.title")}</h3>
                <p>{t("lab.bench.protocol.description")}</p>
              </div>
            </div>
            <ol className="bench-protocol">
              {PROTOCOL_STEP_IDS.map((id) => (
                <li>
                  <span className="bench-protocol__box" aria-hidden="true">{formatNumber(id, 0)}</span>
                  <span className="bench-protocol__text">{t(`lab.bench.protocol.step.${id}`)} <ProvenanceTag value="CONFIGURACIÓN" /></span>
                  <span className="lab-chip-status">{t("lab.pending")}</span>
                </li>
              ))}
            </ol>
            <p className="lab-note">{t("lab.bench.protocol.status")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
