// Bilingual dictionary (EN/ES) + persistent language toggle.
// User-authorized bilingual: UI + docs are EN/ES. Code identifiers and
// comments stay English. Spanish uses neutral/professional register.

export type Lang = "en" | "es";

export const LANG_STORAGE_KEY = "oilguard-lang";

export function getInitialLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (v === "es" || v === "en") return v;
  } catch {
    /* storage unavailable (headless) -> default EN */
  }
  return "en";
}

export function persistLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("oilguard:lang", { detail: lang }));
}

import { useEffect, useState } from "react";

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(() => getInitialLang());
  useEffect(() => {
    const onLang = (e: Event) => {
      const detail = (e as CustomEvent<Lang>).detail;
      if (detail === "en" || detail === "es") setLangState(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === LANG_STORAGE_KEY && (e.newValue === "en" || e.newValue === "es")) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener("oilguard:lang", onLang);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("oilguard:lang", onLang);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    persistLang(l);
  };
  return [lang, setLang];
}

/** Inline helper: pick the ES string when lang is "es". */
export const pick = (lang: Lang, en: string, es: string): string =>
  lang === "es" ? es : en;

const dict = {
  "tab.bench": { en: "Bench (S1/T2)", es: "Banco (S1/T2)" },
  "tab.truck": { en: "Truck (S2/T4)", es: "Camion (S2/T4)" },
  "tab.dash": { en: "Dash (S6/T11)", es: "Tablero (S6/T11)" },
  "tab.stub": { en: "Stub (S0)", es: "Base (S0)" },
  "app.title": { en: "OilGuard Mining Sim", es: "OilGuard Mining Sim" },
  "app.subtitle": {
    en: "930E / GDY106 32.62:1 ONLY — 980E-5 (GDY108-C) is future work without validation.",
    es: "Solo 930E / GDY106 32.62:1 — 980E-5 (GDY108-C) es trabajo futuro sin validar.",
  },
  "lang.toggle": { en: "ES", es: "EN" },
  "lang.label": { en: "Language / Idioma", es: "Idioma / Language" },
  "hud.oil": { en: "Oil", es: "Aceite" },
  "hud.recal": {
    en: "RECALIBRATING (stopped+leveled+engine-on)",
    es: "RECALIBRANDO (detenido+nivelado+motor encendido)",
  },
  "hud.standby": {
    en: "STANDBY · recalibration gated (moving)",
    es: "ESPERA · recalibracion bloqueada (en movimiento)",
  },
  "hud.moving": { en: "MOVING", es: "EN MOVIMIENTO" },
  "hud.rest": { en: "REST", es: "DETENIDO" },
  "hud.camera": { en: "Camera:", es: "Camara:" },
  "oil.normal": { en: "NORMAL (≥50%)", es: "NORMAL (≥50%)" },
  "oil.warning": { en: "WARNING (30–50%)", es: "ADVERTENCIA (30–50%)" },
  "oil.critical": { en: "CRITICAL (<30%)", es: "CRITICO (<30%)" },
  "rul.title": { en: "RUL", es: "Vida util remanente (RUL)" },
  "rul.suppressed": { en: "RUL suppressed · anomaly-only", es: "RUL suprimido · solo anomalias" },
  "demo.run": {
    en: "Run leak demo (clean → N4)",
    es: "Ejecutar demo de fuga (limpio → N4)",
  },
  "demo.reset": { en: "Reset demo", es: "Reiniciar demo" },
  "dash.footnote": {
    en: "28 kPa @ 95 L anchor: SYNTHETIC-PROXY (field-anchor pending h(L) bench) · priors in sim/physics.py · see docs/thesis-annex.md",
    es: "Referencia 28 kPa @ 95 L: SUSTITUTO SINTETICO (anclaje de campo pendiente del banco h(L)) · priors en sim/physics.py · ver docs/thesis-annex.md",
  },
} as const;

export type DictKey = keyof typeof dict;

/** Dictionary lookup with EN fallback. */
export function t(key: DictKey, lang: Lang): string {
  return dict[key][lang] ?? dict[key].en;
}
