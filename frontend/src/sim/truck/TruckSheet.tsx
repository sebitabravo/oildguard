import { t, type Lang } from "../../i18n";
import { formatNumber } from "../../i18n/numberFormat";
import { SPEC } from "../../twin/truck930e/spec";
import ProvenanceTable from "./ProvenanceTable";
import { TRUCK_DIMS_M, TRUCK_WEIGHTS_KG } from "./cycle";

export default function TruckSheet({ lang }: { lang: Lang }) {
  const format = (value: number, digits: number) => formatNumber(value, lang, digits);
  return (
    <>
      <h2 className="og-h2">{t("truck.sheet.dimensionsTitle", lang)}</h2>
      <p className="og-body og-num">
        {t("truck.sheet.dimensions", lang, {
          length: format(TRUCK_DIMS_M.L, 2),
          width: format(TRUCK_DIMS_M.W, 2),
          height: format(TRUCK_DIMS_M.H, 2),
          bodyUp: format(TRUCK_DIMS_M.bodyUp, 2),
          brochureLength: format(SPEC.chassis.overallLength.value, 2),
          brochureWidth: format(SPEC.chassis.overallWidth.value, 2),
          brochureHeight: format(SPEC.chassis.overallHeight.value, 2),
          brochureBodyUp: format(SPEC.chassis.bodyUpHeight.value, 2),
          empty: format(TRUCK_WEIGHTS_KG.empty, 0),
          emptyFront: format(TRUCK_WEIGHTS_KG.emptyF, 0),
          emptyRear: format(TRUCK_WEIGHTS_KG.emptyR, 0),
          loaded: format(TRUCK_WEIGHTS_KG.loaded, 0),
          loadedFront: format(TRUCK_WEIGHTS_KG.loadedF, 0),
          loadedRear: format(TRUCK_WEIGHTS_KG.loadedR, 0),
          payload: format(TRUCK_WEIGHTS_KG.payload, 0),
          volume: format(TRUCK_WEIGHTS_KG.volumeM3, 0),
          max: format(TRUCK_WEIGHTS_KG.maxT, 0),
          overload: format(TRUCK_WEIGHTS_KG.overloadT, 0),
        })}
      </p>
      <h2 className="og-h2">{t("truck.sheet.fluidsTitle", lang)}</h2>
      <p className="og-body">{t("truck.sheet.fluids", lang)}</p>
      <h2 className="og-h2">{t("truck.sheet.powertrainTitle", lang)}</h2>
      <p className="og-body">
        {t("truck.sheet.powertrain", lang, {
          gridSeconds: format(0.7, 1),
          frontRatio: format(12.92, 2),
          rearRatio: format(9.4, 2),
          angle: format(6.5, 1),
        })}
      </p>
      <h2 className="og-h2">{t("truck.sheet.brakesTitle", lang)}</h2>
      <p className="og-body">{t("truck.sheet.brakes", lang)}</p>
      <ProvenanceTable lang={lang} />
    </>
  );
}
