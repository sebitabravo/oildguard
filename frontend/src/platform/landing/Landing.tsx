import { useEffect } from "preact/hooks";
import { t, useLang } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { ProvenanceTag, SyntheticBadge, SyncChart } from "../../ui/foundation";
import scenarios from "../../lab/fixtures/scenarios.json";
import { makeTelemetrySeries, resolveLandingLang, type TelemetryReading } from "./logic";
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

function TelemetryChart({ lang }: { lang: "en" | "es" }) {
  const levelValues = chartReadings.map((reading) => reading.level_liters);
  const pressureValues = chartReadings.map((reading) => reading.pressure_kpa);
  const latest = chartReadings[chartReadings.length - 1];
  const pressureDomain: [number, number] = [Math.min(...pressureValues) - 3, Math.max(...pressureValues) + 3];
  const levelDomain: [number, number] = [0, 95];
  return <article className="landing__chart" aria-label={t("landing.chartAlt", lang)}>
    <header className="landing__chart-head"><div><span className="landing__micro">{t("landing.chartTitle", lang)}</span><strong>{t("landing.chartWheel", lang)} · {t("landing.chartScenario", lang)}</strong></div><SyntheticBadge lang={lang} /></header>
    <div className="landing__chart-legend"><span><i className="landing__legend-level" />{t("landing.legendLevel", lang)}</span><span><i className="landing__legend-pressure" />{t("landing.legendPressure", lang)}</span><span><i className="landing__legend-band" />± {t("landing.legendBand", lang)}</span></div>
    <SyncChart
      lang={lang}
      title={t("landing.chartPlotAlt", lang)}
      height={190}
      xLabels={["0 s", `${formatNumber(15, lang, 0)} s`, `${formatNumber(30, lang, 0)} s`]}
      series={[
        { name: t("landing.legendPressure", lang), values: pressureValues, unit: "kPa", domain: pressureDomain, color: "var(--og-blue)", decimals: 1 },
        { name: t("landing.legendLevel", lang), values: levelValues, unit: "L", sigma: levelValues.map(() => 0.8), axis: "right", domain: levelDomain, color: "var(--og-accent)", decimals: 1 },
      ]}
    />
    <div className="landing__chart-readouts">
      <div><span>{t("landing.temperatureReadout", lang)}</span><strong>{formatNumber(latest.temperature_c, lang, 1)} °C</strong></div>
      <div><span>{t("landing.vibrationReadout", lang)}</span><strong>{formatNumber(latest.vib_rms_g, lang, 3)} g</strong></div>
      <div><span>{t("landing.levelReadout", lang)}</span><strong>{formatNumber(latest.level_liters, lang, 1)} L</strong></div>
    </div>
    <p className="landing__chart-note"><SyntheticBadge lang={lang} /> {t("landing.chartSource", lang)}</p>
  </article>;
}

export default function Landing() {
  const [lang, setLang] = useLang();
  const n = (value: number, digits = 0) => formatNumber(value, lang, digits);
  useEffect(() => {
    const initial = resolveLandingLang(window.location.search, window.localStorage.getItem("oilguard-lang"));
    if (initial !== lang) setLang(initial);
    document.documentElement.lang = initial;
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.querySelector(".landing__language")?.setAttribute("data-current-lang", lang);
  }, [lang]);

  const navItems = [
    ["landing.navProposal", "#approach"], ["landing.navTelemetry", "#telemetry"],
    ["landing.navTechnology", "#technology"], ["landing.navAlerts", "#alerts"],
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
  return <div className="landing">
    <header className="landing__top">
      <a className="landing__brand" href="/" aria-label={t("landing.brand", lang)}><span className="landing__mark">OG</span><span><strong>{t("landing.brand", lang)}</strong><small>{t("landing.brandLine", lang)}</small></span></a>
      <nav className="landing__nav" aria-label={t("landing.primaryNavigation", lang)}>{navItems.map(([label, href]) => <a href={href}>{t(key(label), lang)}</a>)}</nav>
      <div className="landing__top-actions"><span className="landing__status"><i />{t("landing.statusReadOnly", lang)}</span><div className="landing__language" role="group" aria-label={t("landing.language", lang)}><button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button><button type="button" aria-pressed={lang === "es"} onClick={() => setLang("es")}>ES</button></div><a className="landing__top-cta" href="/fleet">{t("landing.navDemo", lang)} <span aria-hidden="true">↗</span></a></div>
    </header>
    <main>
      <h1 className="og-visually-hidden">{t("landing.pageTitle", lang)}</h1>
      <section className="landing__hero" aria-labelledby="landing-title">
        <div className="landing__hero-copy"><p className="landing__eyebrow"><span />{t("landing.heroEyebrow", lang)}</p><h2 id="landing-title">{t("landing.heroTitle", lang)}</h2><p className="landing__lede">{t("landing.heroBody", lang)}</p><div className="landing__actions"><a className="landing__button landing__button--primary" href="/fleet">{t("landing.openDemo", lang)} <span>↗</span></a><a className="landing__button landing__button--secondary" href="/login">{t("landing.signIn", lang)}</a></div><p className="landing__hero-note"><span className="landing__pulse" />{t("landing.heroNote", lang)}</p></div>
        <div className="landing__hero-art" aria-hidden="true"><div className="landing__art-label"><span>{t("landing.wheelModel", lang)}</span><span>GDY106 / {t("landing.proxyModel", lang)}</span></div><svg viewBox="0 0 600 320"><circle cx="330" cy="154" r="124" className="landing__art-outer"/><circle cx="330" cy="154" r="103" className="landing__art-inner"/><circle cx="330" cy="154" r="40" className="landing__art-hub"/><circle cx="330" cy="154" r="11" className="landing__art-center"/><path d="M330 51v63m0 80v63M227 154h63m80 0h63M257 81l45 45m56 56 45 45M403 81l-45 45m-56 56-45 45" className="landing__art-spoke"/><path d="M29 258h172l32-24h147l31 24h156" className="landing__art-signal"/><path d="M30 274h145m297 0h95" className="landing__art-muted"/><circle cx="233" cy="234" r="4"/><circle cx="411" cy="234" r="4"/></svg><div className="landing__art-foot"><span>{t("landing.artFoot", lang)}</span><span>{t("landing.proxyLabel", lang)}</span></div></div>
      </section>
      <section className="landing__facts" aria-label={t("landing.factsTitle", lang)}>
        <article><span>{t("landing.factPm", lang)}</span><strong>{n(250)} <small>h</small></strong><ProvenanceTag lang={lang} value="ASSUMPTION" /></article>
        <article><span>{t("landing.factRate", lang)}</span><strong>{n(10)} <small>Hz</small></strong><ProvenanceTag lang={lang} value="VERIFIED" /></article>
        <article><span>{t("landing.factReservoir", lang)}</span><strong>{n(95)} <small>L · SAE 85W-140</small></strong><ProvenanceTag lang={lang} value="VERIFIED" /></article>
        <article><span>{t("landing.factLevels", lang)}</span><strong>N1–N4 <small>{t("landing.readOnly", lang)}</small></strong><ProvenanceTag lang={lang} value="VERIFIED" /></article>
      </section>
      <section className="landing__section" id="approach">
        <div className="landing__section-heading"><span className="landing__index">01 / {t("landing.navProposal", lang)}</span><div><h2>{t("landing.blindTitle", lang)}</h2><p>{t("landing.blindBody", lang)}</p></div></div>
        <div className="landing__comparison">
          <article className="landing__compare landing__compare--pm"><header><div><span className="landing__micro">01 / {t("landing.compareLabel", lang)}</span><h3>{t("landing.conventionalTitle", lang)}</h3></div><span className="landing__compare-tag">{t("landing.periodicTag", lang)}</span></header><div className="landing__mini-timeline"><div className="landing__timeline-track"><i /><b>{t("landing.inspection", lang)}</b><i /></div><div className="landing__timeline-labels"><span>0 h</span><span>{n(250)} h</span></div><div className="landing__blind-window">{t("landing.blindWindow", lang)}</div></div><ul>{bulletsLeft.map((item) => <li><span>—</span>{t(key(item), lang)}</li>)}</ul></article>
          <article className="landing__compare landing__compare--og"><header><div><span className="landing__micro">02 / {t("landing.compareLabel", lang)}</span><h3>{t("landing.oilguardTitle", lang)}</h3></div><span className="landing__compare-tag">{t("landing.modelTag", lang)}</span></header><div className="landing__mini-timeline landing__mini-timeline--continuous"><div className="landing__estimate-band"/><svg viewBox="0 0 330 68" preserveAspectRatio="none"><path d="M0 45 C34 39,50 42,77 34 S125 26,160 31 S211 21,242 27 S293 19,330 15"/></svg><div className="landing__timeline-labels"><span>0 h</span><span>{n(250)} h</span></div></div><ul>{bulletsRight.map((item) => <li><span>+</span>{t(key(item), lang)}</li>)}</ul></article>
        </div>
        <aside className="landing__scope-banner"><span className="landing__banner-mark">i</span><div><strong>{t("landing.scopeTitle", lang)}</strong><p>{t("landing.scopeBody", lang)}</p></div><a href="/docs/thesis-annex.md">{t("landing.scopeLink", lang)} <span>↗</span></a></aside>
      </section>
      <section className="landing__section landing__telemetry-section" id="telemetry">
        <div className="landing__section-heading"><span className="landing__index">02 / {t("landing.navTelemetry", lang)}</span><div><h2>{t("landing.regimeTitle", lang)}</h2><p>{t("landing.regimeBody", lang)}</p></div></div>
        <div className="landing__regime-layout"><div className="landing__regimes"><article><span className="landing__regime-number">01</span><div><span className="landing__micro">{t("landing.motionTag", lang)}</span><h3>{t("landing.motionTitle", lang)}</h3><p>{t("landing.motionBody", lang)}</p><ProvenanceTag lang={lang} value="DERIVED" /></div></article><article><span className="landing__regime-number">02</span><div><span className="landing__micro">{t("landing.restTag", lang)}</span><h3>{t("landing.restTitle", lang)}</h3><p>{t("landing.restBody", lang)}</p><ProvenanceTag lang={lang} value="ASSUMPTION" /></div></article><a href="/calibration" className="landing__calibration-link">{t("landing.calibrationLink", lang)} <span>↗</span></a></div><TelemetryChart lang={lang}/></div>
      </section>
      <section className="landing__section" id="technology">
        <div className="landing__section-heading"><span className="landing__index">03 / {t("landing.navTechnology", lang)}</span><div><h2>{t("landing.hardwareTitle", lang)}</h2><p>{t("landing.hardwareBody", lang)}</p></div></div>
        <div className="landing__hardware"><div className="landing__mount-table-wrap"><table className="landing__mount-table"><thead><tr><th>{t("landing.tablePoint", lang)}</th><th>{t("landing.tableSensor", lang)}</th><th>{t("landing.tableMount", lang)}</th><th>{t("landing.tableStatus", lang)}</th></tr></thead><tbody>{sensors.map((sensor, index) => <tr><td>GDY106 / 0{index + 1}</td><td>{t(key(sensor), lang)}</td><td>{t(key(["landing.mountThreaded", "landing.mountSurface", "landing.mountSurface", "landing.mountReference"][index]), lang)}</td><td><span className="landing__assumption-chip">{t("landing.designInput", lang)}</span></td></tr>)}</tbody></table><p className="landing__table-note"><ProvenanceTag lang={lang} value="ASSUMPTION" /> {t("landing.mountNote", lang)}</p></div><div className="landing__pipeline"><h3>{t("landing.pipelineHeading", lang)}</h3>{pipeline.map(([label, spec], index) => <div className="landing__pipe-row"><span className="landing__pipe-index">0{index + 1}</span><strong>{t(key(label), lang)}</strong><span>{spec === "10 Hz" ? `${n(10)} Hz` : spec === "retention policy" ? t("landing.retentionSpec", lang) : spec}</span></div>)}</div></div>
        <div className="landing__sensor-line"><span>{t("landing.signalInputs", lang)}</span><div>{sensors.map((sensor) => <span>{t(key(sensor), lang)} <ProvenanceTag lang={lang} value="ASSUMPTION" /></span>)}</div></div>
      </section>
      <section className="landing__section" id="alerts">
        <div className="landing__section-heading"><span className="landing__index">04 / {t("landing.navAlerts", lang)}</span><div><h2>{t("landing.ladderTitle", lang)}</h2><p>{t("landing.ladderBody", lang)}</p></div></div>
        <div className="landing__ladder">{levels.map((level) => <article className={`landing__level landing__level--${level}`}><span className="landing__level-code">N{level}</span><h3>{t(key(`landing.n${level}Title`), lang)}</h3><p>{t(key(`landing.n${level}Body`), lang)}</p><span className="landing__recipient">{t(key(`landing.n${level}Recipient`), lang)}</span></article>)}</div>
        <aside className="landing__rul-banner"><span className="landing__rul-icon">RUL</span><div><strong>{t("landing.rulTitle", lang)}</strong><p>{t("landing.rulBody", lang)}</p></div><ProvenanceTag lang={lang} value="ASSUMPTION" /></aside>
      </section>
      <section className="landing__section landing__security-section">
        <div className="landing__section-heading"><span className="landing__index">05 / {t("landing.securityLabel", lang)}</span><div><h2>{t("landing.securityTitle", lang)}</h2><p>{t("landing.securityBody", lang)}</p></div></div>
        <div className="landing__security-grid"><article className="landing__integrity"><div><span>01</span><strong>{t("landing.securityHmac", lang)}</strong><ProvenanceTag lang={lang} value="VERIFIED" /></div><div><span>02</span><strong>{t("landing.securityReplay", lang)}</strong><ProvenanceTag lang={lang} value="VERIFIED" /></div><div><span>03</span><strong>{t("landing.securityReadonly", lang)}</strong><ProvenanceTag lang={lang} value="VERIFIED" /></div><a href="/docs/thesis-annex.md">{t("landing.securityTests", lang)} <span>↗</span></a></article><article className="landing__standards"><span className="landing__micro">{t("landing.standardsLabel", lang)}</span><h3>{t("landing.standardsTitle", lang)}</h3><p>{t("landing.standardReference", lang)}</p><strong>{t("landing.notInPrototype", lang)}</strong><ul><li>{t("landing.noAuth", lang)}</li><li>{t("landing.noBrokerTls", lang)}</li><li>{t("landing.noFieldData", lang)}</li></ul></article></div>
      </section>
      <section className="landing__section landing__evidence" id="evidence">
        <div className="landing__section-heading"><span className="landing__index">06 / {t("landing.navImpact", lang)}</span><div><h2>{t("landing.evidenceTitle", lang)}</h2><p>{t("landing.evidenceBody", lang)}</p></div></div>
        <div className="landing__evidence-grid"><a href="/docs/thesis-annex.md"><span className="landing__micro">{t("landing.evidenceSimulator", lang)}</span><strong>{n(300)} <small>{t("landing.evidenceRows", lang)}</small></strong><ProvenanceTag lang={lang} value="VERIFIED" /></a><a href="/docs/bench/stress.md"><span className="landing__micro">{t("landing.evidenceStress", lang)} · {n(1000)} {t("landing.evidenceDevices", lang)}</span><strong>{n(9699)} <small>{t("landing.evidenceRowsPerSecond", lang)}</small></strong><ProvenanceTag lang={lang} value="DERIVED" /></a><a href="/docs/thesis-annex.md"><span className="landing__micro">{t("landing.evidenceValidation", lang)}</span><strong>{n(1.8, 2)} <small>L MAE</small></strong><SyntheticBadge lang={lang} /></a><a href="/docs/thesis-annex.md"><span className="landing__micro">{t("landing.evidenceTests", lang)}</span><strong>{t("landing.evidenceTestScope", lang)}</strong><ProvenanceTag lang={lang} value="VERIFIED" /></a></div>
      </section>
      <section className="landing__section landing__team-section" id="team"><div className="landing__section-heading"><span className="landing__index">07 / {t("landing.navTeam", lang)}</span><div><h2>{t("landing.teamTitle", lang)}</h2><p>{t("landing.teamBody", lang)}</p></div></div><div className="landing__team">{team.map((person, index) => <article><span className="landing__avatar">{["MA", "PA", "SB", "FF"][index]}</span><div><strong>{t(key(person), lang)}</strong><small>{t("landing.credential", lang)}</small></div><span className="landing__member-index">0{index + 1}</span></article>)}</div></section>
      <section className="landing__closing"><div><span className="landing__micro">{t("landing.closingEyebrow", lang)}</span><h2>{t("landing.closingTitle", lang)}</h2><p>{t("landing.closingBody", lang)}</p></div><a className="landing__button landing__button--primary" href="/fleet">{t("landing.openDemo", lang)} <span>↗</span></a></section>
    </main>
    <footer className="landing__footer"><div className="landing__footer-grid"><div><a className="landing__footer-brand" href="/">OilGuard Mining</a><p>{t("landing.footerTagline", lang)}</p></div><div><strong>{t("landing.footerDocs", lang)}</strong><a href="/docs/thesis-annex.md">{t("landing.technicalAnnex", lang)}</a><a href="/docs/bench/stress.md">{t("landing.benchReport", lang)}</a><a href="/docs/calibration.md">{t("landing.calibration", lang)}</a><a href="/demo">{t("landing.footerDemo", lang)}</a></div><div><strong>{t("landing.footerTech", lang)}</strong><span>Rust · MQTT · FastAPI</span><span>InfluxDB · Astro · Preact</span><span>{t("landing.readOnly", lang)}</span></div><div><strong>{t("landing.footerContext", lang)}</strong><span>{t("landing.context", lang)}</span><span>{t("landing.proposalOnly", lang)}</span></div></div><div className="landing__legal"><span>OILGUARD / GDY106</span><span>{t("landing.legalLine", lang)}</span><span>{t("landing.proxyLabel", lang)}</span></div></footer>
  </div>;
}
