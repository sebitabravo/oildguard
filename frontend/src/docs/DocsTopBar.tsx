import { t, useLang } from "../i18n";

interface Props {
  title: string;
  path?: string;
}

export default function DocsTopBar({ title, path }: Props) {
  const [lang, setLang] = useLang();
  return (
    <header className="docs-top">
      <a className="docs-top__back" href="/">
        <span aria-hidden="true">←</span> {t("docs.back", lang)}
      </a>
      <div className="docs-top__title">
        <span className="docs-top__eyebrow">{path ?? t("docs.eyebrow", lang)}</span>
        <strong>{title}</strong>
      </div>
      <nav className="docs-top__actions" aria-label={t("docs.navLabel", lang)}>
        <a href="/docs">{t("docs.all", lang)}</a>
        <div className="docs-top__lang" role="group" aria-label={t("docs.language", lang)}>
          <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
          <button type="button" aria-pressed={lang === "es"} onClick={() => setLang("es")}>ES</button>
        </div>
      </nav>
    </header>
  );
}
