import { dict, t, type DictKey, type DictParams, type Lang } from "../i18n";
import { formatNumber } from "../i18n/numberFormat";

export interface StructuredBackendMessage {
  code: string;
  params?: Record<string, unknown>;
}

const BACKEND_TEXT_KEYS: Record<string, DictKey> = {
  "No T10 evaluation available for the current store.": "dash.backend.note.noT10",
  "no rows ingested yet; POST SignalRow batches to /ingest, then GET /alerts walks the N1–N4 ladder.": "dash.backend.note.noRows",
  "RUL unavailable: no rows ingested yet; POST SignalRow batches to /ingest, then GET /alerts walks the N1–N4 ladder. Surface anomaly-only alerts instead.": "dash.backend.note.rulNoRows",
  "default (no rows ingested yet)": "dash.backend.source.defaultEmpty",
};

export function localizeDashboardBackendText(value: string, lang: Lang): string {
  if (!Object.prototype.hasOwnProperty.call(BACKEND_TEXT_KEYS, value)) return value;
  const key = BACKEND_TEXT_KEYS[value];
  return t(key, lang);
}

export function translateStructuredBackendMessage(
  message: StructuredBackendMessage | undefined,
  lang: Lang,
): string | undefined {
  if (!message || !Object.prototype.hasOwnProperty.call(dict, message.code)) return undefined;
  return t(message.code as DictKey, lang, formatMessageParams(message, lang));
}

const PLM_ZONE_KEYS: Record<string, DictKey> = {
  LOAD: "truck.state.loading",
  HAUL: "truck.state.hauling",
  DUMP: "truck.state.dumping",
  WAIT: "truck.state.afterDump",
};

export function localizeBackendZone(zone: string, lang: Lang): string {
  if (!Object.prototype.hasOwnProperty.call(PLM_ZONE_KEYS, zone)) return zone;
  return t(PLM_ZONE_KEYS[zone], lang);
}

function formatMessageValue(value: unknown, lang: Lang, digits = 6): string {
  if (Array.isArray(value)) {
    return value.map((part) => formatMessageValue(part, lang, digits)).join("+");
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const formatted = formatNumber(value, lang, digits);
    const separator = lang === "es" ? "," : ".";
    const [integer, fraction] = formatted.split(separator);
    const trimmedFraction = fraction?.replace(/0+$/, "");
    return trimmedFraction ? `${integer}${separator}${trimmedFraction}` : integer;
  }
  return String(value ?? "");
}

function formatMessageParams(
  message: StructuredBackendMessage,
  lang: Lang,
): DictParams {
  return Object.fromEntries(
    Object.entries(message.params ?? {}).map(([name, value]) => {
      if (name === "zone" && typeof value === "string") {
        return [name, localizeBackendZone(value, lang)];
      }
      const digits = message.code === "rul_no_leak_trend" && name === "slope_l_per_h" ? 2 : 6;
      return [name, formatMessageValue(value, lang, digits)];
    }),
  );
}

export function localizeBackendMessage(
  message: StructuredBackendMessage | undefined,
  legacyText: string,
  lang: Lang,
): string {
  if (!message) return localizeDashboardBackendText(legacyText, lang);
  return translateStructuredBackendMessage(message, lang) ?? legacyText;
}
