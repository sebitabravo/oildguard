import { useEffect, useState } from "preact/hooks";
import { t } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { ProvenanceTag, SyntheticBadge, SyncChart } from "../../ui/foundation";
import scenarios from "../../lab/fixtures/scenarios.json";
import { makeTelemetrySeries, type TelemetryReading } from "./logic";
import { beatById, BEATS, type Beat, type BeatId } from "./beats";
import LandingScene from "./LandingScene";
import { resolveStoryState, type StoryBeatRange } from "./storyProgress";
import "./landing.css";

type FixtureRow = (number | string)[];
const fixtureRows = (scenarios.scenarios["abrupt-drop"].rows as FixtureRow[]).map((row) => ({
  t_s: Number(row[0]),
  pressure_kpa: Number(row[11]),
  temperature_c: Number(row[12]),
  vib_rms_g: Number(row[13]),
  level_liters: Number(row[15]),
}));
const chartReadings = makeTelemetrySeries<TelemetryReading>(fixtureRows, 48);

function key(value: string) {
  return value as Parameters<typeof t>[0];
}

function TelemetryChart() {
  const levelValues = chartReadings.map((reading) => reading.level_liters);
  const pressureValues = chartReadings.map((reading) => reading.pressure_kpa);
  const latest = chartReadings[chartReadings.length - 1];
  const pressureDomain: [number, number] = [Math.min(...pressureValues) - 3, Math.max(...pressureValues) + 3];
  const levelDomain: [number, number] = [0, 95];
  return <article className="landing__chart" aria-label={t("landing.chartAlt")}>
    <header className="landing__chart-head"><div><span className="landing__micro">{t("landing.chartTitle")}</span><strong>{t("landing.chartWheel")} · {t("landing.chartScenario")}</strong></div><SyntheticBadge /></header>
    <div className="landing__chart-legend"><span><i className="landing__legend-level" />{t("landing.legendLevel")}</span><span><i className="landing__legend-pressure" />{t("landing.legendPressure")}</span><span><i className="landing__legend-band" />± {t("landing.legendBand")}</span></div>
    <SyncChart

      title={t("landing.chartPlotAlt")}
      height={190}
      xLabels={["0 s", `${formatNumber(15, 0)} s`, `${formatNumber(30, 0)} s`]}
      series={[
        { name: t("landing.legendPressure"), values: pressureValues, unit: "kPa", domain: pressureDomain, color: "var(--og-blue)", decimals: 1 },
        { name: t("landing.legendLevel"), values: levelValues, unit: "L", sigma: levelValues.map(() => 0.8), axis: "right", domain: levelDomain, color: "var(--og-accent)", decimals: 1 },
      ]}
    />
    <div className="landing__chart-readouts">
      <div><span>{t("landing.temperatureReadout")}</span><strong>{formatNumber(latest.temperature_c, 1)} °C</strong></div>
      <div><span>{t("landing.vibrationReadout")}</span><strong>{formatNumber(latest.vib_rms_g, 3)} g</strong></div>
      <div><span>{t("landing.levelReadout")}</span><strong>{formatNumber(latest.level_liters, 1)} L</strong></div>
    </div>
    <p className="landing__chart-note"><SyntheticBadge /> {t("landing.chartSource")}</p>
  </article>;
}

// Encabezado de beat: cada sección pinta título y cuerpo desde beats.ts,
// así la estructura narrativa y la copia comparten una sola definición.
function BeatHeading({ beat, index }: { beat: Beat; index: string }) {
  return <div className="landing__section-heading"><span className="landing__index">{index}</span><div><h2>{t(beat.titleKey)}</h2><p>{t(beat.bodyKey)}</p></div></div>;
}

export default function Landing() {
  // Solo español (S03): el shell sirve español sin ?lang ni guardado; el
  // relato por scroll sigue intacto para S04.
  // El relato sigue al scroll nativo: el beat activo solo pinta, nunca mueve.
  const [activeBeat, setActiveBeat] = useState<BeatId>("intro");
  const [activeProgress, setActiveProgress] = useState(0);
  const n = (value: number, digits = 0) => formatNumber(value, digits);
  useEffect(() => {
    // Lector pasivo del relato: mide secciones y resuelve el beat activo
    // con storyProgress, sin preventDefault ni scroll programático.
    let ticking = false;
    let raf = 0;
    const readRanges = (): StoryBeatRange[] => {
      const groups = new Map<BeatId, { top: number; bottom: number }>();
      const base = window.scrollY;
      for (const node of Array.from(document.querySelectorAll("[data-beat]"))) {
        const id = node.getAttribute("data-beat") as BeatId | null;
        if (id === null) continue;
        const rect = (node as HTMLElement).getBoundingClientRect();
        const top = rect.top + base;
        const bottom = rect.bottom + base;
        const prev = groups.get(id);
        if (!prev) groups.set(id, { top, bottom });
        else groups.set(id, { top: Math.min(prev.top, top), bottom: Math.max(prev.bottom, bottom) });
      }
      const ranges: StoryBeatRange[] = [];
      for (const beat of BEATS) {
        const found = groups.get(beat.id);
        if (found) ranges.push({ id: beat.id, top: found.top, bottom: found.bottom });
      }
      return ranges;
    };
    const update = (): void => {
      ticking = false;
      try {
        const ranges = readRanges();
        if (ranges.length === 0) return;
        const state = resolveStoryState(window.scrollY, window.innerHeight || 800, ranges);
        setActiveBeat((prev) => (prev === state.activeBeat ? prev : state.activeBeat));
        setActiveProgress((prev) => (Math.abs(prev - state.progress) < 0.001 ? prev : state.progress));
      } catch {
        return;
      }
    };
    const onScroll = (): void => {
      if (ticking) return;
      ticking = true;
      raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  const intro = beatById("intro");
  const problem = beatById("problem");
  const regimes = beatById("regimes");
  const sensing = beatById("sensing");
  const signalPath = beatById("pipeline");
  const response = beatById("response");
  const evidence = beatById("evidence");
  const scope = beatById("scope");

  const navItems = [
    ["landing.navProposal", "#approach"], ["landing.navTelemetry", "#telemetry"],
    ["landing.navTechnology", "#sensing"], ["landing.navAlerts", "#alerts"],
    ["landing.navImpact", "#evidence"], ["landing.navTeam", "#team"],
  ] as const;
  const team = ["landing.memberAtuan", "landing.memberAros", "landing.memberBravo", "landing.memberFernandez"];
  const sensors = ["landing.sensorPressure", "landing.sensorThermocouple", "landing.sensorMems", "landing.sensorSpeed"];
  const pipeline = [
    ["landing.pipeRust", "10 Hz"], ["landing.pipeMqtt", "QoS 1"], ["landing.pipeApi", "HMAC"],
    ["landing.pipeInflux", "retention policy"], ["landing.pipeDashboard", "Astro + Preact"],
  ];
  const bulletsLeft = ["landing.comparePmOne", "landing.comparePmTwo", "landing.comparePmThree"];
  const bulletsRight = ["landing.compareOgOne", "landing.compareOgTwo", "landing.compareOgThree"];
  const levels = [1, 2, 3, 4];
  // Progreso por escena para el relato: la activa refleja el scroll y las
  // demás quedan en 0/1 según estén por venir o ya pasadas, reversible.
  const activeIndex = BEATS.findIndex((beat) => beat.id === activeBeat);
  const sceneStory = (beatId: BeatId): { progress: number; active: boolean } => {
    const index = BEATS.findIndex((beat) => beat.id === beatId);
    if (beatId === activeBeat) return { progress: activeProgress, active: true };
    return { progress: index < activeIndex ? 1 : 0, active: false };
  };
  const assemblyStory = sceneStory("intro");
  const cycleStory = sceneStory("regimes");
  const sensorsStory = sceneStory("sensing");
  const oilStory = sceneStory("evidence");
  const beatActive = (beatId: BeatId): "true" | "false" => (activeBeat === beatId ? "true" : "false");
  return <div className="landing" data-active-beat={activeBeat}>
    <header className="landing__top">
      <a className="landing__brand" href="/" aria-label={t("landing.brand")}><span className="landing__mark">OG</span><span><strong>{t("landing.brand")}</strong><small>{t("landing.brandLine")}</small></span></a>
      <nav className="landing__nav" aria-label={t("landing.primaryNavigation")}>{navItems.map(([label, href]) => <a href={href}>{t(key(label))}</a>)}</nav>
      <div className="landing__top-actions"><span className="landing__status"><i />{t("landing.statusReadOnly")}</span><a className="landing__top-cta" href="/fleet">{t("landing.navDemo")} <span aria-hidden="true">↗</span></a></div>
    </header>
    <main>
      <h1 className="og-visually-hidden">{t("landing.pageTitle")}</h1>
      <section className="landing__hero" data-beat={intro.id} data-beat-active={beatActive(intro.id)} id={intro.anchor} aria-labelledby="landing-title">
        <div className="landing__hero-copy"><p className="landing__eyebrow"><span />{t("landing.heroEyebrow")}</p><h2 id="landing-title">{t(intro.titleKey)}</h2><p className="landing__lede">{t(intro.bodyKey)}</p><div className="landing__actions"><a className="landing__button landing__button--primary" href="/fleet">{t("landing.openDemo")} <span>↗</span></a><a className="landing__button landing__button--secondary" href="/login">{t("landing.signIn")}</a></div><p className="landing__hero-note"><span className="landing__pulse" />{t("landing.heroNote")}</p></div>
        <div className="landing__hero-art"><LandingScene scene="assembly" storyBeat="intro" storyProgress={assemblyStory.progress} storyActive={assemblyStory.active} /></div>
      </section>
      <section className="landing__facts" aria-label={t("landing.factsTitle")}>
        <article><span>{t("landing.factPm")}</span><strong>{n(250)} <small>h</small></strong><ProvenanceTag value="ASSUMPTION" /></article>
        <article><span>{t("landing.factRate")}</span><strong>{n(10)} <small>Hz</small></strong><ProvenanceTag value="VERIFIED" /></article>
        <article><span>{t("landing.factReservoir")}</span><strong>{n(95)} <small>L · SAE 85W-140</small></strong><ProvenanceTag value="VERIFIED" /></article>
        <article><span>{t("landing.factLevels")}</span><strong>N1–N4 <small>{t("landing.readOnly")}</small></strong><ProvenanceTag value="VERIFIED" /></article>
      </section>
      <section className="landing__section" id={problem.anchor} data-beat={problem.id} data-beat-active={beatActive(problem.id)}>
        <BeatHeading beat={problem} index={`01 / ${t("landing.navProposal")}`} />
        <div className="landing__comparison">
          <article className="landing__compare landing__compare--pm"><header><div><span className="landing__micro">01 / {t("landing.compareLabel")}</span><h3>{t("landing.conventionalTitle")}</h3></div><span className="landing__compare-tag">{t("landing.periodicTag")}</span></header><div className="landing__mini-timeline"><div className="landing__timeline-track"><i /><b>{t("landing.inspection")}</b><i /></div><div className="landing__timeline-labels"><span>0 h</span><span>{n(250)} h</span></div><div className="landing__blind-window">{t("landing.blindWindow")}</div></div><ul>{bulletsLeft.map((item) => <li><span>—</span>{t(key(item))}</li>)}</ul></article>
          <article className="landing__compare landing__compare--og"><header><div><span className="landing__micro">02 / {t("landing.compareLabel")}</span><h3>{t("landing.oilguardTitle")}</h3></div><span className="landing__compare-tag">{t("landing.modelTag")}</span></header><div className="landing__mini-timeline landing__mini-timeline--continuous"><div className="landing__estimate-band"/><svg viewBox="0 0 330 68" preserveAspectRatio="none"><path d="M0 45 C34 39,50 42,77 34 S125 26,160 31 S211 21,242 27 S293 19,330 15"/></svg><div className="landing__timeline-labels"><span>0 h</span><span>{n(250)} h</span></div></div><ul>{bulletsRight.map((item) => <li><span>+</span>{t(key(item))}</li>)}</ul></article>
        </div>
        <aside className="landing__scope-banner"><span className="landing__banner-mark">i</span><div><strong>{t("landing.scopeTitle")}</strong><p>{t("landing.scopeBody")}</p></div><a href="/docs/thesis-annex.md">{t("landing.scopeLink")} <span>↗</span></a></aside>
      </section>
      <section className="landing__section landing__telemetry-section" id={regimes.anchor} data-beat={regimes.id} data-beat-active={beatActive(regimes.id)}>
        <BeatHeading beat={regimes} index={`02 / ${t("landing.navTelemetry")}`} />
        <div className="landing__regime-layout"><div className="landing__regimes"><article><span className="landing__regime-number">01</span><div><span className="landing__micro">{t("landing.motionTag")}</span><h3>{t("landing.motionTitle")}</h3><p>{t("landing.motionBody")}</p><ProvenanceTag value="DERIVED" /></div></article><article><span className="landing__regime-number">02</span><div><span className="landing__micro">{t("landing.restTag")}</span><h3>{t("landing.restTitle")}</h3><p>{t("landing.restBody")}</p><ProvenanceTag value="ASSUMPTION" /></div></article><a href="/calibration" className="landing__calibration-link">{t("landing.calibrationLink")} <span>↗</span></a></div><TelemetryChart/></div><LandingScene scene="cycle" storyBeat="regimes" storyProgress={cycleStory.progress} storyActive={cycleStory.active} />
      </section>
      <section className="landing__section" id={sensing.anchor} data-beat={sensing.id} data-beat-active={beatActive(sensing.id)}>
        <BeatHeading beat={sensing} index={`03 / ${t("landing.navTechnology")}`} />
        <div className="landing__mount-table-wrap"><p className="landing__mount-table-cue">{t("landing.tableScrollCue")}</p><div className="landing__mount-table-scroll"><table className="landing__mount-table"><thead><tr><th>{t("landing.tablePoint")}</th><th>{t("landing.tableSensor")}</th><th>{t("landing.tableMount")}</th><th>{t("landing.tableStatus")}</th></tr></thead><tbody>{sensors.map((sensor, index) => <tr><td>GDY106 / 0{index + 1}</td><td>{t(key(sensor))}</td><td>{t(key(["landing.mountThreaded", "landing.mountSurface", "landing.mountSurface", "landing.mountReference"][index]))}</td><td><span className="landing__assumption-chip">{t("landing.designInput")}</span></td></tr>)}</tbody></table></div><p className="landing__table-note"><ProvenanceTag value="ASSUMPTION" /> {t("landing.mountNote")}</p></div>
        <div className="landing__sensor-line"><span>{t("landing.signalInputs")}</span><div>{sensors.map((sensor) => <span>{t(key(sensor))} <ProvenanceTag value="ASSUMPTION" /></span>)}</div></div><LandingScene scene="sensors" storyBeat="sensing" storyProgress={sensorsStory.progress} storyActive={sensorsStory.active} />
      </section>
      <section className="landing__section" id={signalPath.anchor} data-beat={signalPath.id} data-beat-active={beatActive(signalPath.id)}>
        <BeatHeading beat={signalPath} index={`04 / ${t("landing.pipelineHeading")}`} />
        <div className="landing__pipeline"><h3>{t("landing.pipelineHeading")}</h3>{pipeline.map(([label, spec], index) => <div className="landing__pipe-row"><span className="landing__pipe-index">0{index + 1}</span><strong>{t(key(label))}</strong><span>{spec === "10 Hz" ? <><span>{n(10)} Hz</span> <ProvenanceTag value="CONFIGURACIÓN" /></> : spec === "retention policy" ? t("landing.retentionSpec") : spec}</span></div>)}</div>
      </section>
      <section className="landing__section" id={response.anchor} data-beat={response.id} data-beat-active={beatActive(response.id)}>
        <BeatHeading beat={response} index={`05 / ${t("landing.navAlerts")}`} />
        <div className="landing__ladder">{levels.map((level) => <article className={`landing__level landing__level--${level}`}><span className="landing__level-code">N{level}</span><h3>{t(key(`landing.n${level}Title`))}</h3><p>{t(key(`landing.n${level}Body`))}</p><span className="landing__recipient">{t(key(`landing.n${level}Recipient`))}</span></article>)}</div>
        <aside className="landing__rul-banner"><span className="landing__rul-icon">RUL</span><div><strong>{t("landing.rulTitle")}</strong><p>{t("landing.rulBody")}</p></div><ProvenanceTag value="ASSUMPTION" /></aside>
      </section>
      <section className="landing__section landing__evidence" id={evidence.anchor} data-beat={evidence.id} data-beat-active={beatActive(evidence.id)}>
        <BeatHeading beat={evidence} index={`06 / ${t("landing.navImpact")}`} />
        <div className="landing__evidence-grid"><a href="/docs/thesis-annex.md"><span className="landing__micro">{t("landing.evidenceSimulator")}</span><strong>{n(300)} <small>{t("landing.evidenceRows")}</small></strong><ProvenanceTag value="VERIFIED" /></a><a href="/docs/bench/stress.md"><span className="landing__micro">{t("landing.evidenceStress")} · {n(1000)} {t("landing.evidenceDevices")}</span><strong>{n(9699)} <small>{t("landing.evidenceRowsPerSecond")}</small></strong><ProvenanceTag value="DERIVED" /></a><a href="/docs/thesis-annex.md"><span className="landing__micro">{t("landing.evidenceValidation")}</span><strong>{n(1.8, 2)} <small>L MAE</small></strong><SyntheticBadge /></a><a href="/docs/thesis-annex.md"><span className="landing__micro">{t("landing.evidenceTests")}</span><strong>{t("landing.evidenceTestScope")}</strong><ProvenanceTag value="VERIFIED" /></a></div><LandingScene scene="oil" storyBeat="evidence" storyProgress={oilStory.progress} storyActive={oilStory.active} />
        <div className="landing__integrity-detail"><h3>{t("landing.securityTitle")}</h3><p>{t("landing.securityBody")}</p><div className="landing__security-grid"><article className="landing__integrity"><div><span>01</span><strong>{t("landing.securityHmac")}</strong><ProvenanceTag value="VERIFIED" /></div><div><span>02</span><strong>{t("landing.securityReplay")}</strong><ProvenanceTag value="VERIFIED" /></div><div><span>03</span><strong>{t("landing.securityReadonly")}</strong><ProvenanceTag value="VERIFIED" /></div><a href="/docs/thesis-annex.md">{t("landing.securityTests")} <span>↗</span></a></article><article className="landing__standards"><span className="landing__micro">{t("landing.standardsLabel")}</span><h3>{t("landing.standardsTitle")}</h3><p>{t("landing.standardReference")}</p><strong>{t("landing.notInPrototype")}</strong><ul><li>{t("landing.noAuth")}</li><li>{t("landing.noBrokerTls")}</li><li>{t("landing.noFieldData")}</li></ul></article></div></div>
      </section>
      <section className="landing__section landing__team-section" id={scope.anchor} data-beat={scope.id} data-beat-active={beatActive(scope.id)}><BeatHeading beat={scope} index={`07 / ${t("landing.navTeam")}`} /><div className="landing__team">{team.map((person, index) => <article><span className="landing__avatar">{["MA", "PA", "SB", "FF"][index]}</span><div><strong>{t(key(person))}</strong><small>{t("landing.credential")}</small></div><span className="landing__member-index">0{index + 1}</span></article>)}</div></section>
      <section className="landing__closing" data-beat={scope.id} data-beat-active={beatActive(scope.id)}><div><span className="landing__micro">{t("landing.closingEyebrow")}</span><h2>{t("landing.closingTitle")}</h2><p>{t("landing.closingBody")}</p></div><a className="landing__button landing__button--primary" href="/fleet">{t("landing.openDemo")} <span>↗</span></a></section>
    </main>
    <footer className="landing__footer"><div className="landing__footer-grid"><div><a className="landing__footer-brand" href="/">OilGuard Mining</a><p>{t("landing.footerTagline")}</p></div><div><strong>{t("landing.footerDocs")}</strong><a href="/docs/thesis-annex.md">{t("landing.technicalAnnex")}</a><a href="/docs/bench/stress.md">{t("landing.benchReport")}</a><a href="/docs/calibration.md">{t("landing.calibration")}</a><a href="/demo">{t("landing.footerDemo")}</a></div><div><strong>{t("landing.footerTech")}</strong><span>Rust · MQTT · FastAPI</span><span>InfluxDB · Astro · Preact</span><span>{t("landing.readOnly")}</span></div><div><strong>{t("landing.footerContext")}</strong><span>{t("landing.context")}</span><span>{t("landing.proposalOnly")}</span></div></div><div className="landing__legal"><span>OILGUARD / GDY106</span><span>{t("landing.legalLine")}</span><span>{t("landing.proxyLabel")}</span></div></footer>
  </div>;
}
