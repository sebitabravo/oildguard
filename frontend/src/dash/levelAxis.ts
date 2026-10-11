import { formatNumber } from "../i18n/numberFormat";

export function timeAxisTicks(tMin: number, tMax: number): Array<{ t_s: number; agoS: number }> {
  const span = tMax - tMin;
  return Array.from({ length: 5 }, (_, step) => {
    const t_s = tMin + (span * step) / 4;
    return { t_s, agoS: tMax - t_s };
  });
}

export function agoLabel(agoS: number, nowLabel: string): string {
  if (agoS <= 0) return nowLabel;
  return agoS < 180
    ? `−${formatNumber(agoS, 0)} s`
    : `−${formatNumber(agoS / 60, 0)} min`;
}
