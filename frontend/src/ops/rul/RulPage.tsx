import { useEffect, useMemo, useState } from "preact/hooks";
import { demoDataset, type DemoWheel } from "../../demo/dataset";
import { getRul, type RulData } from "../../sim/api";
import { formatNumber } from "../../i18n/numberFormat";
import { t, useLang } from "../../i18n";
import {
  FilterBar, PageHeader, SegmentedControl, Sparkline, SyntheticBadge,
} from "../../ui/foundation";
import { classifyRulHorizon } from "../../dash/rulHorizon";
import { convertRulHours, filterProjectedRul, sortRulCards, type RulCard, type RulUnit } from "./logic";
import "./rul.css";

type RulViewCard = RulCard & {
  wheel: DemoWheel;
  source: "DEMO" | "LIVE";
  hoursToWarning: number | null;
  horizonClass: "critical" | "warning" | "beyond" | null;
  lossRate: number;
  referenceLevel: number;
  sigma: number;
  projection: number[];
  confidence: number | null;
};

const CRITICAL_L = 95 * 0.3;
const WARNING_L = 95 * 0.5;

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
      lossRate: wheel.lossRateLPer100h,
      referenceLevel: wheel.levelL,
      sigma: wheel.sigmaL,
      projection: [],
      confidence: data.confidence,
    };
  }
  const hoursToCritical = data.hours_to_critical;
  const hoursToWarning = data.hours_to_warning;
  const projected = true;
  const horizonClass = classifyRulHorizon(hoursToCritical, hoursToWarning);
  const projection = Array.from({ length: 8 }, (_, index) => Math.max(CRITICAL_L, data.current_level_L - ((data.current_level_L - CRITICAL_L) * index / 7)));
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
    sigma: wheel.sigmaL,
    projection,
    confidence: data.confidence,
  };
}

function horizonLabel(card: RulViewCard, lang: "en" | "es", unit: RulUnit): string {
  if (!card.projected || card.horizonHours === null) return t("rul.suppressed", lang);
  return `${formatNumber(convertRulHours(card.horizonHours, unit), lang, unit === "hours" ? 1 : 0)} ${t(`rul.unit.${unit}`, lang)}`;
}

export default function RulPage() {
  const [lang] = useLang();
  const [unit, setUnit] = useState<RulUnit>("hours");
  const [onlyProjected, setOnlyProjected] = useState(false);
  const [liveRul, setLiveRul] = useState<RulData | null>(null);
  const [liveLoaded, setLiveLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void getRul("wheel-RH-01").then((response) => {
      if (active) {
        setLiveRul(response.data);
        setLiveLoaded(true);
      }
    }).catch(() => {
      if (active) setLiveLoaded(false);
    });
    return () => { active = false; };
  }, []);

  const cards = useMemo(() => {
    const rows = demoDataset.wheels.map(demoCard);
    const liveWheel = demoDataset.wheels.find((wheel) => wheel.id === "wheel-RH-01");
    if (liveWheel && liveRul) {
      const index = rows.findIndex((card) => card.wheelId === liveWheel.id);
      if (index >= 0) rows[index] = liveCard(liveWheel, liveRul);
    }
    return filterProjectedRul(sortRulCards(rows), onlyProjected);
  }, [liveRul, onlyProjected]);

  return (
    <main className="og-page og-rul-page">
      <div className="og-page__inner">
        <PageHeader
          eyebrow={t("rul.eyebrow", lang)}
          title={t("rul.title", lang)}
          description={t("rul.description", lang)}
          meta={<div className="og-rul-header-meta"><SyntheticBadge lang={lang} /><small>{liveLoaded ? t("rul.live", lang) : t("rul.demo", lang)}</small></div>}
        />
        <p className="og-rul-scope">{t("rul.scope", lang)}</p>
        <FilterBar>
          <SegmentedControl
            options={(["hours", "cycles", "shifts"] as RulUnit[]).map((option) => t(`rul.unit.${option}`, lang))}
            value={t(`rul.unit.${unit}`, lang)}
            onChange={(value) => {
              const next = (["hours", "cycles", "shifts"] as RulUnit[]).find((option) => t(`rul.unit.${option}`, lang) === value);
              if (next) setUnit(next);
            }}
          />
          <button type="button" className={`og-rul-filter ${onlyProjected ? "is-active" : ""}`} aria-pressed={onlyProjected} onClick={() => setOnlyProjected((value) => !value)}>
            {onlyProjected ? t("rul.filter.projected", lang) : t("rul.filter.all", lang)}
          </button>
        </FilterBar>
        <section className="og-rul-grid" aria-label={t("rul.title", lang)}>
          {cards.map((card) => (
            <article className={`og-rul-card og-rul-card--${card.horizonClass ?? "suppressed"}`}>
              <header className="og-rul-card__header">
                <div><strong>{card.wheel.truckId} · {card.wheel.position}</strong><small className="og-mono">{card.wheelId}</small></div>
                <span className={`og-rul-source og-rul-source--${card.source.toLowerCase()}`}>{card.source}</span>
              </header>
              <div className="og-rul-card__horizon">
                <span className="og-label">{t("rul.horizon", lang)}</span>
                <strong>{horizonLabel(card, lang, unit)}</strong>
                {card.projected && card.horizonHours !== null && <small>±{formatNumber(convertRulHours(card.horizonHours * 0.1, unit), lang, unit === "hours" ? 1 : 0)} {t(`rul.unit.${unit}`, lang)}</small>}
                {card.horizonClass && <b>{t(`rul.${card.horizonClass}`, lang)}</b>}
              </div>
              <div className="og-rul-card__metrics">
                <span>{t("rul.lossRate", lang)} <b>{formatNumber(card.lossRate, lang, 2)} L/100 h</b></span>
                <span>{t("rul.referenceLevel", lang)} <b>{formatNumber(card.referenceLevel, lang, 1)} ± {formatNumber(card.sigma, lang, 1)} L</b></span>
                {card.confidence !== null && <span>R² <b>{formatNumber(card.confidence, lang, 3)}</b></span>}
              </div>
              {card.projected ? (
                <div className="og-rul-projection">
                  <Sparkline lang={lang} values={card.projection} label={`${t("rul.projection", lang)} ${card.wheelId}`} />
                  <small>{t("rul.projection", lang)} · 30%</small>
                </div>
              ) : (
                <p className="og-rul-suppressed">{t("rul.suppressed", lang)}</p>
              )}
              <footer><span className="og-chip">{card.source}</span><small>{card.wheel.model}</small></footer>
            </article>
          ))}
        </section>
        <section className="og-rul-assumptions">
          <h3>{t("rul.assumptions", lang)}</h3>
          <p>{t("rul.assumptionsText", lang)}</p>
        </section>
      </div>
    </main>
  );
}
