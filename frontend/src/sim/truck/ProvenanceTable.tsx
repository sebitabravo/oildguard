import { t, type DictKey } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { specRows, type Provenance } from "../../twin/truck930e/spec";

// Tabla "Procedencia del modelo" generada desde spec.ts: cada cota con su valor,
// unidad y etiqueta VERIFIED / DERIVED / ASSUMPTION (agrupada por componente).

const TAG_KEY: Record<Provenance, DictKey> = {
  VERIFIED: "prov.verified",
  DERIVED: "prov.derived",
  ASSUMPTION: "prov.assumption",
};

const fmt = (value: number) =>
  formatNumber(value, 3).replace(/([,.]\d*?[1-9])0+$/, "$1").replace(/[,.]0+$/, "");

export default function ProvenanceTable() {
  const rows = specRows();
  const count = (tag: Provenance) => rows.filter((r) => r.tag === tag).length;
  const groups = Array.from(new Set(rows.map((r) => r.group)));
  return (
    <details className="og-prov" open>
      <summary className="og-prov__summary">
        {t("sheet.provenance")} · {rows.length} · {count("VERIFIED")} {t("prov.verified").toLowerCase()} ·{" "}
        {count("DERIVED")} {t("prov.derived").toLowerCase()} · {count("ASSUMPTION")}{" "}
        {t("prov.assumption").toLowerCase()}
      </summary>
      <table className="og-table">
        <thead>
          <tr>
            <th>{t("prov.name")}</th>
            <th className="og-table__num">{t("prov.value")}</th>
            <th>{t("prov.unit")}</th>
            <th>{t("prov.tag")}</th>
            <th>{t("prov.source")}</th>
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
                  <td className="og-table__num og-num">{fmt(r.value)}</td>
                  <td>{r.unit}</td>
                  <td>
                    <span className={`og-tag og-tag--${r.tag.toLowerCase()}`}>{t(TAG_KEY[r.tag])}</span>
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
