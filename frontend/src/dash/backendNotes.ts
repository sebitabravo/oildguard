import { t, type DictKey, type Lang } from "../i18n";

const BACKEND_TEXT_KEYS: Record<string, DictKey> = {
  "No T10 evaluation available for the current store.": "dash.backend.note.noT10",
  "no rows ingested yet; POST SignalRow batches to /ingest, then GET /alerts walks the N1–N4 ladder.": "dash.backend.note.noRows",
  "default (no rows ingested yet)": "dash.backend.source.defaultEmpty",
};

export function localizeDashboardBackendText(value: string, lang: Lang): string {
  const key = BACKEND_TEXT_KEYS[value];
  return key ? t(key, lang) : value;
}
