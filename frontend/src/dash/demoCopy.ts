import { t, type Lang } from "../i18n";
import { formatNumber } from "../i18n/numberFormat";

export function formatDemoLabNote(lang: Lang): string {
  return t("dash.demo.labNote", lang, {
    leakRate: formatNumber(128.5, lang, 1),
    rateMultiplier: formatNumber(257, lang, 0),
    specRate: formatNumber(0.5, lang, 1),
    lossLiters: formatNumber(4, lang, 1),
    durationSeconds: formatNumber(120, lang, 0),
  });
}
