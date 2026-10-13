import { useEffect, useMemo, useState } from "preact/hooks";
import { demoDataset, type DemoWheel } from "../../demo/demoData";
import { getRul, type RulData, type RulDataOk, type RulResponse } from "../../sim/api";
import { formatNumber } from "../../i18n/numberFormat";
import { t } from "../../i18n";
import BackendOutageNotice from "../../ui/BackendOutageNotice";
import {
  FilterBar, PageHeader, ProvenanceTag, SegmentedControl, SyntheticBadge, TimeSeriesChart,
} from "../../ui/foundation";
import { localizeUnevaluatedReason } from "../../dash/evaluationReason";
import { translateStructuredBackendMessage } from "../../dash/backendNotes";
import { classifyRulHorizon } from "../../dash/rulHorizon";
import { convertRulHours, filterProjectedRul, sortRulCards, type RulCard, type RulUnit } from "./logic";
import "./rul.css";

type RulViewCard = RulCard & {
  wheel: DemoWheel;
  source: "DEMO" | "LIVE";
  hoursToWarning: number | null;
  horizonClass: "critical" | "warning" | "beyond" | null;
  lossRate: number | null;
  referenceLevel: number | null;
  sigma: number | null;
  projection: number[];
  confidence: number | null;
};

const CRITICAL_L = 95 * 0.3;
const WARNING_L = 95 * 0.5;
const PLOT_START = 28;
const PLOT_END = 572;

type RulForecast = {
  data: RulDataOk;
  confidenceLevel: number;
  hoursLow: number;
  hoursHigh: number;
  slopeLow: number;
  slopeHigh: number;
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getRulForecast(response: RulResponse | null): RulForecast | null {
  if (response?.status !== "ok" || !response.evaluated || response.data.status !== "ok") return null;
  const { data } = response;
  const band = data.confidence_band;
  if (!band) return null;
  const { hours_to_critical_low: hoursLow, hours_to_critical_high: hoursHigh } = band;
  const { slope_low_L_per_h: slopeLow, slope_high_L_per_h: slopeHigh } = band;
  if (
    !finite(data.hours) || data.hours < 0 || !finite(data.slope_L_per_h) || !finite(band.level) || band.level <= 0 || band.level > 1
    || !finite(hoursLow) || !finite(hoursHigh) || hoursLow < 0 || hoursLow > hoursHigh
    || !finite(slopeLow) || !finite(slopeHigh) || slopeLow > slopeHigh
  ) return null;
  return { data, confidenceLevel: band.level, hoursLow, hoursHigh, slopeLow, slopeHigh };
}

function forecastUnavailableReason(response: RulResponse | null): string {
  if (!response) return t("rul.unavailable");
  const { data } = response;
  const reason = translateStructuredBackendMessage(data.reason_message);
  if (reason) return reason;
  const note = translateStructuredBackendMessage(data.note_message);
  if (note) return note;
  const bandReason = data.status === "ok"
    ? data.confidence_band?.hours_to_critical_low_reason ?? data.confidence_band?.hours_to_critical_high_reason
    : undefined;
  const localizedBandReason = localizeUnevaluatedReason(bandReason);
  if (localizedBandReason) return localizedBandReason;
  if (response.status === "ok" && response.evaluated && data.status === "ok") {
    return t("rul.band.unavailable");
  }
  return localizeUnevaluatedReason(data.reason ?? response.reason)
    ?? (data.status === "suppressed" ? t("rul.suppressedNote") : t("rul.unavailable"));
}

function position(value: number, min: number, max: number): number {
  return PLOT_START + ((value - min) / (max - min)) * (PLOT_END - PLOT_START);
}

function bandDomain(low: number, high: number, estimate: number, includeZero = false): [number, number] {
  const baseMin = includeZero ? Math.min(low, estimate, 0) : 0;
  const baseMax = includeZero ? Math.max(high, estimate, 0) : Math.max(high, estimate);
  const padding = Math.max((baseMax - baseMin) * 0.12, 0.01);
  return [baseMin - (includeZero ? padding : 0), baseMax + padding];
}

function BandTrack({
  kind,
  low,
  high,
  estimate,
}: {
  kind: "hours" | "slope";
  low: number;
  high: number;
  estimate: number;
}) {
  const includesZero = kind === "slope";
  const [min, max] = bandDomain(low, high, estimate, includesZero);
  const lowX = position(low, min, max);
  const highX = position(high, min, max);
  const estimateX = position(estimate, min, max);
  const zeroX = includesZero ? position(0, min, max) : PLOT_START;
  const label = kind === "hours"
    ? t("rul.band.hoursLabel")
    : t("rul.band.slopeLabel");
  const lowLabel = formatNumber(low, 2);
  const highLabel = formatNumber(high, 2);
  const estimateLabel = formatNumber(estimate, 2);
  const units = kind === "hours" ? t("rul.unit.hours") : "L/h";
  const description = `${t(kind === "hours" ? "rul.band.hoursDescription" : "rul.band.slopeDescription")}: ${lowLabel} a ${highLabel} ${units}; ${t("rul.band.estimate")} ${estimateLabel} ${units}.`;

  return (
    <section className={`og-rul-band-interval og-rul-band-interval--${kind}`} aria-label={label}>
      <div className="og-rul-band-interval__head">
        <h3>{label}</h3>
        <p>
          <span>{lowLabel}–{highLabel} {units}</span>
          <b>{t("rul.band.estimate")} {estimateLabel} {units}</b>
        </p>
      </div>
      <svg className="og-rul-band-interval__plot" viewBox="0 0 600 52" role="img" aria-label={description}>
        <line className="og-rul-band__baseline" x1={PLOT_START} x2={PLOT_END} y1="26" y2="26" />
        {includesZero && <line className="og-rul-band__zero" x1={zeroX} x2={zeroX} y1="7" y2="45" />}
        <rect className="og-rul-band__range" x={lowX} y="18" width={Math.max(1, highX - lowX)} height="16" rx="2" />
        <line className="og-rul-band__estimate" x1={estimateX} x2={estimateX} y1="10" y2="42" />
        <circle className="og-rul-band__marker" cx={estimateX} cy="26" r="5" />
      </svg>
    </section>
  );
}

export function RulForecastPanel({ response }: { response: RulResponse | null }) {
  const forecast = getRulForecast(response);
  if (!forecast) {
    return <p className="og-rul-band-unavailable" role="status">{forecastUnavailableReason(response)}</p>;
  }
  const confidence = formatNumber(forecast.confidenceLevel * 100, 0);
  const note = translateStructuredBackendMessage(forecast.data.note_message) ?? t("rul.band.syntheticNote");

  return (
    <figure className="og-rul-band-chart">
      <figcaption>{t("rul.band.title")}</figcaption>
      <p className="og-rul-band-chart__confidence">{t("rul.band.confidence", { level: confidence })}</p>
      <p className="og-rul-band-chart__note">{note}</p>
      <BandTrack kind="hours" low={forecast.hoursLow} high={forecast.hoursHigh} estimate={forecast.data.hours} />
      <BandTrack kind="slope" low={forecast.slopeLow} high={forecast.slopeHigh} estimate={forecast.data.slope_L_per_h} />
      <p className="og-rul-band-chart__zero">{t("rul.band.zeroReference")}</p>
    </figure>
  );
}

function demoCard(wheel: DemoWheel): RulViewCard {
  const rate = wheel.lossRateLPer100h / 100;
  const projected = wheel.validated && rate > 0.001 && wheel.state !== "out-of-service";
  const hoursToCritical = projected ? Math.max(0, (wheel.levelL - CRITICAL_L) / rate) : null;
  const hoursToWarning = projected ? Math.max(0, (wheel.levelL - WARNING_L) / rate) : null;
  const horizonClass = projected && hoursToCritical !== null && hoursToWarning !== null
    ? classifyRulHorizon(hoursToCritical, hoursToWarning)
    : null;
  const projection = projected
    ? Array.from({ length: 8 }, (_, index) => Math.max(CRITICAL_L, wheel.levelL - ((wheel.levelL - CRITICAL_L) * index / 7)))
    : [];
  return {
    wheelId: wheel.id,
    wheel,
    source: "DEMO",
    horizonHours: hoursToCritical,
    hoursToWarning,
    projected,
    horizonClass,
    lossRate: wheel.lossRateLPer100h,
    referenceLevel: wheel.levelL,
    sigma: wheel.sigmaL,
    projection,
    confidence: null,
  };
}

function liveCard(wheel: DemoWheel, data: RulData): RulViewCard {
  if (data.status !== "ok") {
    return {
      wheelId: wheel.id,
      wheel,
      source: "LIVE",
      horizonHours: null,
      hoursToWarning: null,
      projected: false,
      horizonClass: null,
      lossRate: null,
      referenceLevel: null,
      sigma: null,
      projection: [],
      confidence: null,
    };
  }
  const hoursToCritical = data.hours_to_critical;
  const hoursToWarning = data.hours_to_warning;
  const projected = true;
  const horizonClass = classifyRulHorizon(hoursToCritical, hoursToWarning);
  return {
    wheelId: wheel.id,
    wheel,
    source: "LIVE",
    horizonHours: hoursToCritical,
    hoursToWarning,
    projected,
    horizonClass,
    lossRate: Math.abs(data.slope_L_per_h) * 100,
    referenceLevel: data.current_level_L,
    sigma: null,
    projection: [],
    confidence: data.r2,
  };
}

function horizonLabel(card: RulViewCard, unit: RulUnit): string {
  if (!card.projected || card.horizonHours === null) return t("rul.suppressed");
  return `${formatNumber(convertRulHours(card.horizonHours, unit), unit === "hours" ? 1 : 0)} ${t(`rul.unit.${unit}`)}`;
}

function sourceLabel(source: RulViewCard["source"]): string {
  return source === "LIVE" ? t("rul.source.live") : source;
}

type RulBackendState = "checking" | "live" | "unavailable";

export function RulBackendOutageNotice({ backendState }: { backendState: RulBackendState }) {
  return backendState === "unavailable" ? <BackendOutageNotice /> : null;
}

export default function RulPage() {
  const [unit, setUnit] = useState<RulUnit>("hours");
  const [onlyProjected, setOnlyProjected] = useState(false);
  const [liveRul, setLiveRul] = useState<RulResponse | null>(null);
  const [backendState, setBackendState] = useState<RulBackendState>("checking");

  useEffect(() => {
    let active = true;
    void getRul("wheel-RH-01").then((response) => {
      if (active) {
        setLiveRul(response);
        setBackendState("live");
      }
    }).catch(() => {
      if (active) setBackendState("unavailable");
    });
    return () => { active = false; };
  }, []);

  const cards = useMemo(() => {
    const rows = demoDataset.wheels.map(demoCard);
    const liveWheel = demoDataset.wheels.find((wheel) => wheel.id === "wheel-RH-01");
    if (liveWheel && liveRul?.status === "ok" && liveRul.evaluated) {
      const index = rows.findIndex((card) => card.wheelId === liveWheel.id);
      if (index >= 0) rows[index] = liveCard(liveWheel, liveRul.data);
    }
    return filterProjectedRul(sortRulCards(rows), onlyProjected);
  }, [liveRul, onlyProjected]);

  return (
    <main className="og-page og-rul-page">
      <div className="og-page__inner">
        <PageHeader
          eyebrow={t("rul.eyebrow")}
          title={t("rul.title")}
          description={t("rul.description")}
          meta={<div className="og-rul-header-meta"><SyntheticBadge /><small>{backendState === "live" ? t("rul.live") : t("rul.demo")}</small></div>}
        />
        <RulBackendOutageNotice backendState={backendState} />
        <p className="og-rul-scope">{t("rul.scope")}</p>
        <RulForecastPanel response={liveRul} />
        <FilterBar>
          <SegmentedControl
            options={(["hours", "cycles", "shifts"] as RulUnit[]).map((option) => t(`rul.unit.${option}`))}
            value={t(`rul.unit.${unit}`)}
            onChange={(value) => {
              const next = (["hours", "cycles", "shifts"] as RulUnit[]).find((option) => t(`rul.unit.${option}`) === value);
              if (next) setUnit(next);
            }}
          />
          <button type="button" className={`og-rul-filter ${onlyProjected ? "is-active" : ""}`} aria-pressed={onlyProjected} onClick={() => setOnlyProjected((value) => !value)}>
            {onlyProjected ? t("rul.filter.projected") : t("rul.filter.all")}
          </button>
        </FilterBar>
        <details className="og-rul-disclosure">
          <summary>{t("rul.secondaryDisclosure")}</summary>
          <section className="og-rul-grid" aria-label={t("rul.title")}>
            {cards.map((card) => (
              <article className={`og-rul-card og-rul-card--${card.horizonClass ?? "suppressed"}`}>
                <header className="og-rul-card__header">
                  <div><strong>{card.wheel.truckId} · {card.wheel.position}</strong><small className="og-mono">{card.wheelId}</small></div>
                  <span className={`og-rul-source og-rul-source--${card.source.toLowerCase()}`}>
                    {sourceLabel(card.source)}
                  </span>
                </header>
                <div className="og-rul-card__horizon">
                  <span className="og-label">{t("rul.horizon")}</span>
                  <strong>{horizonLabel(card, unit)} <ProvenanceTag value={card.source === "LIVE" ? "EN VIVO" : "DEMO"} /></strong>
                  {card.source === "DEMO" && card.projected && card.horizonHours !== null && <small>±{formatNumber(convertRulHours(card.horizonHours * 0.1, unit), unit === "hours" ? 1 : 0)} {t(`rul.unit.${unit}`)} <ProvenanceTag value="DEMO" /></small>}
                  {card.horizonClass && <b>{t(`rul.${card.horizonClass}`)}</b>}
                </div>
                <div className="og-rul-card__metrics">
                  {card.lossRate !== null && <span>{t("rul.lossRate")} <b>{formatNumber(card.lossRate, 2)} L/100 h <ProvenanceTag value={card.source === "LIVE" ? "EN VIVO" : "DEMO"} /></b></span>}
                  {card.referenceLevel !== null && <span>{t("rul.referenceLevel")} <b>{formatNumber(card.referenceLevel, 1)}{card.sigma !== null ? ` ± ${formatNumber(card.sigma, 1)}` : ""} L <ProvenanceTag value={card.source === "LIVE" ? "EN VIVO" : "DEMO"} /></b></span>}
                  {card.confidence !== null && <span>R² <b>{formatNumber(card.confidence, 3)} <ProvenanceTag value="EN VIVO" /></b></span>}
                </div>
                {card.source === "LIVE" && card.projected ? (
                  <p className="og-rul-suppressed">{t("rul.band.seeSummary")}</p>
                ) : card.projected ? (
                  <details className="og-rul-projection">
                    <summary>{t("rul.projection")} · 30% <ProvenanceTag value="CONFIGURACIÓN" /></summary>
                    <TimeSeriesChart
                      values={card.projection}
                      sigma={card.sigma !== null ? card.projection.map(() => card.sigma ?? 0) : []}
                      title={`${t("rul.projection")} ${card.wheelId}`}
                      domain={[0, 95]}
                      yUnit="L"
                      thresholds={[
                        { value: WARNING_L, label: <>{t("history.threshold.warning")} <ProvenanceTag value="CONFIGURACIÓN" /></> },
                        { value: CRITICAL_L, label: <>{t("history.threshold.critical")} <ProvenanceTag value="CONFIGURACIÓN" /></> },
                      ]}
                      height={112}
                    />
                  </details>
                ) : (
                  <p className="og-rul-suppressed">{t("rul.suppressed")}</p>
                )}
                <footer><span className="og-chip">{sourceLabel(card.source)}</span><small>{card.wheel.model}</small></footer>
              </article>
            ))}
          </section>
        </details>
        <section className="og-rul-assumptions">
          <h3>{t("rul.assumptions")}</h3>
          <p>{t("rul.assumptionsText")}</p>
        </section>
      </div>
    </main>
  );
}
