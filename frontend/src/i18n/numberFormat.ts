// Solo español (S01): todo número visible usa es-CL. S04 borró el
// parámetro de idioma que S01 dejó como puente.

export function formatNumber(value: number, digits: number): string {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(value);
}
