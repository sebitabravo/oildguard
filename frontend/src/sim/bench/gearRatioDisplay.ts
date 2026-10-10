import { GEAR_RATIO, GDY106_TRAIN, stageRatio } from "../../twin/physics";
import type { DictParams, Lang } from "../../i18n";

export type GearRatioDisplay = DictParams & {
  highSpeed: string;
  lowSpeed: string;
  overall: string;
};

export function buildGearRatioDisplay(lang: Lang): GearRatioDisplay {
  const locale = lang === "es" ? "es-ES" : "en-US";
  const stageFormatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
    useGrouping: false,
  });
  const totalFormatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });

  return {
    highSpeed: stageFormatter.format(stageRatio(GDY106_TRAIN.hs)),
    lowSpeed: stageFormatter.format(stageRatio(GDY106_TRAIN.ls)),
    overall: totalFormatter.format(GEAR_RATIO),
  };
}
