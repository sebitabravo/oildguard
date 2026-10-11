import { dict, t, type DictKey, type DictParams } from "../i18n";
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

export function localizeDashboardBackendText(value: string): string {
  if (!Object.prototype.hasOwnProperty.call(BACKEND_TEXT_KEYS, value)) return value;
  const key = BACKEND_TEXT_KEYS[value];
  return t(key);
}

export function translateStructuredBackendMessage(
  message: StructuredBackendMessage | undefined,
): string | undefined {
  if (!message || !Object.prototype.hasOwnProperty.call(dict, message.code)) return undefined;
  return t(message.code as DictKey, formatMessageParams(message));
}

const PLM_ZONE_KEYS: Record<string, DictKey> = {
  LOAD: "truck.state.loading",
  HAUL: "truck.state.hauling",
  DUMP: "truck.state.dumping",
  WAIT: "truck.state.afterDump",
};

export function localizeBackendZone(zone: string): string {
  if (!Object.prototype.hasOwnProperty.call(PLM_ZONE_KEYS, zone)) return zone;
  return t(PLM_ZONE_KEYS[zone]);
}

function formatMessageValue(value: unknown, digits = 6): string {
  if (Array.isArray(value)) {
    return value.map((part) => formatMessageValue(part, digits)).join("+");
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const formatted = formatNumber(value, digits);
    const separator = ",";
    const [integer, fraction] = formatted.split(separator);
    const trimmedFraction = fraction?.replace(/0+$/, "");
    return trimmedFraction ? `${integer}${separator}${trimmedFraction}` : integer;
  }
  return String(value ?? "");
}

function formatMessageParams(
  message: StructuredBackendMessage,
): DictParams {
  return Object.fromEntries(
    Object.entries(message.params ?? {}).map(([name, value]) => {
      if (name === "zone" && typeof value === "string") {
        return [name, localizeBackendZone(value)];
      }
      const digits = message.code === "rul_no_leak_trend" && name === "slope_l_per_h" ? 2 : 6;
      return [name, formatMessageValue(value, digits)];
    }),
  );
}

export function localizeBackendMessage(
  message: StructuredBackendMessage | undefined,
  legacyText: string,
): string {
  if (!message) return localizeDashboardBackendText(legacyText);
  return translateStructuredBackendMessage(message) ?? legacyText;
}
