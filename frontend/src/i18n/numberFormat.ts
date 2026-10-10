import type { Lang } from "./index";

export function formatNumber(value: number, lang: Lang, digits: number): string {
  const locale = lang === "es" ? "es-CL" : "en-US";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(value);
}
