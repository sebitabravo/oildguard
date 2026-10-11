import { t } from "../i18n";
import { formatNumber } from "../i18n/numberFormat";

export function formatDemoLabNote(): string {
  return t("dash.demo.labNote", {
    leakRate: formatNumber(128.5, 1),
    rateMultiplier: formatNumber(257, 0),
    specRate: formatNumber(0.5, 1),
    lossLiters: formatNumber(4, 1),
    durationSeconds: formatNumber(120, 0),
  });
}
