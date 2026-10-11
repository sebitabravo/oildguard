import { t } from "../i18n";

interface Props {
  title: string;
  path?: string;
}

export default function DocsTopBar({ title, path }: Props) {
  // Solo español (S03): sin botones de idioma; el shell declara es.
  return (
    <header className="docs-top">
      <a className="docs-top__back" href="/">
        <span aria-hidden="true">←</span> {t("docs.back")}
      </a>
      <div className="docs-top__title">
        <span className="docs-top__eyebrow">{path ?? t("docs.eyebrow")}</span>
        <strong>{title}</strong>
      </div>
      <nav className="docs-top__actions" aria-label={t("docs.navLabel")}>
        <a href="/docs">{t("docs.all")}</a>
      </nav>
    </header>
  );
}
