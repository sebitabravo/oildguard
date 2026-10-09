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

import { useEffect, useState } from "preact/hooks";

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

export const dict = {
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
    en: "Visual note: the 3D truck is a parametric reconstruction of the 930E-4SE built from the Komatsu brochure (AESS778-02), the operation manual and course photos, not a CAD-exact model. Chassis, tire and body dimensions are brochure values; the position of deck equipment is estimated from photos. Every dimension and its provenance is listed in the technical sheet.",
    es: "Nota visual: el camión 3D es una reconstrucción paramétrica del 930E-4SE hecha con el folleto Komatsu (AESS778-02), el manual de operación y fotos del curso, no un modelo exacto en CAD. Las cotas de chasis, neumáticos y tolva son del folleto; la posición del equipo de la cubierta se estima desde fotos. Cada cota y su procedencia están en la ficha técnica.",
  },
  "badge.model": { en: "Parametric model · Komatsu manuals", es: "Modelo paramétrico · manuales Komatsu" },
  "badge.model.open": { en: "Open technical sheet", es: "Abrir ficha técnica" },
  "truck.model": {
    en: "Parametric model from Komatsu manuals — dimensions: brochure AESS778-02 / OM. Deck equipment positions are photo estimates; each dimension is tagged VERIFIED, DERIVED or ASSUMPTION in the technical sheet.",
    es: "Modelo paramétrico de los manuales Komatsu — dimensiones: folleto AESS778-02 / OM. La posición del equipo de cubierta se estima desde fotos; cada cota está rotulada VERIFICADO, DERIVADO o SUPUESTO en la ficha técnica.",
  },
  "sheet.provenance": { en: "Model provenance", es: "Procedencia del modelo" },
  "prov.name": { en: "Dimension", es: "Cota" },
  "prov.value": { en: "Value", es: "Valor" },
  "prov.unit": { en: "Unit", es: "Unidad" },
  "prov.tag": { en: "Provenance", es: "Procedencia" },
  "prov.source": { en: "Source", es: "Fuente" },
  "prov.verified": { en: "Verified", es: "Verificado" },
  "prov.derived": { en: "Derived", es: "Derivado" },
  "prov.assumption": { en: "Assumption", es: "Supuesto" },
  "bench.honesty": {
    en: "The cutaway is a simplified reconstruction (not CAD-exact). Oil level, pressure and the viscosity/settling shape are SYNTHETIC-PROXY until the bench drain-and-weigh calibration (docs/calibration.md).",
    es: "El corte es una reconstrucción simplificada (no exacta en CAD). El nivel de aceite, la presión y la forma de viscosidad/asentamiento son SUSTITUTO SINTÉTICO hasta la calibración de drenaje y pesaje en banco (docs/calibration.md).",
  },
  "dash.honesty": {
    en: "UNPROVEN until the bench drain-and-weigh calibration. If the backend is down, a local DEMO set is used and always labeled.",
    es: "NO PROBADO hasta la calibración de drenaje y pesaje en banco. Si el backend cae se usa un set DEMO local, siempre rotulado.",
  },
  "dash.backend.probing": { en: "Probing backend…", es: "Consultando el backend…" },
  "dash.backend.connected": { en: "Backend connected", es: "Backend conectado" },
  "dash.backend.offline": { en: "Backend unavailable · local DEMO data", es: "Backend no disponible · datos DEMO locales" },
  "hud.oil": { en: "Oil", es: "Aceite" },
  "hud.recal": {
    en: "RECALIBRATING (stopped+leveled+engine-on)",
    es: "RECALIBRANDO (detenido+nivelado+motor encendido)",
  },
  "hud.standby": {
    en: "STANDBY · recalibration gated (moving)",
    es: "ESPERA · recalibración bloqueada (en movimiento)",
  },
  "hud.moving": { en: "MOVING", es: "EN MOVIMIENTO" },
  "hud.rest": { en: "REST", es: "DETENIDO" },
  "hud.camera": { en: "Camera", es: "Cámara" },
  "oil.normal": { en: "NORMAL (≥50%)", es: "NORMAL (≥50%)" },
  "oil.warning": { en: "WARNING (30–50%)", es: "ADVERTENCIA (30–50%)" },
  "oil.critical": { en: "CRITICAL (<30%)", es: "CRÍTICO (<30%)" },
  "rul.title": { en: "RUL", es: "Vida útil remanente (RUL)" },
  "rul.suppressed": { en: "RUL suppressed · anomaly-only", es: "RUL suprimido · solo anomalías" },
  "rul.unavailable": { en: "No RUL payload yet.", es: "Aún no hay datos de vida útil remanente (RUL)." },
  "rul.syntheticNote": {
    en: "The synthetic proxy is unproven until bench calibration; anomaly alerts remain the supported output.",
    es: "El sustituto sintético no está validado hasta completar la calibración en banco; las alertas de anomalía siguen siendo el resultado disponible.",
  },
  "rul.suppressedNote": {
    en: "RUL is suppressed; anomaly alerts are the supported output.",
    es: "El RUL está suprimido; las alertas de anomalía son el resultado disponible.",
  },
  "rul.unproven": { en: "UNPROVEN until the bench", es: "no validado hasta completar la calibración en banco" },
  "wheel.reference": { en: "95 L reference", es: "Referencia: 95 L" },
  "demo.run": {
    en: "Run leak demo (clean → N4)",
    es: "Ejecutar demo de fuga (limpio → N4)",
  },
  "demo.reset": { en: "Reset demo", es: "Reiniciar demo" },
  "truck.restart": { en: "Restart cycle", es: "Reiniciar ciclo" },
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
