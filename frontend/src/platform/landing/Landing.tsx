import { useEffect, useState } from "preact/hooks";
import { t } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { ProvenanceTag, SyntheticBadge, SyncChart } from "../../ui/foundation";
import { $, $$ } from "../../lib/dom-selector";
import scenarios from "../../lab/fixtures/scenarios.json";
import { makeTelemetrySeries, type TelemetryReading } from "./logic";
import { beatById, BEATS, type Beat, type BeatId } from "./beats";
import LandingScene from "./LandingScene";
import { resolveStoryState, type StoryBeatRange } from "./storyProgress";
import "./landing.css";
import "./landing.tailwind.css";

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
  return <article className="landing__chart min-w-0 border border-[var(--landing-line)] rounded-og-control bg-og-panel p-og-300 max-[600px]:px-og-100 max-[600px]:pt-og-100 max-[600px]:pb-og-75" aria-label={t("landing.chartAlt")}>
    <header className="landing__chart-head flex items-center justify-between gap-og-75"><div className="grid min-w-0 gap-og-50"><span className="landing__micro font-og text-og-xs leading-og-xs tracking-[.08em] text-og-text-muted">{t("landing.chartTitle")}</span><strong className="font-og-mono text-og-xs leading-og-xs">{t("landing.chartWheel")} · {t("landing.chartScenario")}</strong></div><SyntheticBadge /></header>
    <div className="landing__chart-legend flex flex-wrap justify-end gap-og-100 mt-og-100 mb-og-0 max-[600px]:justify-start max-[600px]:gap-og-75"><span className="flex items-center gap-og-50 font-og-mono text-og-xs leading-og-xs text-og-text-muted"><i className="landing__legend-level h-[2px] w-[10px] bg-og-accent" />{t("landing.legendLevel")}</span><span className="flex items-center gap-og-50 font-og-mono text-og-xs leading-og-xs text-og-text-muted"><i className="landing__legend-pressure h-[2px] w-[10px] !bg-og-info" />{t("landing.legendPressure")}</span><span className="flex items-center gap-og-50 font-og-mono text-og-xs leading-og-xs text-og-text-muted"><i className="landing__legend-band h-[7px] w-[10px] border border-[color-mix(in_srgb,var(--og-accent)_45%,transparent)] !bg-[color-mix(in_srgb,var(--og-accent)_20%,transparent)]" />± {t("landing.legendBand")}</span></div>
    <SyncChart

      title={t("landing.chartPlotAlt")}
      height={190}
      xLabels={["0 s", `${formatNumber(15, 0)} s`, `${formatNumber(30, 0)} s`]}
      series={[
        { name: t("landing.legendPressure"), values: pressureValues, unit: "kPa", domain: pressureDomain, color: "var(--og-blue)", decimals: 1 },
        { name: t("landing.legendLevel"), values: levelValues, unit: "L", sigma: levelValues.map(() => 0.8), axis: "right", domain: levelDomain, color: "var(--og-accent)", decimals: 1 },
      ]}
    />
    <div className="landing__chart-readouts grid grid-cols-3 gap-og-50">
      <div className="grid gap-og-50 border border-[var(--landing-line)] px-og-75 py-og-100 first:pl-0 max-[600px]:px-og-50 max-[600px]:py-og-75 rounded-og-sm"><span className="font-og-mono text-og-xs leading-og-xs tracking-[.05em] text-og-text-muted">{t("landing.temperatureReadout")}</span><strong className="font-og-mono text-og-xs leading-og-xs">{formatNumber(latest.temperature_c, 1)} °C</strong></div>
      <div className="grid gap-og-50 border border-[var(--landing-line)] px-og-75 py-og-100 first:pl-0 max-[600px]:px-og-50 max-[600px]:py-og-75 rounded-og-sm"><span className="font-og-mono text-og-xs leading-og-xs tracking-[.05em] text-og-text-muted">{t("landing.vibrationReadout")}</span><strong className="font-og-mono text-og-xs leading-og-xs">{formatNumber(latest.vib_rms_g, 3)} g</strong></div>
      <div className="grid gap-og-50 border border-[var(--landing-line)] px-og-75 py-og-100 first:pl-0 max-[600px]:px-og-50 max-[600px]:py-og-75 rounded-og-sm"><span className="font-og-mono text-og-xs leading-og-xs tracking-[.05em] text-og-text-muted">{t("landing.levelReadout")}</span><strong className="font-og-mono text-og-xs leading-og-xs">{formatNumber(latest.level_liters, 1)} L</strong></div>
    </div>
    <p className="landing__chart-note flex min-w-0 flex-wrap items-center gap-og-75 mt-og-75 mb-0 [overflow-wrap:anywhere] font-og-mono text-og-xs leading-og-xs text-og-text-muted"><SyntheticBadge /> {t("landing.chartSource")}</p>
  </article>;
}

function TaglineReveal() {
  const copy = t("landing.tagline");
  useEffect(() => {
    const section = $("#landing-tagline");
    const words = $$(".landing__tagline-word");
    if (!(section instanceof HTMLElement) || !words?.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    section.dataset.enhanced = "true";
    const triggerLine = Math.round(window.innerHeight * 0.58);
    const triggerBand = Math.max(1, Math.round(window.innerHeight * 0.04));
    const bottomInset = window.innerHeight - triggerLine - triggerBand;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-active");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: `-${triggerLine}px 0px -${bottomInset}px 0px`, threshold: 0 });
    words.forEach((word) => observer.observe(word));
    return () => observer.disconnect();
  }, []);

  return <section className="landing__tagline mx-auto my-og-900 max-w-[960px] px-og-300 max-[900px]:my-og-800 max-[600px]:my-og-700 max-[600px]:px-og-100" id="landing-tagline" aria-labelledby="landing-tagline-copy">
    <h2 className="og-visually-hidden">{t("landing.taglineLabel")}</h2>
    <p className="m-0 max-w-[680px] text-og-5xl leading-og-5xl font-semibold tracking-[-.035em] max-[900px]:text-og-4xl max-[900px]:leading-og-4xl max-[600px]:text-og-3xl max-[600px]:leading-og-3xl" id="landing-tagline-copy" aria-label={copy}>{copy.split(/(\s+)/).map((part, index) => /\s+/.test(part)
      ? part
      : <span className="landing__tagline-word" key={`${part}-${index}`} style={{ transitionDelay: `${index * 45}ms` }}>{part}</span>)}</p>
  </section>;
}

// Encabezado de beat: cada sección pinta título y cuerpo desde beats.ts,
// así la estructura narrativa y la copia comparten una sola definición.
function BeatHeading({ beat, index }: { beat: Beat; index: string }) {
  return <div className="landing__section-heading flex items-start gap-og-400 mb-og-400 max-[900px]:gap-og-300 max-[600px]:block max-[600px]:mb-og-200"><span className="landing__index flex-[0_0_180px] pt-og-75 font-og text-og-xs leading-og-xs tracking-[.1em] text-og-accent max-[1100px]:basis-[150px] max-[900px]:basis-[125px] max-[600px]:mb-og-75 max-[600px]:block">{index}</span><div className="max-w-[760px]"><h2 className="m-0 text-og-4xl leading-og-4xl font-semibold tracking-[-.025em] max-[600px]:text-og-3xl max-[600px]:leading-og-3xl">{t(beat.titleKey)}</h2><p className="mt-og-75 mb-0 max-w-[70ch] text-og-base leading-og-base text-og-text-secondary max-[600px]:text-og-xs max-[600px]:leading-og-xs">{t(beat.bodyKey)}</p></div></div>;
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
      for (const node of $$("[data-beat]")) {
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
    ["landing.navProposal", "#approach", "problem"], ["landing.navTelemetry", "#telemetry", "regimes"],
    ["landing.navTechnology", "#sensing", "sensing"], ["landing.navAlerts", "#alerts", "response"],
    ["landing.navImpact", "#evidence", "evidence"], ["landing.navTeam", "#team", "scope"],
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
  return <div className="landing mx-auto w-full max-w-[1200px] px-og-400 pb-og-600 text-og-text-primary font-og leading-og-base max-[1100px]:px-og-300 max-[900px]:px-og-200 max-[600px]:px-og-200 [&_h1]:text-balance [&_h2]:text-balance [&_h3]:text-balance [&_p]:text-pretty [&_li]:text-pretty [&_summary]:text-pretty [&_[data-beat-active=true]_.landing__section-heading>span]:text-og-accent" data-active-beat={activeBeat}>
    <header className="landing__top sticky top-0 z-20 flex flex-wrap min-h-[72px] items-center justify-between gap-og-100 bg-[color-mix(in_srgb,var(--og-bg)_94%,transparent)] backdrop-blur-[12px] max-[900px]:py-og-75 max-[600px]:grid max-[600px]:grid-cols-[minmax(0,1fr)_auto] max-[600px]:gap-x-og-50 max-[600px]:gap-y-og-75">
      <a className="landing__brand" href="/" aria-label={t("landing.brand")}><span className="landing__mark grid size-[34px] place-items-center bg-[var(--og-accent)] text-og-on-yellow font-og-mono text-og-xs leading-og-xs font-bold max-[600px]:size-[31px]">OG</span><span><strong className="block font-og text-og-xs leading-og-xs font-semibold tracking-[.09em]">{t("landing.brand")}</strong><small className="mt-og-50 block font-og text-og-xs leading-og-xs tracking-[.07em] text-og-text-muted">{t("landing.brandLine")}</small></span></a>
      <nav className="landing__nav flex min-w-0 flex-1 items-center justify-center gap-og-100 min-[1101px]:order-3 min-[1101px]:basis-full min-[1101px]:flex-nowrap min-[1101px]:justify-center max-[1100px]:basis-full max-[1100px]:order-3 max-[1100px]:w-full max-[1100px]:justify-start max-[1100px]:gap-og-100 max-[900px]:flex-wrap max-[900px]:overflow-visible max-[900px]:py-og-50 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center max-[600px]:col-span-full max-[600px]:row-start-2 max-[600px]:order-none max-[600px]:w-auto max-[600px]:flex-wrap max-[600px]:overflow-visible max-[600px]:gap-[4px_4px] text-og-text-secondary" aria-label={t("landing.primaryNavigation")}>{navItems.map(([label, href, beat]) => <a className="min-h-11 rounded-og-control px-og-100 py-og-75 min-[1101px]:px-og-50 max-[600px]:px-[3px] text-og-xs leading-og-xs whitespace-nowrap aria-[current=location]:text-og-accent aria-[current=location]:bg-[color-mix(in_srgb,var(--og-accent)_12%,transparent)] hover:text-[var(--og-accent)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-og-yellow" href={href} aria-current={activeBeat === beat ? "location" : undefined}>{t(key(label))}</a>)}</nav>
      <div className="landing__top-actions flex shrink-0 items-center gap-og-100 min-[1101px]:order-2 max-[600px]:col-start-2 max-[600px]:row-start-1 max-[600px]:gap-og-50"><span className="landing__status flex items-center gap-og-75 whitespace-nowrap font-og text-og-xs leading-og-xs text-og-text-muted max-[1100px]:hidden"><i className="size-[6px] rounded-full bg-[var(--og-success)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--og-success)_13%,transparent)]" />{t("landing.statusReadOnly")}</span><a className="landing__top-cta inline-flex min-h-11 items-center justify-center gap-og-100 whitespace-nowrap border border-og-border-strong rounded-og-control px-og-100 py-og-75 max-[600px]:px-og-100 font-og text-og-sm leading-og-sm font-semibold hover:border-[var(--og-accent)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-og-yellow" href="/fleet">{t("landing.navDemo")} <span aria-hidden="true">↗</span></a></div>
    </header>
    <div>
      <h1 className="og-visually-hidden">{t("landing.pageTitle")}</h1>
      <section className="landing__hero scroll-mt-og-900 grid grid-cols-2 items-center gap-og-600 min-h-[480px] pt-og-800 pb-og-600 max-[900px]:grid-cols-2 max-[900px]:gap-og-300 max-[900px]:min-h-0 max-[900px]:pt-og-700 max-[900px]:pb-og-500 min-[601px]:max-[1100px]:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] min-[601px]:max-[1100px]:gap-og-400 max-[600px]:grid-cols-1 max-[600px]:gap-og-100 max-[600px]:pt-og-500 max-[600px]:pb-og-500" data-beat={intro.id} data-beat-active={beatActive(intro.id)} id={intro.anchor} aria-labelledby="landing-title">
        <div className="landing__hero-copy max-w-[680px]"><p className="landing__eyebrow mt-0 mb-og-200 flex items-center gap-og-75 font-og text-og-xs leading-og-xs tracking-[.1em] text-[var(--og-accent)]"><span className="size-[6px] rounded-full bg-og-success shadow-[0_0_0_4px_color-mix(in_srgb,var(--og-success)_13%,transparent)]" />{t("landing.heroEyebrow")}</p><h2 className="m-0 max-w-[680px] text-og-6xl leading-og-6xl font-semibold tracking-[-.035em] max-[1100px]:text-og-5xl max-[1100px]:leading-og-5xl max-[600px]:text-og-4xl max-[600px]:leading-og-4xl" id="landing-title">{t(intro.titleKey)}</h2><p className="landing__lede my-og-300 max-w-[680px] text-og-lg leading-og-lg text-og-text-secondary max-[600px]:text-og-base max-[600px]:leading-og-base">{t(intro.bodyKey)}</p><div className="landing__actions flex flex-wrap gap-og-100"><a className="landing__button landing__button--primary inline-flex min-h-11 items-center justify-center gap-og-100 rounded-og-control px-og-100 py-og-75 font-og text-og-sm leading-og-sm font-semibold whitespace-nowrap bg-og-accent !text-og-on-yellow hover:bg-og-yellow-hover" href="/fleet">{t("landing.openDemo")} <span>↗</span></a><a className="landing__button landing__button--secondary inline-flex min-h-11 items-center justify-center gap-og-100 rounded-og-control border border-og-border-strong px-og-100 py-og-75 font-og text-og-sm leading-og-sm font-semibold whitespace-nowrap hover:border-[var(--og-accent)]" href="/login">{t("landing.signIn")}</a></div><p className="landing__hero-note mt-og-200 flex items-center gap-og-75 text-og-xs leading-og-xs font-og-mono text-og-text-muted"><span className="landing__pulse size-[5px] rounded-full bg-og-success" />{t("landing.heroNote")}</p></div>
        <div className="landing__hero-art relative block -translate-y-[6px] min-h-[305px] overflow-visible border border-[var(--landing-line)] rounded-og-float bg-og-panel max-[600px]:min-h-[220px] max-[600px]:translate-y-0"><LandingScene scene="assembly" storyBeat="intro" storyProgress={assemblyStory.progress} storyActive={assemblyStory.active} /></div>
      </section>
      <section className="landing__section -mt-og-100 py-og-700 scroll-mt-og-900 max-[600px]:py-og-600" id={problem.anchor} data-beat={problem.id} data-beat-active={beatActive(problem.id)}>
        <BeatHeading beat={problem} index={`01 / ${t("landing.navProposal")}`} />
        <div className="landing__comparison grid grid-cols-2 gap-og-300 border-0 max-[600px]:grid-cols-1 max-[600px]:gap-og-100">
          <article className="landing__compare landing__compare--pm border border-[var(--landing-line)] rounded-og-control bg-og-panel p-og-400 max-[600px]:p-og-200"><header className="flex items-center justify-between gap-og-100 max-[1100px]:items-start max-[1100px]:flex-wrap max-[1100px]:[&>div]:basis-full max-[1100px]:[&>div]:min-w-0 max-[600px]:items-start max-[600px]:flex-wrap"><div><span className="landing__micro font-og text-og-xs leading-og-xs tracking-[.08em] text-og-text-muted">01 / {t("landing.compareLabel")}</span><h3 className="mt-og-50 mb-0 text-og-xl leading-og-xl font-semibold max-[600px]:text-og-base max-[600px]:leading-og-base">{t("landing.conventionalTitle")}</h3></div><span className="landing__compare-tag px-og-50 py-og-75 border border-og-border-strong font-og-mono text-og-xs leading-og-xs text-og-text-muted">{t("landing.periodicTag")}</span></header><div className="landing__mini-timeline relative h-[91px] mt-og-100 mb-og-75 px-og-75 pt-og-200 font-og-mono text-og-xs leading-og-xs"><div className="landing__timeline-track relative h-[25px] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-og-border-strong after:content-['']"><i className="absolute bottom-[-2px] left-0 size-[5px] rounded-full bg-og-text-muted" /><b className="absolute right-0 bottom-0 px-og-50 py-og-75 bg-og-accent text-og-xs leading-og-xs font-medium text-og-on-yellow">{t("landing.inspection")}</b><i className="absolute right-0 bottom-[-2px] size-[5px] rounded-full bg-og-text-muted" /></div><div className="landing__timeline-labels flex justify-between mt-og-50 text-og-text-muted"><span>0 h</span><span>{n(250)} h</span></div><div className="landing__blind-window absolute top-og-600 inset-x-og-75 text-center text-og-xs leading-og-xs tracking-[.09em] text-og-danger">{t("landing.blindWindow")}</div></div><ul className="grid gap-og-75 m-0 p-0 list-none">{bulletsLeft.map((item) => <li className="flex gap-og-75 text-og-sm leading-og-sm text-og-text-secondary"><span className="font-og-mono text-og-danger">—</span>{t(key(item))}</li>)}</ul></article>
          <article className="landing__compare landing__compare--og border border-[var(--landing-line)] rounded-og-control bg-og-panel p-og-400 max-[600px]:p-og-200"><header className="flex items-center justify-between gap-og-100 max-[1100px]:items-start max-[1100px]:flex-wrap max-[1100px]:[&>div]:basis-full max-[1100px]:[&>div]:min-w-0 max-[600px]:items-start max-[600px]:flex-wrap"><div><span className="landing__micro font-og text-og-xs leading-og-xs tracking-[.08em] text-og-text-muted">02 / {t("landing.compareLabel")}</span><h3 className="mt-og-50 mb-0 text-og-xl leading-og-xl font-semibold max-[600px]:text-og-base max-[600px]:leading-og-base">{t("landing.oilguardTitle")}</h3></div><span className="landing__compare-tag px-og-50 py-og-75 border border-og-border-strong font-og-mono text-og-xs leading-og-xs text-og-text-muted">{t("landing.modelTag")}</span></header><div className="landing__mini-timeline landing__mini-timeline--continuous relative h-[91px] mt-og-100 mb-og-75 px-og-75 pt-og-200 font-og-mono text-og-xs leading-og-xs overflow-hidden"><div className="landing__estimate-band absolute inset-[16px_8px_24px] border-y border-[color-mix(in_srgb,var(--og-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--og-success)_10%,transparent)]"/><svg className="absolute inset-[8px_8px_24px] h-[45px] w-[calc(100%_-_20px)] overflow-visible" viewBox="0 0 330 68" preserveAspectRatio="none"><path className="fill-none stroke-og-accent [stroke-width:2] [vector-effect:non-scaling-stroke]" d="M0 45 C34 39,50 42,77 34 S125 26,160 31 S211 21,242 27 S293 19,330 15"/></svg><div className="landing__timeline-labels flex justify-between mt-og-50 text-og-text-muted"><span>0 h</span><span>{n(250)} h</span></div></div><ul className="grid gap-og-75 m-0 p-0 list-none">{bulletsRight.map((item) => <li className="flex gap-og-75 text-og-sm leading-og-sm text-og-text-secondary"><span className="font-og-mono text-og-accent">+</span>{t(key(item))}</li>)}</ul></article>
        </div>
        <aside className="landing__scope-banner flex items-center gap-og-200 mt-og-300 border border-[var(--landing-line)] rounded-og-control bg-og-panel p-og-300 max-[600px]:items-start max-[600px]:flex-wrap max-[600px]:p-og-100"><span className="landing__banner-mark grid shrink-0 basis-[23px] h-[23px] place-items-center border border-og-accent font-og-mono text-og-xs leading-og-xs text-og-accent">i</span><div className="flex-1 max-[600px]:basis-[calc(100%_-_45px)]"><strong className="text-og-base leading-og-base font-semibold">{t("landing.scopeTitle")}</strong><p className="mt-og-25 mb-0 text-og-sm leading-og-sm text-og-text-muted">{t("landing.scopeBody")}</p></div><a className="font-og-mono text-og-xs leading-og-xs whitespace-nowrap text-og-accent max-[600px]:ml-og-500 max-[600px]:inline-flex max-[600px]:min-h-11 max-[600px]:items-center" href="/docs/thesis-annex.md">{t("landing.scopeLink")} <span>↗</span></a></aside>
      </section>
      <section className="landing__section landing__telemetry-section py-og-700 scroll-mt-og-900 max-[600px]:py-og-600" id={regimes.anchor} data-beat={regimes.id} data-beat-active={beatActive(regimes.id)}>
        <BeatHeading beat={regimes} index={`02 / ${t("landing.navTelemetry")}`} />
        <div className="landing__regime-layout grid grid-cols-[.72fr_1.28fr] items-stretch gap-og-300 max-[900px]:grid-cols-1"><div className="landing__regimes flex flex-col max-[900px]:grid max-[900px]:grid-cols-2 max-[900px]:gap-x-og-200 max-[600px]:block"><article className="grid grid-cols-[40px_1fr] gap-og-100 py-og-200 max-[900px]:grid-cols-[30px_1fr]"><span className="landing__regime-number font-og-mono text-og-sm leading-og-sm text-og-accent">01</span><div><span className="landing__micro font-og text-og-xs leading-og-xs tracking-[.08em] text-og-text-muted">{t("landing.motionTag")}</span><h3 className="my-og-50 text-og-sm leading-og-sm font-medium">{t("landing.motionTitle")}</h3><p className="mb-og-75 text-og-sm leading-og-sm text-og-text-secondary">{t("landing.motionBody")}</p><ProvenanceTag value="DERIVED" /></div></article><article className="grid grid-cols-[40px_1fr] gap-og-100 py-og-200 max-[900px]:grid-cols-[30px_1fr]"><span className="landing__regime-number font-og-mono text-og-sm leading-og-sm text-og-accent">02</span><div><span className="landing__micro font-og text-og-xs leading-og-xs tracking-[.08em] text-og-text-muted">{t("landing.restTag")}</span><h3 className="my-og-50 text-og-sm leading-og-sm font-medium">{t("landing.restTitle")}</h3><p className="mb-og-75 text-og-sm leading-og-sm text-og-text-secondary">{t("landing.restBody")}</p><ProvenanceTag value="ASSUMPTION" /></div></article><a href="/calibration" className="landing__calibration-link flex min-h-11 items-center justify-between font-og-mono text-og-xs leading-og-xs !text-og-accent max-[900px]:col-span-full">{t("landing.calibrationLink")} <span>↗</span></a></div><TelemetryChart/></div><LandingScene scene="cycle" storyBeat="regimes" storyProgress={cycleStory.progress} storyActive={cycleStory.active} />
      </section>
      <section className="landing__section py-og-700 scroll-mt-og-900 max-[600px]:py-og-600" id={sensing.anchor} data-beat={sensing.id} data-beat-active={beatActive(sensing.id)}>
        <BeatHeading beat={sensing} index={`03 / ${t("landing.navTechnology")}`} />
        <div className="min-w-0 max-[600px]:overflow-x-auto"><div className="landing__mount-table-wrap"><div className="mb-og-75 font-og-mono text-og-xs leading-og-xs text-og-text-muted [&>p]:m-0 [&>p]:mb-og-75"><p className="landing__mount-table-cue">{t("landing.tableScrollCue")}</p></div><div className="max-w-full overflow-x-auto"><div className="landing__mount-table-scroll"><table className="landing__mount-table w-full border-separate border-spacing-x-0 border-spacing-y-og-25 text-og-xs leading-og-xs max-[600px]:min-w-[560px]"><thead><tr><th className="border border-[var(--landing-line)] px-og-75 py-og-75 text-left font-normal tracking-[.04em] text-og-text-muted">{t("landing.tablePoint")}</th><th className="border border-[var(--landing-line)] px-og-75 py-og-75 text-left font-normal tracking-[.04em] text-og-text-muted">{t("landing.tableSensor")}</th><th className="border border-[var(--landing-line)] px-og-75 py-og-75 text-left font-normal tracking-[.04em] text-og-text-muted">{t("landing.tableMount")}</th><th className="border border-[var(--landing-line)] px-og-75 py-og-75 text-left font-normal tracking-[.04em] text-og-text-muted">{t("landing.tableStatus")}</th></tr></thead><tbody>{sensors.map((sensor, index) => <tr><td className="border border-[var(--landing-line)] px-og-75 py-og-100 text-og-text-secondary first:whitespace-nowrap first:text-og-text">GDY106 / 0{index + 1}</td><td className="border border-[var(--landing-line)] px-og-75 py-og-100 text-og-text-secondary">{t(key(sensor))}</td><td className="border border-[var(--landing-line)] px-og-75 py-og-100 text-og-text-secondary">{t(key(["landing.mountThreaded", "landing.mountSurface", "landing.mountSurface", "landing.mountReference"][index]))}</td><td className="border border-[var(--landing-line)] px-og-75 py-og-100 text-og-text-secondary"><span className="landing__assumption-chip inline-block px-og-50 py-og-50 border border-[color-mix(in_srgb,var(--og-warning)_45%,transparent)] text-og-warning text-og-xs leading-og-xs max-w-full whitespace-normal [overflow-wrap:anywhere]">{t("landing.designInput")}</span></td></tr>)}</tbody></table></div></div><p className="landing__table-note my-og-75 flex items-center gap-og-75 text-og-xs leading-og-xs text-og-text-muted"><ProvenanceTag value="ASSUMPTION" /> {t("landing.mountNote")}</p></div></div>
        <div className="landing__sensor-line mt-og-300 flex gap-og-200 max-[600px]:block"><span className="grow-0 basis-[140px] font-og-mono text-og-xs leading-og-xs text-og-text-muted max-[600px]:mb-og-100 max-[600px]:block">{t("landing.signalInputs")}</span><div className="flex flex-wrap gap-x-og-200 gap-y-og-75 max-[600px]:grid max-[600px]:grid-cols-2 max-[600px]:gap-og-75">{sensors.map((sensor) => <span className="flex items-center gap-og-75 text-og-xs leading-og-xs text-og-text-secondary max-[600px]:items-start max-[600px]:flex-col max-[600px]:gap-og-50">{t(key(sensor))} <ProvenanceTag value="ASSUMPTION" /></span>)}</div></div><LandingScene scene="sensors" storyBeat="sensing" storyProgress={sensorsStory.progress} storyActive={sensorsStory.active} />
      </section>
      <section className="landing__section py-og-700 scroll-mt-og-900 max-[600px]:py-og-600" id={signalPath.anchor} data-beat={signalPath.id} data-beat-active={beatActive(signalPath.id)}>
        <BeatHeading beat={signalPath} index={`04 / ${t("landing.pipelineHeading")}`} />
        <div className="landing__pipeline max-[900px]:grid max-[900px]:grid-cols-2 max-[900px]:gap-x-og-300 max-[600px]:block"><h3 className="max-[900px]:col-span-full mb-og-75 text-og-xs leading-og-xs font-medium">{t("landing.pipelineHeading")}</h3>{pipeline.map(([label, spec], index) => <div className="landing__pipe-row grid grid-cols-[27px_1fr_auto] items-center font-og-mono gap-og-100 min-h-[46px] border border-[var(--landing-line)] px-og-100 max-[900px]:col-span-1 max-[600px]:grid"><span className="landing__pipe-index font-og text-og-xs leading-og-xs text-og-accent">0{index + 1}</span><strong className="font-og-mono text-og-xs leading-og-xs font-normal">{t(key(label))}</strong><span className="text-og-xs leading-og-xs text-og-text-muted">{spec === "10 Hz" ? <><span>{n(10)} Hz</span> <ProvenanceTag value="CONFIGURACIÓN" /></> : spec === "retention policy" ? t("landing.retentionSpec") : spec}</span></div>)}</div>
      </section>
      <section className="landing__section py-og-700 scroll-mt-og-900 max-[600px]:py-og-600" id={response.anchor} data-beat={response.id} data-beat-active={beatActive(response.id)}>
        <BeatHeading beat={response} index={`05 / ${t("landing.navAlerts")}`} />
        <div className="landing__ladder grid grid-cols-4 gap-og-100 border-0 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">{levels.map((level) => <article className={`landing__level relative flex min-h-[184px] flex-col items-start border border-[var(--landing-line)] rounded-og-control p-og-300 max-[600px]:min-h-[200px] max-[600px]:px-og-75 max-[600px]:py-og-100 landing__level--${level}`}><span className={`landing__level-code font-og-mono text-og-xs leading-og-xs ${level === 1 ? "text-og-info" : level === 2 ? "text-og-warning" : level === 3 ? "text-og-orange" : "text-og-danger"}`}>N{level}</span><h3 className="mt-og-100 mb-og-50 text-og-base leading-og-base font-semibold max-[900px]:text-og-sm max-[900px]:leading-og-sm max-[600px]:text-og-xs max-[600px]:leading-og-xs">{t(key(`landing.n${level}Title`))}</h3><p className="mb-og-100 flex-1 text-og-sm leading-og-sm text-og-text-secondary max-[600px]:text-og-xs max-[600px]:leading-og-xs">{t(key(`landing.n${level}Body`))}</p><span className="landing__recipient font-og-mono text-og-xs leading-og-xs tracking-[.03em] text-og-text-muted">{t(key(`landing.n${level}Recipient`))}</span></article>)}</div>
        <aside className="landing__rul-banner mt-og-100 flex items-center gap-og-200 border border-[var(--landing-line)] rounded-og-control bg-og-panel p-og-300 max-[600px]:items-start max-[600px]:flex-wrap max-[600px]:p-og-100 [&>.og-chip]:max-[600px]:ml-og-600"><span className="landing__rul-icon grid shrink-0 basis-[38px] h-[32px] place-items-center border border-og-accent font-og-mono text-og-xs leading-og-xs text-og-accent">RUL</span><div className="flex-1 max-[600px]:basis-[calc(100%_-_55px)]"><strong className="text-og-xs leading-og-xs font-medium">{t("landing.rulTitle")}</strong><p className="mt-og-50 text-og-sm leading-og-sm text-og-text-secondary">{t("landing.rulBody")}</p></div><ProvenanceTag value="ASSUMPTION" /></aside>
      </section>
      <TaglineReveal />
      <section className="landing__section landing__evidence py-og-700 scroll-mt-og-900 max-[600px]:py-og-600" id={evidence.anchor} data-beat={evidence.id} data-beat-active={beatActive(evidence.id)}>
        <BeatHeading beat={evidence} index={`06 / ${t("landing.navImpact")}`} />
        <div className="landing__evidence-grid grid grid-cols-4 gap-og-100 border-0 max-[900px]:grid-cols-2">{[
          ["/docs/thesis-annex.md", <><span className="landing__micro min-h-5 font-og text-og-xs leading-og-xs tracking-[.08em] text-og-text-muted">{t("landing.evidenceSimulator")}</span><strong className="mt-auto font-og-mono text-og-lg leading-og-lg">{n(300)} <small>{t("landing.evidenceRows")}</small></strong><ProvenanceTag value="VERIFIED" /></>],
          ["/docs/bench/stress.md", <><span className="landing__micro min-h-5 font-og text-og-xs leading-og-xs tracking-[.08em] text-og-text-muted">{t("landing.evidenceStress")} · {n(1000)} {t("landing.evidenceDevices")}</span><strong className="mt-auto font-og-mono text-og-lg leading-og-lg">{n(9699)} <small>{t("landing.evidenceRowsPerSecond")}</small></strong><ProvenanceTag value="DERIVED" /></>],
          ["/docs/thesis-annex.md", <><span className="landing__micro min-h-5 font-og text-og-xs leading-og-xs tracking-[.08em] text-og-text-muted">{t("landing.evidenceValidation")}</span><strong className="mt-auto font-og-mono text-og-lg leading-og-lg">{n(1.8, 2)} <small>L MAE</small></strong><SyntheticBadge /></>],
          ["/docs/thesis-annex.md", <><span className="landing__micro min-h-5 font-og text-og-xs leading-og-xs tracking-[.08em] text-og-text-muted">{t("landing.evidenceTests")}</span><strong className="mt-auto font-og-mono text-og-lg leading-og-lg">{t("landing.evidenceTestScope")}</strong><ProvenanceTag value="VERIFIED" /></>],
        ].map(([href, content]) => <a className="flex min-h-[144px] flex-col items-start gap-og-75 border border-[var(--landing-line)] rounded-og-control p-og-300 max-[600px]:min-h-[112px] max-[600px]:p-og-100 hover:bg-og-panel" href={href as string}>{content}</a>)}</div><LandingScene scene="oil" storyBeat="evidence" storyProgress={oilStory.progress} storyActive={oilStory.active} />
        <div className="landing__integrity-detail mt-og-200"><h3 className="m-0 text-og-sm leading-og-sm font-medium">{t("landing.securityTitle")}</h3><p className="mt-og-75 mb-og-200 max-w-[70ch] text-og-xs leading-og-xs text-og-text-secondary">{t("landing.securityBody")}</p><div className="landing__security-grid grid grid-cols-[1fr_.85fr] gap-og-200 max-[600px]:grid-cols-1"><article className="landing__integrity border border-[var(--landing-line)] rounded-og-control bg-og-panel p-og-300"><div className="grid grid-cols-[34px_1fr_auto] items-center gap-og-100 min-h-[48px] border border-[var(--landing-line)]"><span className="font-og-mono text-og-xs leading-og-xs text-og-accent">01</span><strong className="text-og-xs leading-og-xs font-medium">{t("landing.securityHmac")}</strong><ProvenanceTag value="VERIFIED" /></div><div className="grid grid-cols-[34px_1fr_auto] items-center gap-og-100 min-h-[48px] border border-[var(--landing-line)]"><span className="font-og-mono text-og-xs leading-og-xs text-og-accent">02</span><strong className="text-og-xs leading-og-xs font-medium">{t("landing.securityReplay")}</strong><ProvenanceTag value="VERIFIED" /></div><div className="grid grid-cols-[34px_1fr_auto] items-center gap-og-100 min-h-[48px] border border-[var(--landing-line)]"><span className="font-og-mono text-og-xs leading-og-xs text-og-accent">03</span><strong className="text-og-xs leading-og-xs font-medium">{t("landing.securityReadonly")}</strong><ProvenanceTag value="VERIFIED" /></div><a className="inline-flex min-h-11 items-center font-og-mono text-og-xs leading-og-xs text-og-accent whitespace-nowrap" href="/docs/thesis-annex.md">{t("landing.securityTests")} <span>↗</span></a></article><article className="landing__standards border border-[var(--landing-line)] rounded-og-control bg-og-panel p-og-300"><span className="landing__micro font-og text-og-xs leading-og-xs tracking-[.08em] text-og-text-muted">{t("landing.standardsLabel")}</span><h3 className="mt-og-75 mb-og-75 text-og-sm leading-og-sm font-medium">{t("landing.standardsTitle")}</h3><p className="text-og-sm leading-og-sm text-og-text-secondary">{t("landing.standardReference")}</p><strong className="mt-og-200 block font-og-mono text-og-xs leading-og-xs text-og-warning">{t("landing.notInPrototype")}</strong><ul className="mt-og-75 mb-0 flex flex-wrap gap-x-og-200 gap-y-og-25 pl-og-200"><li className="text-og-sm leading-og-sm text-og-text-secondary">{t("landing.noAuth")}</li><li className="text-og-sm leading-og-sm text-og-text-secondary">{t("landing.noBrokerTls")}</li><li className="text-og-sm leading-og-sm text-og-text-secondary">{t("landing.noFieldData")}</li></ul></article></div></div>
      </section>
      <section className="landing__facts grid grid-cols-4 gap-og-100 border-0 mt-og-400 max-[600px]:grid-cols-2 max-[600px]:mt-og-200 [&>article]:grid [&>article]:grid-cols-[1fr_auto] [&>article]:content-center [&>article]:items-center [&>article]:gap-x-og-200 [&>article]:gap-y-og-75 [&>article]:min-h-[87px] [&>article]:border [&>article]:border-[var(--landing-line)] [&>article]:rounded-og-control [&>article]:p-og-300 [&>article:first-child]:pl-0 [&>article>span]:font-og [&>article>span]:text-og-xs [&>article>span]:leading-og-xs [&>article>span]:text-og-text-muted [&>article>strong]:col-start-1 [&>article>strong]:font-og-mono [&>article>strong]:text-og-lg [&>article>strong]:leading-og-lg [&>article>strong]:font-medium [&>article>strong>small]:text-og-xs [&>article>strong>small]:leading-og-xs [&>article>strong>small]:text-og-text-secondary [&>article>.og-chip]:col-start-2 [&>article>.og-chip]:row-span-2 [&>article>.og-chip]:justify-self-end [&>article>.og-chip]:font-og-mono [&>article>.og-chip]:text-og-xs [&>article>.og-chip]:leading-og-xs max-[600px]:[&>article]:min-w-0 max-[600px]:[&>article]:min-h-[76px] max-[600px]:[&>article]:grid-cols-[minmax(0,1fr)_auto] max-[600px]:[&>article]:p-og-100 max-[600px]:[&>article:first-child]:pl-og-100 max-[600px]:[&>article>strong]:text-og-sm max-[600px]:[&>article>strong]:leading-og-sm" aria-label={t("landing.factsTitle")}>
        <article><span>{t("landing.factPm")}</span><strong>{n(250)} <small>h</small></strong><ProvenanceTag value="ASSUMPTION" /></article>
        <article><span>{t("landing.factRate")}</span><strong>{n(10)} <small>Hz</small></strong><ProvenanceTag value="ASSUMPTION" /></article>
        <article><span>{t("landing.factReservoir")}</span><strong>{n(95)} <small>{t("landing.reservoirNote")}</small></strong><ProvenanceTag value="ASSUMPTION" /></article>
        <article><span>{t("landing.factLevels")}</span><strong>N1–N4 <small>{t("landing.readOnly")}</small></strong><ProvenanceTag value="ASSUMPTION" /></article>
      </section>
      <section className="landing__section landing__team-section py-og-700 scroll-mt-og-900 max-[600px]:py-og-600" id={scope.anchor} data-beat={scope.id} data-beat-active={beatActive(scope.id)}><BeatHeading beat={scope} index={`07 / ${t("landing.navTeam")}`} /><div className="landing__team grid grid-cols-4 gap-og-100 border-0 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">{team.map((person, index) => <article className="grid grid-cols-[38px_1fr_auto] items-center gap-og-75 min-h-[80px] border border-[var(--landing-line)] rounded-og-control p-og-200"><span className="landing__avatar grid size-[36px] place-items-center border border-og-border-strong font-og-mono text-og-xs leading-og-xs text-og-accent">{["MA", "PA", "SB", "FF"][index]}</span><div><strong className="block text-og-xs leading-og-xs font-medium">{t(key(person))}</strong><small className="mt-og-50 block text-og-xs leading-og-xs text-og-text-muted">{t("landing.credential")}</small></div><span className="landing__member-index font-og-mono text-og-xs leading-og-xs text-og-text-muted">0{index + 1}</span></article>)}</div></section>
      <section className="landing__section landing__faq py-og-700 scroll-mt-og-900 max-[600px]:py-og-600" aria-labelledby="landing-faq-title">
        <div className="landing__section-heading flex items-start gap-og-400 mb-og-400 max-[900px]:gap-og-300 max-[600px]:block max-[600px]:mb-og-200"><span className="landing__index">{t("landing.faqLabel")}</span><div><h2 id="landing-faq-title">{t("landing.faqTitle")}</h2><p>{t("landing.faqIntro")}</p></div></div>
        <div className="landing__faq-list grid gap-og-100">
          {[1, 2, 3, 4].map((item) => <details className="border border-[var(--landing-line)] rounded-og-control bg-og-panel p-og-300 max-[600px]:p-og-200"><summary className="cursor-pointer text-og-lg leading-og-lg font-semibold max-[600px]:text-og-base max-[600px]:leading-og-base">{t(key(`landing.faq.${item}.question`))}</summary><p className="mt-og-200 mb-0 max-w-[70ch] text-og-base leading-og-base text-og-text-secondary max-[600px]:text-og-sm max-[600px]:leading-og-sm">{t(key(`landing.faq.${item}.answer`))}</p></details>)}
        </div>
      </section>
      <section className="landing__closing scroll-mt-og-900 flex items-center justify-between gap-og-300 my-og-500 rounded-og-control border border-[var(--og-accent)] p-og-400 max-[600px]:items-start max-[600px]:flex-col max-[600px]:my-og-300 max-[600px]:p-og-200" data-beat={scope.id} data-beat-active={beatActive(scope.id)}><div><span className="landing__micro font-og text-og-xs leading-og-xs tracking-[.08em] text-og-text-muted">{t("landing.closingEyebrow")}</span><h2 className="my-og-75 max-w-[680px] text-og-3xl leading-og-3xl font-semibold">{t("landing.closingTitle")}</h2><p className="m-0 max-w-[70ch] text-og-base leading-og-base text-og-text-secondary">{t("landing.closingBody")}</p></div><a className="landing__button landing__button--primary flex-none inline-flex min-h-11 items-center justify-center gap-og-100 rounded-og-control px-og-100 py-og-75 font-og text-og-sm leading-og-sm font-semibold whitespace-nowrap bg-og-accent !text-og-on-yellow hover:bg-og-yellow-hover" href="/fleet">{t("landing.openDemo")} <span>↗</span></a></section>
    </div>
    <footer className="landing__footer pt-og-300 font-og">
      <div className="landing__footer-grid">
        <div className="flex flex-col items-start gap-og-75"><a className="landing__footer-brand" href="/">OilGuard Mining</a><p className="m-0 text-og-xs leading-og-xs text-og-text-muted">{t("landing.footerTagline")}</p></div>
        <div className="flex flex-col items-start gap-og-75"><strong className="text-og-xs leading-og-xs font-medium tracking-[.05em] text-og-text-primary">{t("landing.footerDocs")}</strong><a className="inline-flex min-h-11 items-center text-og-xs leading-og-xs text-og-text-muted hover:text-og-accent" href="/docs/thesis-annex.md">{t("landing.technicalAnnex")}</a><a className="inline-flex min-h-11 items-center text-og-xs leading-og-xs text-og-text-muted hover:text-og-accent" href="/docs/bench/stress.md">{t("landing.benchReport")}</a><a className="inline-flex min-h-11 items-center text-og-xs leading-og-xs text-og-text-muted hover:text-og-accent" href="/docs/calibration.md">{t("landing.calibration")}</a><a className="inline-flex min-h-11 items-center text-og-xs leading-og-xs text-og-text-muted hover:text-og-accent" href="/fleet">{t("landing.footerDemo")}</a></div>
        <div className="flex flex-col items-start gap-og-75"><strong className="text-og-xs leading-og-xs font-medium tracking-[.05em] text-og-text-primary">{t("landing.footerTech")}</strong><span className="text-og-xs leading-og-xs text-og-text-muted">Rust · MQTT · FastAPI</span><span className="text-og-xs leading-og-xs text-og-text-muted">InfluxDB · Astro · Preact</span><span className="text-og-xs leading-og-xs text-og-text-muted">{t("landing.readOnly")}</span></div>
        <div className="flex flex-col items-start gap-og-75"><strong className="text-og-xs leading-og-xs font-medium tracking-[.05em] text-og-text-primary">{t("landing.footerContext")}</strong><span className="text-og-xs leading-og-xs text-og-text-muted">{t("landing.context")}</span><span className="text-og-xs leading-og-xs text-og-text-muted">{t("landing.proposalOnly")}</span></div>
      </div>
      <div className="landing__legal flex items-center justify-between gap-og-200 min-h-[38px] font-og text-og-xs leading-og-xs tracking-[.06em] text-og-text-muted max-[600px]:items-start max-[600px]:flex-col max-[600px]:justify-center max-[600px]:gap-og-50 max-[600px]:py-og-75"><span>OILGUARD / GDY106</span><span>{t("landing.legalLine")}</span><span>{t("landing.proxyLabel")}</span></div>
    </footer>
  </div>;
}
