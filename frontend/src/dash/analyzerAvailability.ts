import { t, type Lang } from "../i18n";

export interface AnalyzerAvailabilityState {
  analysisAvailable?: boolean;
  alertStatus?: string;
  rulStatus?: string;
  alertsEvaluated?: boolean;
  rulEvaluated?: boolean;
}

export function isAnalyzerUnavailable(state: AnalyzerAvailabilityState): boolean {
  return state.analysisAvailable === false ||
    state.alertStatus === "unavailable" ||
    state.rulStatus === "unavailable";
}

export function analyzerUnavailableNotice(
  state: AnalyzerAvailabilityState,
  lang: Lang,
): string | null {
  return isAnalyzerUnavailable(state) ? t("dash.analyzer.unavailable", lang) : null;
}
