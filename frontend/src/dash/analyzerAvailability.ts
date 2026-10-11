import { t } from "../i18n";

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
): string | null {
  return isAnalyzerUnavailable(state) ? t("dash.analyzer.unavailable") : null;
}

// La caída total solo existe para la rueda en vivo con el backend caído: así
// el aviso nunca aparece en ruedas DEMO ni durante la sonda inicial.
export function isBackendOutage(live: boolean, backendNoteKind: "live" | "error" | null | undefined): boolean {
  return live && backendNoteKind === "error";
}
