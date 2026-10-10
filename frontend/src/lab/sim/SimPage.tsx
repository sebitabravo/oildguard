import { useEffect, useMemo, useState } from "preact/hooks";
import { formatNumber } from "../../i18n/numberFormat";
import { t, useLang, type Lang } from "../../i18n";
import { postIngest } from "../../sim/api";
import type { ScenarioName } from "../../sim/signals";
import { Button, PageHeader, RegimeChip, SyntheticBadge, TimeSeriesChart, Icon, SegmentedControl } from "../../ui/foundation";
import { useBackendState } from "../../ui/backendOrDemo";
import { LabBanner } from "../shared/LabBanner";
import {
  DEFAULT_DURATION_S,
  DEFAULT_RATE_HZ,
  FIXTURE_SECONDS,
  SCENARIOS,
  SCENARIO_LABEL,
  SIGNAL_LABELS,
  buildCommands,
  countLabels,
  fixtureSeed,
  linkDownRanges,
  nextIndex,
  normalizeParams,
  previewMatchesFixture,
  rowsForIngest,
  rowsToCsv,
  scenarioRows,
} from "./logic";
import "./sim.css";

const LAB_DEVICE_ID = "lab-sim-01";
const SPEEDS = ["1×", "2×", "4×"] as const;
const SPEED_STEPS: Record<(typeof SPEEDS)[number], number> = { "1×": 1, "2×": 2, "4×": 4 };

type SendState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "done"; accepted: number; rejected: number }
  | { status: "error"; message: string };

function SimChart({
  lang,
  title,
  readout,
  values,
  cursor,
  cursorLabel,
  hatch,
  xLabels,
  unit,
  decimals,
  domain,
  ticks,
}: {
  lang: Lang;
  title: string;
  readout: string;
  values: number[];
  cursor: number;
  cursorLabel: string;
  hatch: Array<{ start: number; end: number }>;
  xLabels: string[];
  unit: string;
  decimals: number;
  domain?: [number, number];
  ticks?: number[];
}) {
  const steps = Math.max(1, values.length - 1);
  return (
    <section className="sim-chart" aria-label={title}>
      <div className="sim-chart__head">
        <h4>{title}</h4>
        <span className="lab-mono">{readout}</span>
      </div>
      <div className="sim-chart__frame">
        <TimeSeriesChart
          lang={lang}
          values={values}
          title={title}
          xLabels={xLabels}
          yUnit={unit}
          yDecimals={decimals}
          domain={domain}
          yTicks={ticks}
          events={[{ index: cursor, label: cursorLabel }]}
        />
        <div className="sim-chart__hatch-layer" aria-hidden="true">
          {hatch.map((range) => (
            <span
              className="sim-chart__hatch"
              style={{
                left: `${(range.start / steps) * 100}%`,
                width: `${(Math.min(range.end + 1, steps) - range.start) / steps * 100}%`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function downloadCsv(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SimPage() {
  const [lang] = useLang();
  const [scenario, setScenario] = useState<ScenarioName>("slow-leak");
  const [seed, setSeed] = useState(fixtureSeed("slow-leak"));
  const [durationS, setDurationS] = useState(DEFAULT_DURATION_S);
  const [rateHz, setRateHz] = useState(DEFAULT_RATE_HZ);
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>("1×");
  const [playing, setPlaying] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [copied, setCopied] = useState<"python" | "rust" | null>(null);
  const [send, setSend] = useState<SendState>({ status: "idle" });
  const backend = useBackendState();

  const rows = useMemo(() => scenarioRows(scenario), [scenario]);
  const params = normalizeParams({ scenario, seed, durationS, rateHz });
  const commands = buildCommands(params);
  const matches = previewMatchesFixture(params);
  const hatch = useMemo(() => linkDownRanges(rows), [rows]);
  const series = useMemo(() => ({
    level: rows.map((row) => row.level_liters),
    pressure: rows.map((row) => row.pressure_kpa),
    temperature: rows.map((row) => row.temperature_c),
    vibration: rows.map((row) => row.vib_rms_g),
  }), [rows]);
  const counts = countLabels(rows, index + 1);
  const totals = countLabels(rows);
  const current = rows[Math.min(index, rows.length - 1)];
  const cursorLabel = `${formatNumber(current.t_s, lang, 1)} s`;
  const xLabels = [0, FIXTURE_SECONDS / 2, FIXTURE_SECONDS].map((value) => `${formatNumber(value, lang, 0)} s`);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => setIndex((value) => nextIndex(value, SPEED_STEPS[speed], rows.length)), 100);
    return () => window.clearInterval(timer);
  }, [playing, speed, rows.length]);

  function chooseScenario(next: ScenarioName) {
    setScenario(next);
    setSeed(fixtureSeed(next));
    setIndex(0);
    setSend({ status: "idle" });
  }

  async function copy(kind: "python" | "rust") {
    try {
      await navigator.clipboard.writeText(commands[kind]);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  async function sendToBackend() {
    setSend({ status: "sending" });
    try {
      const ack = await postIngest(rowsForIngest(rows, LAB_DEVICE_ID));
      setSend({ status: "done", accepted: ack.ingested, rejected: ack.rejected ?? 0 });
    } catch (error) {
      setSend({ status: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  const live = backend === "live";
  const fixtureSeedValue = fixtureSeed(scenario);

  return (
    <div className="og-page lab-page sim-page">
      <div className="og-page__inner">
        <LabBanner lang={lang} title={t("lab.sim.banner", lang)} detail={t("lab.sim.bannerDetail", lang)} />
        <PageHeader
          eyebrow={t("lab.eyebrow", lang)}
          title={t("lab.sim.title", lang)}
          description={t("lab.sim.description", lang)}
          meta={<SyntheticBadge lang={lang} />}
        />

        <div className="sim-page__grid">
          <div className="sim-page__col">
          <section className="lab-panel sim-page__params" aria-labelledby="sim-params-title">
            <div className="lab-panel__head"><h3 id="sim-params-title">{t("lab.sim.params.title", lang)}</h3></div>
            <div className="sim-page__fields">
              <label className="lab-field sim-page__field-wide">
                <span>{t("lab.sim.params.scenario", lang)}</span>
                <select value={scenario} onChange={(event) => chooseScenario(event.currentTarget.value as ScenarioName)}>
                  {SCENARIOS.map((name) => <option value={name}>{t(`lab.sim.scenario.${name}`, lang)}</option>)}
                </select>
              </label>
              <label className="lab-field">
                <span>{t("lab.sim.params.seed", lang)}</span>
                <input type="number" min={0} step={1} value={seed} onInput={(event) => setSeed(Number(event.currentTarget.value))} />
              </label>
              <label className="lab-field">
                <span>{t("lab.sim.params.duration", lang)}</span>
                <input type="number" min={1} max={3600} step={1} value={durationS} onInput={(event) => setDurationS(Number(event.currentTarget.value))} />
              </label>
              <label className="lab-field">
                <span>{t("lab.sim.params.rate", lang)}</span>
                <input type="number" min={1} max={1000} step={1} value={rateHz} onInput={(event) => setRateHz(Number(event.currentTarget.value))} />
              </label>
            </div>
            <p className="lab-note">{t("lab.sim.params.rateNote", lang)}</p>
            <p className={`sim-page__pinned${matches ? " is-match" : ""}`}>
              {t(matches ? "lab.sim.pinnedMatch" : "lab.sim.pinned", lang, { seed: fixtureSeedValue })}
            </p>
          </section>

          <section className="lab-panel sim-page__faults" aria-labelledby="sim-faults-title">
            <div className="lab-panel__head">
              <h3 id="sim-faults-title">{t("lab.sim.faults.title", lang)}</h3>
              <span className="lab-chip-status">{t("lab.sim.faults.label", lang)}</span>
            </div>
            <ul className="sim-faults">
              {SCENARIOS.map((name) => (
                <li>
                  <button type="button" className="sim-fault" aria-pressed={name === scenario} onClick={() => chooseScenario(name)}>
                    <span className="sim-fault__top">
                      <strong>{t(`lab.sim.scenario.${name}`, lang)}</strong>
                      <code className="sim-fault__label">{SCENARIO_LABEL[name]}</code>
                    </span>
                    <span className="sim-fault__effect">{t(`lab.sim.effect.${name}`, lang)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          </div>

          <div className="sim-page__col">
          <section className="lab-panel sim-page__preview" aria-labelledby="sim-preview-title">
            <div className="lab-panel__head">
              <div>
                <h3 id="sim-preview-title">{t("lab.sim.preview.title", lang)}</h3>
                <p>{t("lab.sim.preview.subtitle", lang)}</p>
              </div>
              <span className="sim-legend"><i className="sim-legend__hatch" />{t("lab.sim.legend.link", lang)}</span>
            </div>
            <SimChart
              lang={lang} title={t("lab.sim.signal.level", lang)} readout={`${formatNumber(current.level_liters, lang, 1)} L`}
              values={series.level} cursor={index} cursorLabel={cursorLabel} hatch={hatch}
              xLabels={[]} unit="L" decimals={0} domain={[70, 100]} ticks={[70, 80, 90, 100]}
            />
            <SimChart
              lang={lang} title={t("lab.sim.signal.pressure", lang)} readout={`${formatNumber(current.pressure_kpa, lang, 3)} kPa`}
              values={series.pressure} cursor={index} cursorLabel="" hatch={hatch}
              xLabels={[]} unit="kPa" decimals={2}
            />
            <SimChart
              lang={lang} title={t("lab.sim.signal.temperature", lang)} readout={`${formatNumber(current.temperature_c, lang, 2)} °C`}
              values={series.temperature} cursor={index} cursorLabel="" hatch={hatch}
              xLabels={[]} unit="°C" decimals={1}
            />
            <SimChart
              lang={lang} title={t("lab.sim.signal.vibration", lang)} readout={`${formatNumber(current.vib_rms_g, lang, 3)} g`}
              values={series.vibration} cursor={index} cursorLabel="" hatch={hatch}
              xLabels={xLabels} unit="g" decimals={2}
            />
            <div className="sim-transport">
              <Button type="button" variant="primary" onClick={() => setPlaying((value) => !value)} aria-pressed={playing}>
                {t(playing ? "lab.sim.pause" : "lab.sim.play", lang)}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setIndex(0); }}>{t("lab.sim.restart", lang)}</Button>
              <label className="lab-field sim-transport__cursor">
                <span>{t("lab.sim.cursor", lang)} · {cursorLabel}</span>
                <input
                  type="range"
                  min={0}
                  max={rows.length - 1}
                  step={1}
                  value={index}
                  aria-label={t("lab.sim.cursor", lang)}
                  aria-valuetext={cursorLabel}
                  onInput={(event) => setIndex(Number(event.currentTarget.value))}
                />
              </label>
              <div className="sim-transport__speed" role="group" aria-label={t("lab.sim.speed", lang)}>
                <SegmentedControl options={[...SPEEDS]} value={speed} onChange={(value) => setSpeed(value as (typeof SPEEDS)[number])} />
              </div>
            </div>
          </section>
          </div>

          <div className="sim-page__col">
          <section className="lab-panel sim-page__counter" aria-labelledby="sim-counter-title">
            <div className="lab-panel__head">
              <h3 id="sim-counter-title">{t("lab.sim.counter.title", lang)}</h3>
              <span className="lab-mono sim-counter__played">
                {formatNumber(Math.min(index + 1, rows.length), lang, 0)} / {formatNumber(rows.length, lang, 0)} {t("lab.sim.counter.played", lang)}
              </span>
            </div>
            <ul className="sim-counter">
              {SIGNAL_LABELS.map((label) => (
                <li className={totals[label] === 0 ? "is-empty" : undefined}>
                  <div className="sim-counter__row">
                    <code>{label}</code>
                    <span className="lab-mono">{formatNumber(counts[label], lang, 0)} / {formatNumber(totals[label], lang, 0)}</span>
                  </div>
                  <span className="sim-counter__bar" aria-hidden="true">
                    <i style={{ width: `${rows.length ? (counts[label] / rows.length) * 100 : 0}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="lab-panel sim-page__readout" aria-labelledby="sim-readout-title">
            <div className="lab-panel__head">
              <h3 id="sim-readout-title">{t("lab.sim.cursorAt", lang)}</h3>
              <span className="lab-mono">{cursorLabel}</span>
            </div>
            <dl className="sim-readout">
              <div><dt>{t("lab.sim.readout.state", lang)}</dt><dd><code>{current.fsm_state}</code> <RegimeChip lang={lang} regime={current.moving === 1 ? "movement" : "rest"} /></dd></div>
              <div><dt>{t("lab.sim.readout.label", lang)}</dt><dd><code>{current.label}</code></dd></div>
              <div><dt>{t("lab.sim.signal.level", lang)}</dt><dd className="lab-mono">{formatNumber(current.level_liters, lang, 1)} L</dd></div>
              <div><dt>{t("lab.sim.signal.pressure", lang)}</dt><dd className="lab-mono">{formatNumber(current.pressure_kpa, lang, 3)} kPa</dd></div>
            </dl>
          </section>

          <section className="lab-panel sim-page__export" aria-labelledby="sim-export-title">
            <div className="lab-panel__head"><h3 id="sim-export-title">{t("lab.sim.export.title", lang)}</h3></div>
            <div className="sim-export">
              <Button
                type="button"
                variant="primary"
                onClick={() => downloadCsv(`oilguard-sim-${scenario}-seed${fixtureSeedValue}.csv`, rowsToCsv(rows))}
              >
                <Icon name="download" /> {t("lab.sim.export.csv", lang)}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!live || send.status === "sending"}
                title={live ? undefined : t("lab.sim.send.reason", lang)}
                onClick={() => void sendToBackend()}
              >
                {t(send.status === "sending" ? "lab.sim.sending" : "lab.sim.send", lang)}
              </Button>
            </div>
            <p className="lab-note">{t("lab.sim.export.note", lang)}</p>
            {!live && <p className="lab-note sim-export__reason">{t("lab.sim.send.reason", lang)}</p>}
            {live && <p className="lab-note">{t("lab.sim.send.note", lang)}</p>}
            <p className="lab-note" aria-live="polite">
              {send.status === "done" && t("lab.sim.send.result", lang, { count: formatNumber(send.accepted, lang, 0), rows: formatNumber(send.rejected, lang, 0) })}
              {send.status === "error" && t("lab.sim.send.failed", lang, { message: send.message })}
            </p>
          </section>
          </div>

          <section className="lab-panel sim-page__cli" aria-labelledby="sim-cli-title">
            <div className="lab-panel__head"><h3 id="sim-cli-title">{t("lab.sim.cli.title", lang)}</h3></div>
            <div className="sim-cli">
              {(["python", "rust"] as const).map((kind) => (
                <div className="sim-cli__block">
                  <div className="sim-cli__head">
                    <span className="og-label">{t(`lab.sim.cli.${kind}`, lang)}</span>
                    <Button type="button" variant="ghost" onClick={() => void copy(kind)}>
                      {t(copied === kind ? "lab.sim.cli.copied" : "lab.sim.cli.copy", lang)}
                    </Button>
                  </div>
                  <pre tabIndex={0}><code>{commands[kind]}</code></pre>
                </div>
              ))}
            </div>
            <p className="lab-note">{t("lab.sim.cli.note", lang)}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
