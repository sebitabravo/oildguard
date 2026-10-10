import { t, type DictKey, type Lang } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { specRows, type Provenance } from "../../twin/truck930e/spec";

// Tabla "Procedencia del modelo" generada desde spec.ts: cada cota con su valor,
// unidad y etiqueta VERIFIED / DERIVED / ASSUMPTION (agrupada por componente).

const TAG_KEY: Record<Provenance, DictKey> = {
  VERIFIED: "prov.verified",
  DERIVED: "prov.derived",
  ASSUMPTION: "prov.assumption",
};

const fmt = (value: number, lang: Lang) =>
  formatNumber(value, lang, 3).replace(/([,.]\d*?[1-9])0+$/, "$1").replace(/[,.]0+$/, "");

export default function ProvenanceTable({ lang }: { lang: Lang }) {
  const rows = specRows();
  const count = (tag: Provenance) => rows.filter((r) => r.tag === tag).length;
  const groups = Array.from(new Set(rows.map((r) => r.group)));
  return (
    <details className="og-prov" open>
      <summary className="og-prov__summary">
        {t("sheet.provenance", lang)} · {rows.length} · {count("VERIFIED")} {t("prov.verified", lang).toLowerCase()} ·{" "}
        {count("DERIVED")} {t("prov.derived", lang).toLowerCase()} · {count("ASSUMPTION")}{" "}
        {t("prov.assumption", lang).toLowerCase()}
      </summary>
      <table className="og-table">
        <thead>
          <tr>
            <th>{t("prov.name", lang)}</th>
            <th className="og-table__num">{t("prov.value", lang)}</th>
            <th>{t("prov.unit", lang)}</th>
            <th>{t("prov.tag", lang)}</th>
            <th>{t("prov.source", lang)}</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g}>
            <tr className="og-table__group">
              <th colSpan={5}>{g}</th>
            </tr>
            {rows
              .filter((r) => r.group === g)
              .map((r) => (
                <tr key={`${g}.${r.name}`}>
                  <td>{r.name}</td>
                  <td className="og-table__num og-num">{fmt(r.value, lang)}</td>
                  <td>{r.unit}</td>
                  <td>
                    <span className={`og-tag og-tag--${r.tag.toLowerCase()}`}>{t(TAG_KEY[r.tag], lang)}</span>
                  </td>
                  <td className="og-table__src">{r.source}</td>
                </tr>
              ))}
          </tbody>
        ))}
      </table>
    </details>
  );
}
