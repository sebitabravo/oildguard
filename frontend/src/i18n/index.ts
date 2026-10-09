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
  "nav.label": { en: "Primary navigation", es: "Navegación principal" },
  "nav.mine": { en: "Mine & Fleet", es: "Mina y flota" },
  "nav.wheel": { en: "GDY106 Wheel", es: "Rueda GDY106" },
  "nav.monitoring": { en: "Monitoring", es: "Monitoreo" },
  "app.brand": { en: "OilGuard Mining", es: "OilGuard Mining" },
  "app.tagline": {
    en: "Digital twin · Komatsu 930E-4SE · GDY106",
    es: "Gemelo digital · Komatsu 930E-4SE · GDY106",
  },
  "app.scope": {
    en: "930E / GDY106 32.62:1 ONLY — 980E-5 (GDY108-C) is future work without validation.",
    es: "Solo 930E / GDY106 32.62:1 — 980E-5 (GDY108-C) es trabajo futuro sin validar.",
  },
  "lang.label": { en: "Language / Idioma", es: "Idioma / Language" },
  "drawer.label": { en: "Details panel", es: "Panel de detalle" },
  "drawer.status": { en: "Status", es: "Estado" },
  "drawer.sheet": { en: "Technical sheet", es: "Ficha técnica" },
  "drawer.notes": { en: "Notes", es: "Notas" },
  "drawer.collapse": { en: "Hide panel", es: "Ocultar panel" },
  "drawer.expand": { en: "Show panel", es: "Mostrar panel" },
  "badge.placeholder": { en: "Placeholder model", es: "Modelo provisional" },
  "badge.proxy": { en: "Synthetic proxy", es: "Sustituto sintético" },
  "badge.close": { en: "Close note", es: "Cerrar nota" },
  "truck.honesty": {
    en: "Visual note: the 3D body is a procedural placeholder with 930E-class proportions, not a manual-faithful model. Every figure in this view (15.29×8.89×8.10 m, body-up 14.80 m, GDY106, 32.62:1, weights and fluids) is 930E-4SE. Provenance: docs/models.md.",
    es: "Nota visual: la carrocería 3D es un modelo procedural provisional con proporciones de clase 930E, no un modelo fiel al manual. Todas las cifras de esta vista (15.29×8.89×8.10 m, tolva arriba 14.80 m, GDY106, 32.62:1, pesos y fluidos) son 930E-4SE. Procedencia: docs/models.md.",
  },
  "bench.honesty": {
    en: "The cutaway is a simplified reconstruction (not CAD-exact). Oil level, pressure and the viscosity/settling shape are SYNTHETIC-PROXY until the bench drain-and-weigh calibration (docs/calibration.md).",
    es: "El corte es una reconstrucción simplificada (no exacta en CAD). El nivel de aceite, la presión y la forma de viscosidad/asentamiento son SUSTITUTO SINTÉTICO hasta la calibración de drenaje y pesaje en banco (docs/calibration.md).",
  },
  "dash.honesty": {
    en: "UNPROVEN until the bench drain-and-weigh calibration. If the backend is down, a local DEMO set is used and always labeled.",
    es: "NO PROBADO hasta la calibración de drenaje y pesaje en banco. Si el backend cae se usa un set DEMO local, siempre rotulado.",
  },
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
  "hud.camera": { en: "Camera", es: "Cámara" },
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
    en: "Pressure is derived from the gear-case geometry (sim/geometry.py): ≈2.6 kPa at 95 L · geometry is an ASSUMPTION until the bench h(V) test · SYNTHETIC-PROXY · priors in sim/physics.py · see docs/thesis-annex.md",
    es: "La presión se deriva de la geometría de la caja de engranajes (sim/geometry.py): ≈2.6 kPa a 95 L · la geometría es un SUPUESTO hasta el ensayo h(V) en banco · SUSTITUTO SINTÉTICO · priors en sim/physics.py · ver docs/thesis-annex.md",
  },
} as const;

export type DictKey = keyof typeof dict;

/** Todas las claves del diccionario (para verificar cobertura EN/ES en tests). */
export function dictKeys(): DictKey[] {
  return Object.keys(dict) as DictKey[];
}

/** Dictionary lookup with EN fallback. */
export function t(key: DictKey, lang: Lang): string {
  return dict[key][lang] ?? dict[key].en;
}
