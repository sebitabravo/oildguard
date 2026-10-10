import { ProvenanceTag } from "../../ui/foundation";
import { formatNumber } from "../../i18n/numberFormat";
import { t, useLang } from "../../i18n";
import { useEffect } from "preact/hooks";
import "./landing.css";

export default function Landing() {
  const [lang, setLang] = useLang();
  const n = (value: number, digits = 0) => formatNumber(value, lang, digits);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  return (
    <div className="landing">
      <header className="landing__top">
        <a className="landing__brand" href="/" aria-label={t("landing.brand", lang)}>
          <span className="landing__mark" aria-hidden="true">OG</span>
          <span><strong>{t("landing.brand", lang)}</strong><small>{t("landing.brandLine", lang)}</small></span>
        </a>
        <div className="landing__top-actions">
          <span className="landing__context">{t("landing.context", lang)}</span>
          <div className="landing__language" role="group" aria-label={t("landing.language", lang)}>
            <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
            <button type="button" aria-pressed={lang === "es"} onClick={() => setLang("es")}>ES</button>
          </div>
        </div>
      </header>

      <main>
        <h1 className="og-visually-hidden">{t("landing.pageTitle", lang)}</h1>
        <section className="landing__hero" aria-labelledby="landing-hero-title">
          <div className="landing__hero-copy">
            <p className="landing__context landing__mobile-context">{t("landing.context", lang)}</p>
            <p className="landing__system-line"><span className="landing__pulse" />{t("landing.heroEyebrow", lang)}</p>
            <h2 id="landing-hero-title">{t("landing.heroTitle", lang)}</h2>
            <p className="landing__lede">{t("landing.heroBody", lang)}</p>
            <div className="landing__actions">
              <a className="landing__button landing__button--primary" href="/fleet">{t("landing.openDemo", lang)} <span aria-hidden="true">↗</span></a>
              <a className="landing__button landing__button--secondary" href="/login">{t("landing.signIn", lang)}</a>
            </div>
          </div>
          <div className="landing__hero-visual" role="img" aria-label={t("landing.heroVisual", lang)}>
            <div className="landing__visual-caption"><span>{t("landing.visualLabel", lang)}</span><b>{t("landing.visualState", lang)}</b></div>
            <svg viewBox="0 0 640 340" className="landing__wheel-art" aria-hidden="true">
              <circle cx="325" cy="166" r="138" className="landing__wheel-outer" />
              <circle cx="325" cy="166" r="116" className="landing__wheel-ring" />
              <circle cx="325" cy="166" r="48" className="landing__wheel-hub" />
              <circle cx="325" cy="166" r="17" className="landing__wheel-center" />
              <path d="M325 49v69m0 96v69M208 166h69m96 0h69M242 83l49 49m68 68 49 49M408 83l-49 49m-68 68-49 49" className="landing__spoke" />
              <path d="M38 263h170l34-21h161l40 21h159" className="landing__signal" />
              <path d="M38 277h151m270 0h143" className="landing__signal-muted" />
              <circle cx="242" cy="242" r="5" className="landing__node" />
              <circle cx="403" cy="242" r="5" className="landing__node" />
              <text x="40" y="302">{t("landing.visualAxis", lang)}</text>
              <text x="487" y="302">{t("landing.visualUnit", lang)}</text>
            </svg>
            <div className="landing__visual-foot"><span>{t("landing.visualFoot", lang)}</span><span>{t("landing.visualProxy", lang)}</span></div>
          </div>
        </section>

        <section className="landing__facts" aria-label={t("landing.factsTitle", lang)}>
          <article><span>{t("landing.factRate", lang)}</span><strong>{n(10)} <small>Hz</small></strong><ProvenanceTag lang={lang} value="VERIFIED" /></article>
          <article><span>{t("landing.factReservoir", lang)}</span><strong>{n(95)} <small>L · SAE 85W-140</small></strong><ProvenanceTag lang={lang} value="VERIFIED" /></article>
          <article><span>{t("landing.factLevels", lang)}</span><strong>{t("landing.levelCodes", lang)}</strong><ProvenanceTag lang={lang} value="VERIFIED" /></article>
          <article><span>{t("landing.factScope", lang)}</span><strong>{t("landing.readOnly", lang)}</strong><ProvenanceTag lang={lang} value="VERIFIED" /></article>
        </section>

        <section className="landing__section landing__blindspot">
          <div className="landing__section-heading"><span className="landing__index">01 / {t("landing.problemLabel", lang)}</span><h2>{t("landing.blindTitle", lang)}</h2><p>{t("landing.blindBody", lang)}</p></div>
          <div className="landing__timeline" aria-label={t("landing.timelineAlt", lang)}>
            <div className="landing__timeline-row"><span>{t("landing.pmLabel", lang)}</span><div className="landing__track"><i /><b>{t("landing.pmEvent", lang)}</b><i /></div><strong>{n(250)} h</strong></div>
            <div className="landing__timeline-row landing__timeline-row--og"><span>OilGuard</span><div className="landing__track landing__track--continuous"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><strong>{t("landing.continuous", lang)}</strong></div>
            <div className="landing__timeline-axis"><span>0 h</span><span>{n(125)} h</span><span>{n(250)} h</span></div>
            <p className="landing__timeline-note">{t("landing.noLossClaim", lang)}</p>
          </div>
        </section>

        <section className="landing__section landing__regimes">
          <div className="landing__section-heading"><span className="landing__index">02 / {t("landing.measurementLabel", lang)}</span><h2>{t("landing.regimeTitle", lang)}</h2><p>{t("landing.regimeBody", lang)}</p></div>
          <div className="landing__regime-grid">
            <article className="landing__regime landing__regime--motion"><div className="landing__regime-head"><span>01</span><ProvenanceTag lang={lang} value="DERIVED" /></div><h3>{t("landing.motionTitle", lang)}</h3><p>{t("landing.motionBody", lang)}</p><div className="landing__band"><i /></div><div className="landing__band-labels"><span>{t("landing.widerBand", lang)}</span><span>{t("landing.estimate", lang)}</span></div></article>
            <article className="landing__regime landing__regime--rest"><div className="landing__regime-head"><span>02</span><ProvenanceTag lang={lang} value="ASSUMPTION" /></div><h3>{t("landing.restTitle", lang)}</h3><p>{t("landing.restBody", lang)}</p><div className="landing__band landing__band--narrow"><i /></div><div className="landing__band-labels"><span>{t("landing.narrowBand", lang)}</span><span>{t("landing.settling", lang)}</span></div></article>
          </div>
          <div className="landing__physics"><span>{t("landing.physicsLabel", lang)}</span><strong>{n(2.6, 1)} kPa</strong><small><ProvenanceTag lang={lang} value="DERIVED" /> {t("landing.physicsValue", lang)}</small><strong>τ ≈ {n(0.75, 2)} s × μ</strong><small><ProvenanceTag lang={lang} value="ASSUMPTION" /> {t("landing.tauValue", lang)}</small><span className="landing__source">{t("landing.annexSource", lang)}</span></div>
        </section>

        <section className="landing__section landing__pipeline-section">
          <div className="landing__section-heading"><span className="landing__index">03 / {t("landing.systemLabel", lang)}</span><h2>{t("landing.pipelineTitle", lang)}</h2><p>{t("landing.pipelineBody", lang)}</p></div>
          <div className="landing__pipeline" aria-label={t("landing.pipelineAlt", lang)}>
            {["landing.stepRust", "landing.stepMqtt", "landing.stepFastApi", "landing.stepInflux", "landing.dashboard"].map((key, index) => <div className="landing__pipe-step"><span>0{index + 1}</span><strong>{t(key as Parameters<typeof t>[0], lang)}</strong>{index < 4 && <i aria-hidden="true">→</i>}</div>)}
          </div>
          <div className="landing__sensors"><h3>{t("landing.sensorsTitle", lang)}</h3><div><span>{t("landing.pressureSensor", lang)} <ProvenanceTag lang={lang} value="VERIFIED" /></span><span>{t("landing.temperatureSensor", lang)} <ProvenanceTag lang={lang} value="VERIFIED" /></span><span>{t("landing.accelerometer", lang)} <ProvenanceTag lang={lang} value="VERIFIED" /></span><span>{t("landing.contextSensor", lang)} <ProvenanceTag lang={lang} value="ASSUMPTION" /></span></div><p>{t("landing.mountingNote", lang)}</p></div>
          <div className="landing__signing"><span className="landing__sign-icon" aria-hidden="true">✓</span><div><strong>{t("landing.signedRows", lang)}</strong><p>{t("landing.signedRowsBody", lang)}</p></div><ProvenanceTag lang={lang} value="VERIFIED" /></div>
        </section>

        <section className="landing__section landing__ladder-section">
          <div className="landing__section-heading"><span className="landing__index">04 / {t("landing.responseLabel", lang)}</span><h2>{t("landing.ladderTitle", lang)}</h2><p>{t("landing.ladderBody", lang)}</p></div>
          <div className="landing__ladder">
            {[1,2,3,4].map((level) => <article className={`landing__level landing__level--${level}`}><span className="landing__level-code">N{level}</span><div><h3>{t(`landing.n${level}Title` as Parameters<typeof t>[0], lang)}</h3><p>{t(`landing.n${level}Body` as Parameters<typeof t>[0], lang)}</p></div><small>{t(`landing.n${level}Recipient` as Parameters<typeof t>[0], lang)}</small></article>)}
          </div>
          <div className="landing__scope"><div><span>{t("landing.channelRule", lang)}</span><strong>2 / 3</strong><p><code>pressure_drop</code> · <code>level_trend</code> · <code>vib_impact</code></p></div><div className="landing__veto"><span>{t("landing.temperatureVeto", lang)}</span><strong>{t("landing.exclusionOnly", lang)}</strong></div><div><span>{t("landing.rulScope", lang)}</span><strong>{t("landing.lubricantOnly", lang)}</strong><ProvenanceTag lang={lang} value="ASSUMPTION" /></div></div>
          <p className="landing__read-only">{t("landing.readOnlyStatement", lang)}</p>
        </section>

        <section className="landing__section landing__evidence-section">
          <div className="landing__section-heading"><span className="landing__index">05 / {t("landing.evidenceLabel", lang)}</span><h2>{t("landing.evidenceTitle", lang)}</h2><p>{t("landing.evidenceBody", lang)}</p></div>
          <div className="landing__evidence-grid">
            <article><div className="landing__evidence-heading"><h3>{t("landing.verifiedToday", lang)}</h3><ProvenanceTag lang={lang} value="DERIVED" /></div><p>{t("landing.parityEvidence", lang)}</p><p>{t("landing.stressIntro", lang)} {n(1000)} {t("landing.stressDevices", lang)} {n(10)} {t("landing.stressRowsReached", lang)} {n(5149.9632, 4)} {t("landing.stressSuffix", lang)}</p><span className="landing__source">{t("landing.benchSource", lang)}</span></article>
            <article className="landing__evidence-caveat"><div className="landing__evidence-heading"><h3>{t("landing.notVerified", lang)}</h3><ProvenanceTag lang={lang} value="ASSUMPTION" /></div><p>{t("landing.fieldGap", lang)}</p><p>{t("landing.benchGap", lang)}</p><span className="landing__source">{t("landing.calibrationSource", lang)}</span></article>
          </div>
        </section>

        <section className="landing__section landing__team-section">
          <div className="landing__team-context"><span className="landing__index">06 / {t("landing.teamLabel", lang)}</span><h2>{t("landing.teamTitle", lang)}</h2><p>{t("landing.teamBody", lang)}</p></div>
          <div className="landing__team"><span>{t("landing.teamMember1", lang)}</span><span>{t("landing.teamMember2", lang)}</span><span>{t("landing.teamMember3", lang)}</span><span>{t("landing.teamMember4", lang)}</span><strong>{t("landing.credential", lang)}</strong></div>
        </section>
      </main>

      <footer className="landing__footer"><a className="landing__footer-brand" href="/">{t("landing.brand", lang)}<span> · {t("landing.footerLine", lang)}</span></a><div><span>{t("landing.technicalAnnex", lang)}</span><span>{t("landing.benchReport", lang)}</span><span>{t("landing.calibration", lang)}</span></div><span>{t("landing.footerContext", lang)}</span></footer>
    </div>
  );
}
