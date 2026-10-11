import { t } from "../i18n";

export interface DocsIndexEntry {
  slug: string;
  title: string;
  href: string;
}

export default function DocsIndex({ entries }: { entries: DocsIndexEntry[] }) {
  return (
    <section className="docs-index">
      <span className="docs-top__eyebrow">{t("docs.eyebrow")}</span>
      <h1>{t("docs.indexTitle")}</h1>
      <p className="docs-index__intro">{t("docs.indexIntro")}</p>
      <p className="docs-index__note">
        {t("docs.count", { count: entries.length })} · {t("docs.contentLang")}
      </p>
      <div className="docs-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("docs.colDocument")}</th>
              <th>{t("docs.colPath")}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.slug}>
                <td><a href={entry.href}>{entry.title}</a></td>
                <td><code>docs/{entry.slug}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
