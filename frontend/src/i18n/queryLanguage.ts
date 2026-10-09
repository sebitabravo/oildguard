import type { Lang } from "./index";

export function languageFromQuery(search: string): Lang | undefined {
  const language = new URLSearchParams(search).get("lang")?.trim().toLowerCase();
  return language === "en" || language === "es" ? language : undefined;
}
