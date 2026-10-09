import { useEffect, useState } from "preact/hooks";
import BenchView from "./sim/bench/BenchView";
import TruckView from "./sim/truck/TruckView";
import { Dashboard } from "./dash";
import { useLang, t, type DictKey } from "./i18n";
import { modeFromHash, type Section } from "./routes";
import "./theme.css";

const SECTIONS: Array<{ id: Section; label: DictKey }> = [
  { id: "mine", label: "nav.mine" },
  { id: "wheel", label: "nav.wheel" },
  { id: "monitoring", label: "nav.monitoring" },
];

export default function App() {
  const [section, setSection] = useState<Section>(() => modeFromHash(window.location.hash));
  const [lang, setLang] = useLang();

  useEffect(() => {
    const onHash = () => setSection(modeFromHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const select = (next: Section) => {
    setSection(next);
    window.location.hash = next;
  };

  return (
    <div className="og-app">
      <header className="og-top">
        <div className="og-brand">
          <div className="og-brand__mark" aria-hidden="true">OG</div>
          <div>
            <div className="og-brand__name">{t("app.brand", lang)}</div>
            <div className="og-brand__tag">{t("app.tagline", lang)}</div>
          </div>
        </div>
        <nav className="og-nav" aria-label={t("nav.label", lang)}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="og-nav__item"
              aria-current={section === s.id ? "page" : undefined}
              onClick={() => select(s.id)}
            >
              {t(s.label, lang)}
            </button>
          ))}
        </nav>
        <div className="og-top__spacer" />
        <div className="og-seg" role="group" aria-label={t("lang.label", lang)}>
          {(["en", "es"] as const).map((code) => (
            <button
              key={code}
              type="button"
              className="og-seg__btn"
              aria-pressed={lang === code}
              onClick={() => setLang(code)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>
      <main className="og-content">
        {section === "mine" ? (
          <TruckView />
        ) : section === "wheel" ? (
          <BenchView />
        ) : (
          <Dashboard />
        )}
      </main>
    </div>
  );
}
