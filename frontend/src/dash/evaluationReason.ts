import { t, type DictKey, type Lang } from "../i18n";

const EVALUATION_REASON_KEYS: Record<string, DictKey> = {
  no_rows: "dash.evaluation.reason.noRows",
  insufficient_rest_samples: "dash.evaluation.reason.insufficientRest",
  analysis_unavailable: "dash.evaluation.reason.unavailable",
};

export function localizeUnevaluatedReason(
  reason: string | null | undefined,
  lang: Lang,
): string | null {
  if (!reason) return null;
  const key = Object.prototype.hasOwnProperty.call(EVALUATION_REASON_KEYS, reason)
    ? EVALUATION_REASON_KEYS[reason]
    : "dash.evaluation.reason.unknown";
  return t(key, lang);
}
