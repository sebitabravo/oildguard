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
  "dash.analyzer.unavailable": {
    en: "Analyzer unavailable: alerts and RUL cannot be computed",
    es: "Analizador no disponible: no se pueden calcular alertas ni RUL",
  },
  "dash.evaluation.reason.noRows": {
    en: "No rows yet; alerts and RUL have not been evaluated.",
    es: "Aún no hay filas; no se han evaluado las alertas ni el RUL.",
  },
  "dash.evaluation.reason.insufficientRest": {
    en: "Insufficient rest samples; alerts and RUL have not been evaluated.",
    es: "Muestras de reposo insuficientes; no se han evaluado las alertas ni el RUL.",
  },
  "dash.evaluation.reason.unavailable": {
    en: "Analyzer unavailable: alerts and RUL cannot be computed",
    es: "Analizador no disponible: no se pueden calcular alertas ni RUL",
  },
  "dash.evaluation.reason.unknown": {
    en: "Evaluation is unavailable; technical details are hidden.",
    es: "La evaluación no está disponible; se ocultan los detalles técnicos.",
  },
  "dash.signing.verified": { en: "Signatures verified", es: "Firmas verificadas" },
  "dash.signing.rejected": { en: "rejected", es: "rechazadas" },
  "dash.signing.off": { en: "Enforcement off", es: "Verificación no obligatoria" },
  "dash.backend.note.noT10": {
    en: "No evaluation is available for the current data store.",
    es: "No hay una evaluación disponible para el almacenamiento actual.",
  },
  "dash.backend.note.noRows": {
    en: "no rows ingested yet; POST SignalRow batches to /ingest, then GET /alerts walks the N1–N4 ladder.",
    es: "Aún no se han ingerido filas; envía lotes de SignalRow a /ingest y luego GET /alerts recorre la escalera N1–N4.",
  },
  "dash.backend.note.rulNoRows": {
    en: "RUL unavailable: no rows ingested yet; POST SignalRow batches to /ingest, then GET /alerts walks the N1–N4 ladder. Surface anomaly-only alerts instead.",
    es: "RUL no disponible: aún no se han ingerido filas; envía lotes de SignalRow a /ingest y luego GET /alerts recorre la escalera N1–N4. En su lugar, muestra solo alertas de anomalías.",
  },
  alerts_analyzer_unavailable_fallback: {
    en: "The analyzer is unavailable; alerts and RUL were not evaluated. Rebuild the backend image with its runtime packages included.",
    es: "El analizador no está disponible; no se evaluaron las alertas ni el RUL. Reconstruye la imagen del backend con sus paquetes de ejecución.",
  },
  alerts_evaluation_failed_fallback: {
    en: "Alert evaluation failed; anomaly-only alerts remain available.",
    es: "Falló la evaluación de alertas; las alertas de anomalía siguen disponibles.",
  },
  alerts_memory_fallback: {
    en: "Memory-store grouping by recalibration flags; the full detector is sim/detect.py. This rest-gated model remains unproven until bench calibration.",
    es: "Agrupación del almacenamiento en memoria según las marcas de recalibración; el detector completo está en sim/detect.py. Este modelo condicionado al reposo sigue NO PROBADO hasta completar la calibración en banco.",
  },
  alerts_no_evaluation_note: {
    en: "No alert evaluation is available for the current data store.",
    es: "No hay una evaluación de alertas disponible para el almacenamiento de datos actual.",
  },
  alerts_no_rows_fallback: {
    en: "No rows ingested yet; POST SignalRow batches to /ingest, then GET /alerts walks the N1–N4 ladder.",
    es: "Aún no se han ingerido filas; envía lotes SignalRow a /ingest y luego GET /alerts recorre la escalera N1–N4.",
  },
  influx_client_missing: {
    en: "InfluxDB client unavailable; rows remain in memory.",
    es: "Cliente de InfluxDB no disponible; las filas se conservan en memoria.",
  },
  influx_unknown_no_ingest: {
    en: "unknown (no ingest yet)",
    es: "desconocido (aún no hay ingestión)",
  },
  influx_unreachable: {
    en: "InfluxDB unreachable; rows remain in memory.",
    es: "InfluxDB no está disponible; las filas se conservan en memoria.",
  },
  influx_written: {
    en: "written ({points} points)",
    es: "escrito ({points} puntos)",
  },
  ladder_model_note: {
    en: "Model=synthetic-proxy (UNPROVEN until bench calibration). Rest-gated and auditable; temperature drift vetoes N2 through the exclusion channel instead of confirming it.",
    es: "Modelo=sustituto sintético (NO PROBADO hasta la calibración en banco). Condicionado al reposo y auditable; la deriva de temperatura bloquea N2 mediante el canal de exclusión en vez de confirmarlo.",
  },
  ladder_n1_trend_persistence: {
    en: "N1 trend (persistence entry): evidence in window {window}, zone {zone}.",
    es: "N1 tendencia (entrada por persistencia): evidencia en la ventana {window}, zona {zone}.",
  },
  ladder_n2_confirmed_persistence: {
    en: "N2 confirmed leak: evidence persisted across consecutive windows {windows}.",
    es: "N2 fuga confirmada: la evidencia persistió en las ventanas consecutivas {windows}.",
  },
  ladder_n2_same_window_confirmation: {
    en: "N2 confirmed leak: {votes} of 3 channels agreed in window {window}.",
    es: "N2 fuga confirmada: {votes} de 3 canales coincidieron en la ventana {window}.",
  },
  ladder_n3_shift_window: {
    en: "N3 shift window: RUL to warning is {warning_hours} h, below the {shift_hours} h maintenance shift.",
    es: "N3 ventana de turno: faltan {warning_hours} h para la advertencia, menos que el turno de mantenimiento de {shift_hours} h.",
  },
  ladder_n4_abrupt_drop: {
    en: "N4 critical: abrupt window-to-window drop from {from_l} L to {to_l} L (over {threshold_l} L).",
    es: "N4 crítico: caída abrupta entre ventanas, de {from_l} L a {to_l} L (más de {threshold_l} L).",
  },
  ladder_n4_critical_level: {
    en: "N4 critical: level {level_pct}% is below the critical threshold of {critical_pct}%.",
    es: "N4 crítico: el nivel {level_pct}% está bajo el umbral crítico de {critical_pct}%.",
  },
  ladder_n4_extreme_collapse: {
    en: "N4 critical: extreme collapse z={z} with a kurtosis spike of {kurtosis} (impact transient).",
    es: "N4 crítico: caída extrema con z={z} y un aumento de curtosis de {kurtosis} (transitorio de impacto).",
  },
  level_memory_store_note: {
    en: "Level echoes ingested ground truth; the fused estimate and confidence are future work.",
    es: "El nivel refleja los datos de referencia ingeridos; la estimación fusionada y su confianza quedan para trabajo futuro.",
  },
  level_no_rows_note: {
    en: "POST SignalRow batches to /ingest; confidence is future work.",
    es: "Envía lotes SignalRow a /ingest; la confianza queda para trabajo futuro.",
  },
  rul_analyzer_unavailable_note: {
    en: "RUL is unavailable because the analyzer could not be loaded.",
    es: "El RUL no está disponible porque no se pudo cargar el analizador.",
  },
  rul_analyzer_unavailable_reason: {
    en: "The analyzer is unavailable; no RUL estimate was produced.",
    es: "El analizador no está disponible; no se generó una estimación de RUL.",
  },
  rul_baseline_precision_insufficient: {
    en: "Baseline precision is insufficient: sigma is {sigma_l} L, above the {max_sigma_l} L limit; anomaly-only output.",
    es: "La precisión de referencia es insuficiente: sigma es {sigma_l} L, sobre el límite de {max_sigma_l} L; solo se emiten anomalías.",
  },
  rul_model_note: {
    en: "Model=synthetic-proxy (UNPROVEN until bench calibration). Linear extrapolation uses the rest-gated level trend; abrupt steps invalidate it and trigger N4 instead.",
    es: "Modelo=sustituto sintético (NO PROBADO hasta la calibración en banco). La extrapolación lineal usa la tendencia del nivel en reposo; los cambios bruscos la invalidan y activan N4.",
  },
  rul_no_leak_trend: {
    en: "No leak trend: slope is {slope_l_per_h} L/h (not below zero); anomaly-only output.",
    es: "Sin tendencia de fuga: la pendiente es {slope_l_per_h} L/h (no es menor que cero); solo se emiten anomalías.",
  },
  rul_no_rows_note: {
    en: "RUL is unavailable until rows are ingested; anomaly-only alerts remain available.",
    es: "El RUL no está disponible hasta ingerir filas; las alertas de anomalía siguen disponibles.",
  },
  rul_no_rows_reason: {
    en: "No rows have been ingested yet.",
    es: "Aún no se han ingerido filas.",
  },
  rul_significant_leak_trend: {
    en: "Leak trend is significant; RUL was extrapolated.",
    es: "La tendencia de fuga es significativa; se extrapoló el RUL.",
  },
  rul_suppressed_note: {
    en: "RUL suppressed (lubrication/precision gate); surface anomaly-only alerts instead. See reason.",
    es: "RUL suprimido (filtro de lubricación o precisión); se muestran solo alertas de anomalía. Consulta el motivo.",
  },
  rul_suppressed_summary: {
    en: "RUL is suppressed; anomaly-only alerts remain available.",
    es: "El RUL está suprimido; las alertas de anomalía siguen disponibles.",
  },
  rul_trend_too_weak: {
    en: "Trend is too weak: R² is {r2}, below the minimum of {minimum_r2}; anomaly-only output.",
    es: "La tendencia es demasiado débil: R² es {r2}, bajo el mínimo de {minimum_r2}; solo se emiten anomalías.",
  },
  rul_insufficient_rest_samples: {
    en: "Insufficient rest samples: {count} scored, below the minimum of {minimum}; anomaly-only output.",
    es: "Muestras de reposo insuficientes: {count} evaluadas, bajo el mínimo de {minimum}; solo se emiten anomalías.",
  },
  source_memory_store: {
    en: "memory store (InfluxDB when reachable)",
    es: "almacenamiento en memoria de esta sesión (InfluxDB cuando esté disponible)",
  },
  source_no_rows: {
    en: "default (no rows ingested yet)",
    es: "predeterminado (aún no se han ingerido filas)",
  },
  "dash.backend.source.defaultEmpty": {
    en: "default (no rows ingested yet)",
    es: "predeterminado (aún no se han ingerido filas)",
  },
  "dash.fleet.title": { en: "Fleet wheel monitoring", es: "Monitoreo de ruedas de flota" },
  "dash.fleet.proxy": { en: "SYNTHETIC-PROXY · demo values only · no live per-wheel feed", es: "SUSTITUTO SINTÉTICO · solo valores de demostración · sin datos reales por rueda" },
  "dash.fleet.assumptions": {
    en: "Demo alert assumption: at least 2 of 3 channels — oil ≤47.5 L, temperature ≥90 °C, vibration ≥7 mm/s. Current is displayed but does not trigger this rule. This demo rule is separate from calibrated backend N1–N4 leak analysis.",
    es: "Supuesto de alerta de demostración: al menos 2 de 3 canales — aceite ≤47,5 L, temperatura ≥90 °C, vibración ≥7 mm/s. La corriente se muestra, pero no activa esta regla. Esta regla de demostración es independiente del análisis de fugas N1–N4 del backend calibrado.",
  },
  "dash.fleet.truck": { en: "Truck", es: "Camión" },
  "dash.fleet.wheel": { en: "Wheel", es: "Rueda" },
  "dash.fleet.instrumented": { en: "Instrumented", es: "Instrumentada" },
  "dash.fleet.oil": { en: "Oil · L", es: "Aceite · L" },
  "dash.fleet.temp": { en: "Temperature · °C (recent series)", es: "Temperatura · °C (serie reciente)" },
  "dash.fleet.vibration": { en: "Vibration · mm/s (recent series)", es: "Vibración · mm/s (serie reciente)" },
  "dash.fleet.current": { en: "Current · A (recent series)", es: "Corriente · A (serie reciente)" },
  "dash.fleet.risk": { en: "Combined demo risk", es: "Riesgo combinado de demostración" },
  "dash.fleet.detailColumn": { en: "Detail", es: "Detalle" },
  "dash.fleet.alert": { en: "DEMO ALERT", es: "ALERTA DEMO" },
  "dash.fleet.normal": { en: "No demo alert", es: "Sin alerta demo" },
  "dash.fleet.detail": { en: "Open wheel detail", es: "Abrir detalle de rueda" },
  "dash.fleet.lowOil": { en: "Low oil", es: "Aceite bajo" },
  "dash.fleet.highTemperature": { en: "High temperature", es: "Temperatura alta" },
  "dash.fleet.highVibration": { en: "High vibration", es: "Vibración alta" },
  "dash.live.title": { en: "Live fleet telemetry", es: "Telemetría en vivo de la flota" },
  "dash.live.caption": {
    en: "Synthetic load from the Rust edge simulator · lab measurement",
    es: "Carga sintética del simulador de borde Rust · medición de laboratorio",
  },
  "dash.live.waiting": {
    en: "Live fleet telemetry · waiting for data",
    es: "Telemetría en vivo de la flota · esperando datos",
  },
  "dash.live.error": {
    en: "Live fleet telemetry is temporarily unavailable; the rest of Monitoring remains available.",
    es: "La telemetría en vivo de la flota no está disponible temporalmente; el resto de Monitoreo sigue disponible.",
  },
  "dash.live.polling": { en: "Polling backend", es: "Consultando backend" },
  "dash.live.connected": { en: "Connected", es: "Conectado" },
  "dash.live.status.keepingUp": { en: "Keeping up", es: "Al día" },
  "dash.live.status.backpressure": { en: "Backpressure", es: "Contrapresión" },
  "dash.live.status.lagging": { en: "Lagging", es: "Retrasado" },
  "dash.live.window": { en: "Window: {value} s", es: "Ventana: {value} s" },
  "dash.live.asOf": { en: "As of {value}", es: "A las {value}" },
  "dash.live.devices": { en: "devices reporting", es: "dispositivos reportando" },
  "dash.live.accepted": { en: "accepted rows/s", es: "filas aceptadas/s" },
  "dash.live.rejected": { en: "rejected rows/s", es: "filas rechazadas/s" },
  "dash.live.dropped": { en: "dropped batches", es: "lotes descartados" },
  "dash.live.p50": { en: "p50", es: "p50" },
  "dash.live.p95": { en: "p95", es: "p95" },
  "dash.live.p99": { en: "p99", es: "p99" },
  "dash.live.queue": { en: "queue / capacity", es: "cola / capacidad" },
  "dash.live.metric.pressure": { en: "Pressure", es: "Presión" },
  "dash.live.metric.temperature": { en: "Temperature", es: "Temperatura" },
  "dash.live.metric.vibration": { en: "Vibration RMS", es: "Vibración RMS" },
  "dash.live.metric.level": { en: "Oil level", es: "Nivel de aceite" },
  "wheel.fleetContext": { en: "Fleet selection", es: "Selección de flota" },
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
  "rul.suppressedNote": {
    en: "RUL is suppressed; anomaly alerts are the supported output.",
    es: "El RUL está suprimido; las alertas de anomalía son el resultado disponible.",
  },
  "rul.unproven": { en: "UNPROVEN until the bench", es: "NO PROBADO hasta completar la calibración en banco" },
  "wheel.reference": { en: "95 L reference", es: "Referencia: 95 L" },
  "demo.run": {
    en: "Run leak demo (clean → N4)",
    es: "Ejecutar demo de fuga (limpio → N4)",
  },
  "demo.reset": { en: "Reset demo", es: "Reiniciar demo" },
  "truck.restart": { en: "Restart cycle", es: "Reiniciar ciclo" },
  "dash.footnote": {
    en: "Pressure is derived from the gear-case geometry (sim/geometry.py): ≈{pressure} kPa at 95 L · geometry is an ASSUMPTION until the bench h(V) test · SYNTHETIC-PROXY · priors in sim/physics.py · see docs/thesis-annex.md",
    es: "La presión se deriva de la geometría de la caja de engranajes (sim/geometry.py): ≈{pressure} kPa a 95 L · la geometría es un SUPUESTO hasta el ensayo h(V) en banco · SUSTITUTO SINTÉTICO · priors en sim/physics.py · ver docs/thesis-annex.md",
  },
  "mine.hud.fleet": {
    en: "{trucks} trucks · {queued} queued · PLM III · synthetic proxy, field data pending",
    es: "{trucks} camiones · {queued} en cola · PLM III · sustituto sintético, datos de campo pendientes",
  },
  "mine.hud.seeded": {
    en: "Synthetic open pit · 10% ramp ASSUMPTION · reproducible geometry and fleet (seed {seed})",
    es: "Foso sintético · rampa 10 % SUPUESTO · geometría y flota reproducibles (semilla {seed})",
  },
  "mine.hud.cycle": { en: "cycle", es: "ciclo" },
  "a11y.mine.scene": {
    en: "Open-pit mine: truck {truck}, {state}, cycle {cycle}.",
    es: "Mina a cielo abierto: camión {truck}, {state}, ciclo {cycle}.",
  },
  "a11y.mine.caption": {
    en: "Synthetic proxy only. Selected truck {truck}: {state}, cycle {cycle}. The five-truck fleet state is simulated; field data is pending.",
    es: "Solo sustituto sintético. Camión seleccionado {truck}: {state}, ciclo {cycle}. El estado de la flota de cinco camiones es simulado; los datos de campo están pendientes.",
  },
  "a11y.wheel.scene": {
    en: "GDY106 wheel cutaway: oil level {oil}, mode {mode}.",
    es: "Corte de rueda GDY106: nivel de aceite {oil}, modo {mode}.",
  },
  "a11y.wheel.caption": {
    en: "Synthetic proxy only. Oil level {oil} and mode {mode} are modelled, not field measurements.",
    es: "Solo sustituto sintético. El nivel de aceite {oil} y el modo {mode} son valores modelados, no mediciones de campo.",
  },
  "mine.hud.status.recal": { en: "RECAL", es: "RECAL" },
  "mine.hud.status.moving": { en: "IN MOTION", es: "EN MOVIMIENTO" },
  "mine.hud.status.standby": { en: "STANDBY", es: "EN ESPERA" },
  "mine.hud.recalReady": {
    en: "RECAL · stopped + level + engine on",
    es: "RECAL · detenido + nivelado + motor encendido",
  },
  "mine.hud.recalGated": { en: "RECAL gated · on grade", es: "RECAL bloqueado · pendiente" },
  "mine.hud.recalStandby": { en: "RECAL standby", es: "RECAL en espera" },
  "mine.camera.pit": { en: "Pit", es: "Foso" },
  "mine.camera.hero": { en: "3/4", es: "3/4" },
  "mine.camera.cab": { en: "Cab", es: "Cabina" },
  "mine.camera.side": { en: "Side", es: "Lateral" },
  "mine.camera.wheel": { en: "Wheel", es: "Rueda" },
  "mine.camera.chase": { en: "Chase", es: "Seguimiento" },
  "mine.camera.shovel": { en: "Shovel", es: "Pala" },
  "mine.camera.crusher": { en: "Crusher", es: "Chancadora" },
  "mine.camera.ramp": { en: "Ramp", es: "Rampa" },
  "mine.camera.free": { en: "Free", es: "Libre" },
  "mine.scene.shovel": { en: "SHOVEL · 4100XPC", es: "PALA · 4100XPC" },
  "mine.scene.crusher": { en: "PRIMARY CRUSHER", es: "CHANCADORA · PRIMARIA" },
  "mine.scene.ramp": { en: "RAMP · 10% ASSUMPTION", es: "RAMPA · 10 % SUPUESTO" },
  "truck.action.resume": { en: "Resume cycle", es: "Reanudar ciclo" },
  "truck.action.pause": { en: "Pause cycle", es: "Pausar ciclo" },
  "truck.action.stepTitle": { en: "Advance the FSM clock 1 s", es: "Avanzar 1 s" },
  "truck.action.stepPausedTitle": { en: "Pause the cycle first, then step", es: "Pausa primero" },
  "truck.action.step": { en: "Step +1 s", es: "Paso +1 s" },
  "truck.action.openWheel": { en: "Open GDY106 wheel", es: "Abrir rueda GDY106" },
  "truck.section.payloadMeter": { en: "Payload Meter III", es: "Payload Meter III" },
  "truck.state.tareZone": { en: "Tare zone", es: "Zona de tara" },
  "truck.state.empty": { en: "Empty", es: "Vacío" },
  "truck.state.loading": { en: "Loading", es: "Cargando" },
  "truck.state.maneuvering": { en: "Maneuvering", es: "Maniobrando" },
  "truck.state.finalZone": { en: "Final zone", es: "Zona final" },
  "truck.state.hauling": { en: "Hauling", es: "Acarreando" },
  "truck.state.dumping": { en: "Dumping", es: "Vaciando" },
  "truck.state.afterDump": { en: "After dump", es: "Posvaciado" },
  "truck.state.estimated": {
    en: "State estimated by the synthetic PLM III state machine.",
    es: "Estado estimado por la máquina de estados PLM III sintética.",
  },
  "truck.state.matrixTitle": { en: "Red-STOP vs amber-caution matrix", es: "Matriz de detención y precaución" },
  "truck.state.matrixBody": {
    en: "red = stop now (critical fault, N4). Amber = caution, plan a window (N1-N3). Suppressed RUL = anomaly-only.",
    es: "Rojo = detener de inmediato (falla crítica, N4). Ámbar = precaución; planificar una ventana (N1-N3). RUL suprimido = solo anomalías.",
  },
  "truck.sheet.dimensionsTitle": { en: "930E-4SE dimensions & weights", es: "930E-4SE: dimensiones y pesos" },
  "truck.sheet.dimensions": {
    en: "Course envelope {length} × {width} × {height} m; body-up {bodyUp} m (the 3D model uses the brochure: {brochureLength} × {brochureWidth} × {brochureHeight} m, body-up {brochureBodyUp} m). Empty {empty} kg (F {emptyFront} / R {emptyRear}); loaded {loaded} kg (F {loadedFront} / R {loadedRear}); payload {payload} kg, {volume} m3. Max {max} T (10% {max}-{overload} T allowed, never above {overload} T).",
    es: "Envolvente del curso: {length} × {width} × {height} m; altura con tolva elevada: {bodyUp} m (el modelo 3D usa el folleto: {brochureLength} × {brochureWidth} × {brochureHeight} m, altura con tolva elevada: {brochureBodyUp} m). Vacío: {empty} kg (delantero {emptyFront} / trasero {emptyRear}); cargado: {loaded} kg (delantero {loadedFront} / trasero {loadedRear}); carga útil: {payload} kg, {volume} m³. Máximo: {max} t (10 % {max}-{overload} t permitido; nunca superar {overload} t).",
  },
  "truck.sheet.fluidsTitle": { en: "Fluids (reconciliation footnote)", es: "Fluidos (nota de conciliación)" },
  "truck.sheet.fluids": {
    en: "Fuel 5299 L (INCAEX) vs 4542 L usable (OM); hydraulic 1324/1325 L; sump QSK78 340 L vs SSDA16V160 280 L; propulsion gears 94 L each vs OM wheel gearbox 76 L (compartment definition; adopt 94 with OM note). Variants differ by compartment definition and usable vs nominal — see thesis-annex.",
    es: "Combustible: 5299 L (INCAEX) vs. 4542 L utilizables (OM); hidráulico: 1324/1325 L; cárter QSK78: 340 L vs. SSDA16V160: 280 L; engranajes de propulsión: 94 L c/u vs. 76 L de la caja de rueda OM (definición del compartimiento; se adoptan 94 L con la nota OM). Las variantes difieren por definición del compartimiento y por capacidad utilizable frente a nominal; ver thesis-annex.",
  },
  "truck.sheet.powertrainTitle": { en: "Powertrain", es: "Tren de potencia" },
  "truck.sheet.powertrain": {
    en: "QSK78 3500 HP @1900 (3429 flywheel; SSDA variant note). GTA-39 AC→DC→AC via inverters/condensers; blower 453 m3/min; cabinet PCS/PLM/AID/VHMS/IM; MT AC induction motors; retard grids 5400 short/3300 cont hp {gridSeconds} s; axle box + Hydrair II F{frontRatio}/R{rearRatio} ±{angle}deg.",
    es: "QSK78 3500 HP @1900 (3429 volante; nota variante SSDA). GTA-39 AC→DC→AC por inversores/condensadores; soplador 453 m3/min; gabinete PCS/PLM/AID/VHMS/IM; motores MT de inducción AC; rejillas 5400 corto/3300 cont hp {gridSeconds} s; caja del eje + Hydrair II del {frontRatio}/tras {rearRatio} ±{angle}°.",
  },
  "truck.sheet.brakesTitle": { en: "Brakes & cab", es: "Frenos y cabina" },
  "truck.sheet.brakes": {
    en: "Service <8 km/h all wheels; rear lock at low pressure; spring/hydraulic parking rear stopped-only; emergency auto. Cab: RSC turtle/rabbit + yellow switch, override, e-stop, hoist HOLD/FLOAT, VHMS snapshot+blue, red link, blue engine service, PLM fields. VHMS is read-only.",
    es: "Frenado de servicio <8 km/h en todas las ruedas; bloqueo trasero a baja presión; freno de estacionamiento trasero por resorte/hidráulico, solo con el camión detenido; freno de emergencia automático. Cabina: RSC tortuga/liebre + interruptor amarillo, anulación, parada de emergencia, levante HOLD/FLOAT, captura VHMS + indicador azul, enlace rojo, servicio del motor azul y campos PLM. VHMS es de solo lectura.",
  },
  "truck.notes.title": { en: "About this view", es: "Sobre esta vista" },
  "truck.notes.about": {
    en: "930E-4SE {length}×{width}×{height} m, body-up {bodyUp} m; eight-state PLM III FSM. Drag to orbit or use Pit/3/4/Cab/Side/Wheel/Shovel/Crusher/Ramp. RECAL requires stopped+level+engine-on.",
    es: "930E-4SE {length}×{width}×{height} m, tolva arriba {bodyUp} m; FSM PLM III de ocho estados. Arrastra para orbitar o elige un preajuste (Foso/3/4/Cabina/Lateral/Rueda/Pala/Chancadora/Rampa). RECAL solo detenido+nivelado+motor encendido.",
  },
  "truck.notes.calloutsTitle": { en: "Top-view callouts 1-22", es: "Vista superior 1-22" },
  "truck.callout.1": { en: "Cab + operator station", es: "Cabina + puesto del operador" },
  "truck.callout.2": { en: "Access stairs + walkway", es: "Escaleras de acceso + pasarela" },
  "truck.callout.3": { en: "Front bumper + tow points", es: "Parachoques delantero + puntos de remolque" },
  "truck.callout.4": { en: "QSK78 engine compartment", es: "Compartimiento motor QSK78" },
  "truck.callout.5": { en: "GTA-39 alternator (AC)", es: "Alternador GTA-39 (AC)" },
  "truck.callout.6": { en: "Control cabinet (PCS/PLM/AID/VHMS/IM)", es: "Gabinete de control (PCS/PLM/AID/VHMS/IM)" },
  "truck.callout.7": { en: "Inverter + condenser group", es: "Grupo inversor + condensadores" },
  "truck.callout.8": { en: "Cooling blower 453 m3/min", es: "Soplador de enfriamiento 453 m3/min" },
  "truck.callout.9": { en: "Retard grids (5400 short / 3300 cont hp)", es: "Rejillas de retardo (5400 hp en ciclo corto / 3300 hp continuos)" },
  "truck.callout.10": { en: "Fuel tank (see fluids footnote)", es: "Estanque de combustible (ver nota de fluidos)" },
  "truck.callout.11": { en: "Hydraulic tank 1324/1325 L", es: "Estanque hidráulico de 1324/1325 L" },
  "truck.callout.12": { en: "Dump body 211 m3", es: "Tolva 211 m3" },
  "truck.callout.13": { en: "Hoist cylinders (HOLD/FLOAT)", es: "Cilindros de levante (HOLD/FLOAT)" },
  "truck.callout.14": { en: "Front axle + Hydrair II suspension", es: "Eje delantero + suspensión Hydrair II" },
  "truck.callout.15": { en: "Rear axle box + GDY106 pair", es: "Caja del eje trasero + par GDY106" },
  "truck.callout.16": { en: "AC traction motors (MT)", es: "Motores de tracción AC (MT)" },
  "truck.callout.17": { en: "Wet service brakes (all wheels <8 km/h)", es: "Frenos húmedos de servicio (todas las ruedas <8 km/h)" },
  "truck.callout.18": { en: "Spring parking brake (rear, stopped-only)", es: "Freno de estacionamiento por resorte (trasero; solo con el camión detenido)" },
  "truck.callout.19": { en: "Tires + rims (hub on tapered rollers)", es: "Neumáticos + llantas (maza sobre rodamientos cónicos)" },
  "truck.callout.20": { en: "VHMS snapshot (blue) + red link", es: "Captura VHMS (azul) + enlace rojo" },
  "truck.callout.21": { en: "RSC turtle/rabbit + yellow switch", es: "RSC tortuga/liebre + interruptor amarillo" },
  "truck.callout.22": { en: "E-stop + engine service (blue) + PLM", es: "Parada de emergencia + servicio del motor (azul) + PLM" },
  "bench.field.oil": { en: "Oil fill", es: "Nivel de aceite" },
  "bench.field.oilAccessible": {
    en: "Oil fill percentage of the 95 L reference",
    es: "Porcentaje de llenado de aceite respecto de la referencia de 95 L",
  },
  "bench.field.oilValueText": { en: "{litres} L, {percent} %", es: "{litres} L, {percent} %" },
  "bench.field.viscosity": { en: "Viscosity proxy", es: "Sustituto de viscosidad" },
  "bench.field.viscosityValueText": { en: "{value}, {state}", es: "{value}, {state}" },
  "bench.action.startMove": { en: "Resting — start Move", es: "Detenido — iniciar marcha" },
  "bench.action.stopForRest": { en: "Moving — stop to Rest", es: "En marcha — detener" },
  "bench.action.cutaway": { en: "Cutaway", es: "Corte" },
  "bench.action.exploded": { en: "Exploded view", es: "Vista explotada" },
  "bench.readout.title": { en: "Oil readout", es: "Lectura de aceite" },
  "bench.readout.settling": {
    en: "Settling ≈ {milliseconds} ms · viscosity proxy {value} ({label})",
    es: "Asentamiento ≈ {milliseconds} ms · sustituto de viscosidad {value} ({label})",
  },
  "bench.readout.train": {
    en: "Planetary train: {highSpeed}:1 × {lowSpeed}:1 ≈ {overall}:1 (Komatsu manual; stage values rounded to three decimals)",
    es: "Tren planetario: {highSpeed}:1 × {lowSpeed}:1 ≈ {overall}:1 (manual Komatsu; valores de etapa redondeados a tres decimales)",
  },
  "bench.notes.train": {
    en: "Manual-validated overall ratio: {highSpeed}:1 × {lowSpeed}:1 ≈ {overall}:1 (Komatsu manual; stage values rounded to three decimals).",
    es: "Relación total validada manualmente: {highSpeed}:1 × {lowSpeed}:1 ≈ {overall}:1 (manual Komatsu; valores de etapa redondeados a tres decimales).",
  },
  "bench.readout.moving": { en: "Moving — recalibration gated", es: "En movimiento — recalibración bloqueada" },
  "bench.sensor.title": { en: "Sensor markers (no-drill + items)", es: "Sensores (instalación sin perforación · ítems)" },
  "bench.sensor.pressure.short": { en: "Pressure · T-adapter (item 56)", es: "Presión · adaptador en T (ítem 56)" },
  "bench.sensor.pressure.label": { en: "Pressure — oil drain pipe plug item 56, 6 o'clock", es: "Presión — tapón de drenaje, ítem 56, a las 6" },
  "bench.sensor.pressure.signal": { en: "10 Hz oil pressure. Primary level proxy + abrupt-drop trigger.", es: "Presión de aceite a 10 Hz. Sustituto principal del nivel + disparo por caída brusca." },
  "bench.sensor.pressure.mount": { en: "T-adapter threaded into the existing oil drain pipe plug port (item 56) at 6 o'clock. The plug is preserved (still removable for 250 h manual checks); the transducer reads gallery pressure through the T branch. No drilling. TD930E-P improvement: recessed-tube fitting removes the 120 mm protrusion strike hazard of the legacy T branch.", es: "Adaptador en T en el tapón de drenaje existente (ítem 56), a las 6. El tapón se conserva (extraíble para controles de 250 h); el transductor lee la presión por la rama en T. Sin perforar. Mejora TD930E-P: la conexión de tubo empotrado elimina el riesgo de golpe contra la protuberancia de 120 mm." },
  "bench.sensor.temperature.short": { en: "Temp · mag plug (item 41)", es: "Temp. · tapón magnético (ítem 41)" },
  "bench.sensor.temperature.label": { en: "Temperature — magnetic pipe plug item 41", es: "Temperatura — tapón magnético, ítem 41" },
  "bench.sensor.temperature.signal": { en: "10 Hz oil temperature. Viscosity/density compensation for fusion.", es: "Temperatura del aceite a 10 Hz. Compensación de viscosidad/densidad para la fusión." },
  "bench.sensor.temperature.mount": { en: "Type-K thermocouple probe fitted at the magnetic pipe plug port (item 41). Same thread, same port — debris-capture duty is kept via an external inspection note. No drilling.", es: "Sonda termopar tipo K en el tapón magnético (ítem 41). Misma rosca y puerto; la captura de partículas se conserva según una nota de inspección externa. Sin perforar." },
  "bench.sensor.vibration.short": { en: "Vibration · cover (items 39/36)", es: "Vibración · tapa (ítems 39/36)" },
  "bench.sensor.vibration.label": { en: "Vibration — sun inspection cover items 39/36", es: "Vibración — tapa de inspección del sol, ítems 39/36" },
  "bench.sensor.vibration.signal": { en: "1 kHz on edge (features/decimated for transport). Move/rest rules + settling shape.", es: "1 kHz en borde (rasgos/diezmado para transporte). Reglas de movimiento/reposo + forma de asentamiento." },
  "bench.sensor.vibration.mount": { en: "Triaxial MEMS puck bonded with epoxy to the sun inspection cover (items 39/36). Removable with heat + solvent, housing untouched. No drilling.", es: "Sensor MEMS triaxial adherido con epoxi a la tapa de inspección del sol (ítems 39/36). Se retira con calor + solvente, sin alterar la carcasa. Sin perforar." },
  "bench.sensor.current.short": { en: "Current · Hall clamp (traction cable)", es: "Corriente · pinza Hall (cable de tracción)" },
  "bench.sensor.current.label": { en: "Current — Hall clamp on traction power cable", es: "Corriente — pinza Hall en el cable de potencia de tracción" },
  "bench.sensor.current.signal": { en: "Motor current draw. Operational var: engine-on / load context for rest gating.", es: "Consumo de corriente del motor. Variable operativa: motor encendido / contexto de carga." },
  "bench.sensor.current.mount": { en: "Split-core Hall clamp snapped around the traction power cable. Fully non-invasive, no electrical splice, no housing contact. No drilling.", es: "Pinza Hall de núcleo dividido sobre el cable de potencia de tracción. Totalmente no invasiva, sin empalme eléctrico ni contacto con la carcasa. Sin perforar." },
  "bench.chain.title": { en: "GDY106 Fig.95 chain (GEK-91680A)", es: "Cadena GDY106 Fig.95 (GEK-91680A)" },
  "bench.chain.1": { en: "Alternator AC traction motor", es: "Motor de tracción AC (alternador)" },
  "bench.chain.2": { en: "Drive shaft", es: "Eje de transmisión" },
  "bench.chain.3": { en: "High-speed carrier", es: "Portador de alta velocidad" },
  "bench.chain.4": { en: "Sun pinion GE1288", es: "Piñón solar GE1288" },
  "bench.chain.5": { en: "Low-speed carrier + planetaries", es: "Portador de baja + planetarios" },
  "bench.chain.6": { en: "Torque tube", es: "Tubo de torsión" },
  "bench.chain.7": { en: "Wheel hub on inboard/outboard tapered roller bearings", es: "Maza sobre rodamientos cónicos interiores/exteriores" },
  "bench.chain.8": { en: "Tires", es: "Neumáticos" },
  "bench.chain.9": { en: "Wet service brakes + spring-applied parking brake", es: "Frenos húmedos + freno de estacionamiento por resorte" },
  "bench.narrative.oilDuct": { en: "Modified-cover oil transfer duct: low-gear splash throws oil into the outer cavity, it runs inside the sun inspection cover (items 39/36), passes through the sun pinion interior, then reaches the retainer/inner washer. Align the arrow-to-pin marks on assembly.", es: "Ducto de transferencia en tapa modificada: el chapoteo del engranaje bajo lanza aceite a la cavidad exterior, corre por dentro de la tapa del sol (ítems 39/36), pasa por el interior del piñón solar y llega al retén/arandela interior. Alinear las marcas de flecha y pasador durante el montaje." },
  "bench.narrative.noDrill": { en: "All four sensing points mount without drilling the GDY106 housing: the pressure transducer rides a T-adapter that preserves the drain plug, the thermocouple replaces the magnetic plug in its own thread, the vibration MEMS sits on an epoxy base on the sun-pinion cover, and the Hall clamp is non-invasive on the cable. The bench rig reproduces these exact mount points so calibration (bench drain-and-weigh) transfers to the field without housing modifications.", es: "Los cuatro puntos miden sin perforar la carcasa GDY106: el transductor de presión usa un adaptador en T que conserva el tapón de drenaje, el termopar reemplaza el tapón magnético en su propia rosca, el MEMS de vibración va en una base epoxi sobre la tapa del sol y la pinza Hall se instala sin contacto invasivo en el cable. El banco reproduce estos puntos exactos para que la calibración (drenaje y pesaje en banco) pueda transferirse al campo sin modificar la carcasa." },
  "bench.notes.title": { en: "About this view", es: "Sobre esta vista" },
  "bench.notes.about": { en: "GDY106 Fig.95 GEK-91680A chain — AC motor → shaft → high-speed carrier → sun pinion GE1288 → low-speed carrier/planetaries → torque tube → hub on tapered rollers → tires; wet brakes + spring parking brake. Drag to orbit, click a marker (items 56/41/39-36/cable). Stop the rig and watch settling into the recalibration window. See docs/inspection.md (Steps 1-11).", es: "Cadena GDY106 Fig.95 GEK-91680A — motor AC → eje → portador de alta → piñón solar GE1288 → portador de baja/planetarios → tubo de torsión → maza sobre rodamientos cónicos → neumáticos; frenos húmedos + estacionamiento por resorte. Arrastra para orbitar y haz clic en un marcador (ítems 56/41/39-36/cable). Detén el banco y observa el asentamiento antes de la ventana de recalibración. Ver docs/inspection.md (pasos 1-11)." },
  "bench.inspection.title": { en: "Inspection Steps 1-11", es: "Inspección: pasos 1-11" },
  "bench.inspection.stepLabel": { en: "Step {number}:", es: "Paso {number}:" },
  "bench.inspection.step.1": { en: "Park level, 20 min settle, engine off; confirm OM decal level rule.", es: "Estacionar nivelado, dejar asentar 20 min, motor apagado; confirmar la regla de nivel de la calcomanía OM." },
  "bench.inspection.step.2": { en: "Drain-plug port item 56 at 6 o'clock: fit new 12 in hose each time, sample every 250 h.", es: "Puerto de drenaje, ítem 56, a las 6: usar una manguera nueva de 12 pulg cada vez y tomar una muestra cada 250 h." },
  "bench.inspection.step.3": { en: "Magnetic plug item 41: classify Normal (soft ring paste) / Flaky (bearing-cup laminar) / Pasty (chunk disintegration = last warning).", es: "Tapón magnético, ítem 41: clasificar como normal (pasta anular blanda), escamoso (laminar de taza) o pastoso (desintegración en fragmentos = última advertencia)." },
  "bench.inspection.step.4": { en: "Plug map 1-8 + planetaries 1-4: record position of every chip.", es: "Mapa de tapones 1-8 + planetarios 1-4: registrar la posición de cada partícula." },
  "bench.inspection.step.5": { en: "Washer N/P 1489: nominal 0.869 in, condemn at <= 0.824 in.", es: "Arandela N/P 1489: nominal 0.869 pulg, condenar si <= 0.824 pulg." },
  "bench.inspection.step.6": { en: "Inner washer GE1309: nominal 0.558 in, replace at <= 0.513 in.", es: "Arandela interior GE1309: nominal 0.558 pulg, reemplazar si <= 0.513 pulg." },
  "bench.inspection.step.7": { en: "Final axial play 0.100-0.125 in; grooves-visible rule holds.", es: "Juego axial final 0.100-0.125 pulg; aplica la regla de surcos visibles." },
  "bench.inspection.step.8": { en: "Level correct if oil visible at port + 20 min level-ground rule.", es: "Nivel correcto si hay aceite visible + regla de 20 min en terreno nivelado." },
  "bench.inspection.step.9": { en: "ISO 4406 target 18/13 (>5 um 130k-250k / >15 um 4k-8k per 100 ml); micro-filter oil above 50 C until 18/13.", es: "Meta ISO 4406 18/13 (>5 µm: 130k-250k / >15 µm: 4k-8k por 100 ml); microfiltrar el aceite a más de 50 °C hasta alcanzar 18/13." },
  "bench.inspection.step.10": { en: "Spectrometry limits: Fe 200/233, Cu 24/35, Cr 3/3, Ni 3/3, Ca 30/50+P check, Zn 40/50, P-hyd 200/250; watch rate-of-change. Cu = cage/axial wear, Cr = platinated-flake bearings, Ca+P = hydraulic crossover.", es: "Límites de espectrometría: Fe 200/233, Cu 24/35, Cr 3/3, Ni 3/3, Ca 30/50 + revisión de P, Zn 40/50, P-hid 200/250; vigilar la tasa de cambio. Cu = desgaste de jaula/axial, Cr = rodamientos con escamas platinadas, Ca+P = cruce hidráulico." },
  "bench.inspection.step.11": { en: "Commissioning samples 20/50/100/250/500/750/1000 h; missing windows affects warranty.", es: "Muestras de puesta en marcha a las 20/50/100/250/500/750/1000 h; omitir ventanas afecta la garantía." },
  "bench.environment.note": { en: "120 °C / EMI note (documented, not built): wheel-motor environment reaches ~120 °C with strong EMI from the traction drive. Field sensors need high-temp rating + shielded cabling. The bench scene does not simulate heat or EMI.", es: "Nota 120 °C / EMI (documentada, no construida): el entorno del motor de rueda alcanza ~120 °C con EMI fuerte del accionamiento de tracción. Los sensores de campo requieren rango de alta temperatura + cableado blindado. El banco no simula calor ni EMI." },
  "bench.viscosity.dilute": { en: "dilute · fast settling", es: "diluido · asentamiento rápido" },
  "bench.viscosity.nominal": { en: "nominal", es: "nominal" },
  "bench.viscosity.degraded": { en: "degraded · slow settling", es: "degradado · asentamiento lento" },
  "bench.viscosity.state.dilute": { en: "dilute", es: "diluido" },
  "bench.viscosity.state.nominal": { en: "nominal", es: "nominal" },
  "bench.viscosity.state.degraded": { en: "degraded", es: "degradado" },
  "dash.demo.labNote": {
    en: "LAB-ACCELERATED leak ~{leakRate} %/h x{rateMultiplier} vs spec {specRate} %/h (~{lossLiters} L over {durationSeconds} s)",
    es: "Fuga LAB-ACELERADA ~{leakRate} %/h x{rateMultiplier} vs espec {specRate} %/h (~{lossLiters} L en {durationSeconds} s)",
  },
  "dash.demo.rul.cleanNote": {
    en: "RUL suppressed: no leak trend (slope >= 0); anomaly-only. Clean baseline holds 95 L.",
    es: "RUL suprimido: no hay tendencia de fuga (pendiente >= 0); solo anomalías. La línea base limpia se mantiene en 95 L.",
  },
  "dash.demo.rul.slowNote": {
    en: "model={model} ({qualifier}). {labNote}.",
    es: "modelo={model} ({qualifier}). {labNote}.",
  },
  "dash.demo.rul.abruptNote": {
    en: "model={model} ({qualifier}). Abrupt step: linear RUL invalid, N4 fires instead.",
    es: "modelo={model} ({qualifier}). Caída brusca: el RUL lineal no es válido; se activa N4.",
  },
  "dash.demo.blurb.idle": { en: "Demo idle.", es: "Demo inactiva." },
  "dash.demo.blurb.clean": { en: "Baseline: 95 L, no alerts. RUL suppressed (no leak trend).", es: "Base: 95 L, sin alertas. RUL suprimido (sin tendencia)." },
  "dash.demo.blurb.slowLeak": { en: "Slow leak ({labNote}). N1 -> N2 -> N3 walk.", es: "Fuga lenta ({labNote}). Recorrido N1 → N2 → N3." },
  "dash.demo.blurb.abruptDrop": { en: "Abrupt 15 L step. N4 critical fires; linear RUL invalid.", es: "Caída brusca de 15 L. Se activa N4 crítico; el RUL lineal no es válido." },
  "dash.demo.blurb.done": { en: "Walk complete: N1 -> N2 -> N3 -> N4. Reset to run again.", es: "Recorrido completo: N1 → N2 → N3 → N4. Reinicia para repetir." },
  "dash.demo.stage.idle": { en: "Idle", es: "Inactivo" },
  "dash.demo.stage.clean": { en: "Baseline", es: "Línea base" },
  "dash.demo.stage.slowLeak": { en: "Slow leak", es: "Fuga lenta" },
  "dash.demo.stage.abruptDrop": { en: "Abrupt drop", es: "Caída brusca" },
  "dash.demo.stage.done": { en: "Complete", es: "Completo" },
  "dash.source.badge.loading": { en: "CONNECTING…", es: "CONECTANDO…" },
  "dash.source.badge.live": { en: "LIVE · backend", es: "EN VIVO · backend" },
  "dash.source.badge.demo": { en: "DEMO · local fallback", es: "DEMO · local" },
  "dash.action.refresh": { en: "Refresh from backend", es: "Actualizar desde backend" },
  "dash.demo.oil": { en: "oil", es: "aceite" },
  "dash.demo.benchLink": { en: "also driving the Bench 3D fill", es: "también mueve el nivel del banco 3D" },
  "dash.chart.title": { en: "Oil level + confidence", es: "Nivel de aceite + confianza" },
  "dash.chart.restWindows": { en: "green bands = rest windows", es: "bandas verdes = ventanas de reposo" },
  "dash.demo.fill": { en: "Demo fill {value}", es: "Demo {value}" },
  "dash.source.label": { en: "source", es: "origen" },
  "dash.backend.noPayload": { en: "no backend payload yet", es: "sin datos del backend" },
  "dash.backend.summary": { en: "rows this session={rows} · {influx}", es: "filas en esta sesión={rows} · {influx}" },
  "dash.backend.error": { en: "backend unreachable ({url}): {message}", es: "backend no disponible ({url}): {message}" },
  "dash.mode.title": { en: "Mode ·", es: "Modo ·" },
  "dash.mode.recalibrating": { en: "· RECALIBRATING", es: "· RECALIBRANDO" },
  "dash.mode.recalGated": { en: "· recal gated", es: "· recal bloqueado" },
  "dash.fsm.sharedClock": { en: "shared clock with the Truck sim", es: "reloj compartido con el camión" },
  "dash.backend.windows": { en: "backend windows: {count} (rows this session={rows})", es: "ventanas del backend: {count} (filas en esta sesión={rows})" },
  "dash.backend.localWindows": { en: "backend down — windows from local DEMO set", es: "backend caído — ventanas del conjunto DEMO local" },
  "dash.alerts.title": { en: "Alerts timeline", es: "Alertas N1–N4" },
  "dash.alerts.none": { en: "no alerts", es: "sin alertas" },
  "dash.alerts.empty": { en: "(no alerts — clean baseline; RUL stays suppressed anomaly-only)", es: "(sin alertas — línea base limpia; RUL suprimido, solo anomalías)" },
  "dash.chart.empty": { en: "No level samples yet — ingest rows or run the demo.", es: "Sin muestras de nivel — ingiere filas o ejecuta la demo." },
  "dash.chart.label": { en: "Oil level with confidence band", es: "Nivel de aceite con banda de confianza" },
  "dash.chart.warning": { en: "warn 50% ({liters} L)", es: "advertencia 50% ({liters} L)" },
  "dash.chart.critical": { en: "critical 30% ({liters} L)", es: "crítico 30% ({liters} L)" },
  "dash.intro": {
    en: "Fused level + confidence, rest windows, N1–N4 ladder, RUL, and the sim-linked mode indicator. Model {model}.",
    es: "Nivel fusionado + confianza, ventanas de reposo, escalera N1–N4, RUL e indicador de modo. Modelo {model}.",
  },
  "rul.panel.warningIn": { en: "warn in {hours} h", es: "advertencia en {hours} h" },
  "rul.panel.haulCycles": { en: "{cycles} haul cycles (29 s)", es: "{cycles} ciclos (29 s)" },
  "rul.panel.shifts": { en: "{shifts} shifts (8 h)", es: "{shifts} turnos (8 h)" },
  "rul.panel.confidenceValue": { en: "confidence {confidence}", es: "confianza {confidence}" },
  "rul.model.syntheticProxy": { en: "synthetic-proxy", es: "sustituto sintético" },
  "rul.panel.hoursToCritical": { en: "{hours} h to critical", es: "{hours} h hasta crítico" },
  "rul.panel.horizon.critical": { en: "Critical horizon within shift", es: "Horizonte crítico dentro del turno" },
  "rul.panel.horizon.warning": { en: "Warning horizon within shift", es: "Horizonte de advertencia dentro del turno" },
  "rul.panel.horizon.beyond": { en: "Beyond shift horizon", es: "Fuera del horizonte del turno" },
  "rul.panel.suppressedDetail": {
    en: "Model={model} ({qualifier}) · surface N1/N2/N4 anomaly alerts instead of a countdown.",
    es: "Modelo={model} ({qualifier}) · mostrar alertas de anomalía N1/N2/N4 en lugar de una cuenta regresiva.",
  },
  "rul.panel.summary": {
    en: "slope {slope} L/h · R² {r2} · level {level} L · model={model} ({qualifier})",
    es: "pendiente {slope} L/h · R² {r2} · nivel {level} L · modelo={model} ({qualifier})",
  },
} as const;

export type DictKey = keyof typeof dict;

/** Todas las claves del diccionario (para verificar cobertura EN/ES en tests). */
export function dictKeys(): DictKey[] {
  return Object.keys(dict) as DictKey[];
}

export type DictParams = Readonly<Record<string, string | number>>;

function formatCopy(copy: string, params?: DictParams): string {
  if (!params) return copy;
  return copy.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder,
  );
}

/** Busca una clave y reemplaza parámetros escalares, con respaldo en inglés. */
export function t(key: DictKey, lang: Lang, params?: DictParams): string {
  const copy = dict[key][lang] ?? dict[key].en;
  return formatCopy(copy, params);
}
