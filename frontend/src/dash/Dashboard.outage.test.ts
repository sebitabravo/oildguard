import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { isBackendOutage } from "./analyzerAvailability";
import { isReadingStale, resolveReadingStale } from "./readingFreshness";
import Dashboard, { BackendOutageBanner, DashboardStatusNotices } from "./Dashboard";
import { t } from "../i18n";

// Representa la caída total del backend en la rueda en vivo: ninguna
// respuesta llegó (el catch de Dashboard deja backendNote en "error").
// Solo español (S05): el aviso siempre sale en español, sin idioma por localStorage.
function renderOutageBanner(): string {
  return renderToString(h(BackendOutageBanner, {}));
}

describe("backend outage banner state", () => {
  test("reports an outage only for the live wheel with a failed backend", () => {
    expect(isBackendOutage(true, "error")).toBe(true);
    expect(isBackendOutage(true, "live")).toBe(false);
    expect(isBackendOutage(true, null)).toBe(false);
    expect(isBackendOutage(true, undefined)).toBe(false);
    expect(isBackendOutage(false, "error")).toBe(false);
  });
});

describe("backend outage banner output", () => {
  test("renders the alert banner in Spanish, never the calm message", () => {
    const html = renderOutageBanner();
    expect(html.includes('role="alert"')).toBe(true);
    expect(html.includes("Backend no disponible · mostrando solo datos DEMO locales")).toBe(true);
    expect(html.includes("La telemetría en vivo, las alertas y el RUL no están disponibles. No confundas esta vista con una flota sana.")).toBe(true);
    expect(html.includes(t("wheel.banner.none"))).toBe(false);
  });
});

describe("backend outage banner layout", () => {
  // El flex de Notice parte cada hijo directo en columnas: a 390px el título
  // quedaba en una columna lateral con saltos de una palabra. Un único hijo
  // coherente deja que título y detalle envuelvan como un aviso natural.
  test("keeps title and detail in a single coherent content node", () => {
    const html = renderOutageBanner();
    const noticeInner = html.match(/og-notice--error[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "";
    expect(noticeInner.includes("<span>")).toBe(true);
    const spanInner = noticeInner.match(/<span>([\s\S]*?)<\/span>/)?.[1] ?? "";
    expect(spanInner.includes("<strong>")).toBe(true);
    expect(spanInner.includes(t("dash.backend.outage.title"))).toBe(true);
    expect(spanInner.includes(t("dash.backend.outage.detail"))).toBe(true);
    const outsideSpan = noticeInner.replace(/<span>[\s\S]*?<\/span>/, "");
    expect(outsideSpan.includes(t("dash.backend.outage.detail"))).toBe(false);
  });
});

// Representa el tramo de avisos tal como lo pinta Dashboard en producción:
// el mismo componente, sin sonda ni backend. Si se elimina el aviso de apagón
// o se restaura el mensaje de calma durante el apagón, estos casos fallan.
function renderStatusNotices(backendOutage: boolean, readingStale = false): string {
  return renderToString(h(DashboardStatusNotices, { activeLevel: null, backendOutage, analyzerNotice: null, readingStale }));
}

describe("dashboard outage status path", () => {
  test("outage without active alert shows the prominent banner and no calm message", () => {
    const html = renderStatusNotices(true);
    expect(html.includes('role="alert"')).toBe(true);
    expect(html.includes(t("dash.backend.outage.title"))).toBe(true);
    expect(html.includes(t("dash.backend.outage.detail"))).toBe(true);
    expect(html.includes(t("wheel.banner.none"))).toBe(false);
  });

  test("healthy state without escalation keeps the calm notice and no outage banner", () => {
    const html = renderStatusNotices(false);
    expect(html.includes(t("wheel.banner.none"))).toBe(true);
    expect(html.includes(t("dash.backend.outage.title"))).toBe(false);
  });
});

// A02: la marca temporal real del backend (level.data.t_iso) decide la
// frescura; el `stale: false` constante ya no puede ocultar una lectura
// vieja. Reloj fijo: sin pruebas frágiles contra el reloj mural.
const STALE_NOW = Date.parse("2026-10-10T12:00:00.000Z");
// Misma edad que la rueda "stale" del dataset DEMO (-180 s) y la fresca (-8 s).
const AGED_READING_MS = STALE_NOW - 180_000;
const FRESH_READING_MS = STALE_NOW - 8_000;

// Costura conductual A02 por la vía productiva real: la prueba entrega la
// marca envejecida + el ahora inyectado sin precalcular ningún booleano; el
// propio `DashboardStatusNotices` resuelve con `resolveReadingStale`. Si el
// cableado de producción volviera al `stale: false` previo a A02, este caso
// falla (aparece la calma y falta el aviso obsoleto).
function renderStatusNoticesFromReading(
  backendOutage: boolean,
  reading: { live: boolean; demoActive: boolean; lastUpdateMs: number | null; nowMs: number },
): string {
  return renderToString(h(DashboardStatusNotices, {
    activeLevel: null,
    backendOutage,
    analyzerNotice: null,
    live: reading.live,
    demoActive: reading.demoActive,
    lastUpdateMs: reading.lastUpdateMs,
    nowMs: reading.nowMs,
  }));
}

describe("dashboard stale production seam (timestamp in, notice out)", () => {
  test("aged live timestamp resolves stale inside the component: stale box, no calm", () => {
    const html = renderStatusNoticesFromReading(false, {
      live: true,
      demoActive: false,
      lastUpdateMs: AGED_READING_MS,
      nowMs: STALE_NOW,
    });
    expect(html.includes('role="status"')).toBe(true);
    expect(html.includes(t("dash.reading.stale.title"))).toBe(true);
    expect(html.includes(t("dash.reading.stale.detail"))).toBe(true);
    expect(html.includes(t("wheel.banner.none"))).toBe(false);
  });

  test("fresh live timestamp resolves fresh inside the component: calm, no stale", () => {
    const html = renderStatusNoticesFromReading(false, {
      live: true,
      demoActive: false,
      lastUpdateMs: FRESH_READING_MS,
      nowMs: STALE_NOW,
    });
    expect(html.includes(t("wheel.banner.none"))).toBe(true);
    expect(html.includes(t("dash.reading.stale.title"))).toBe(false);
    expect(html.includes('role="status"')).toBe(false);
  });

  test("outage keeps precedence through the seam: alert banner, stale suppressed", () => {
    const html = renderStatusNoticesFromReading(true, {
      live: true,
      demoActive: false,
      lastUpdateMs: AGED_READING_MS,
      nowMs: STALE_NOW,
    });
    expect(html.includes('role="alert"')).toBe(true);
    expect(html.includes(t("dash.backend.outage.title"))).toBe(true);
    expect(html.includes(t("dash.reading.stale.title"))).toBe(false);
    expect(html.includes(t("wheel.banner.none"))).toBe(false);
  });
});

describe("dashboard stale reading status path", () => {
  test("aged live timestamp renders the stale notice and no calm message", () => {
    const derived = resolveReadingStale({
      live: true,
      demoActive: false,
      lastUpdateMs: AGED_READING_MS,
      nowMs: STALE_NOW,
    });
    expect(derived).toBe(true);
    const html = renderStatusNotices(false, derived);
    expect(html.includes('role="status"')).toBe(true);
    expect(html.includes(t("dash.reading.stale.title"))).toBe(true);
    expect(html.includes(t("dash.reading.stale.detail"))).toBe(true);
    expect(html.includes(t("wheel.banner.none"))).toBe(false);
  });

  test("fresh live timestamp keeps the calm notice and no stale banner", () => {
    const derived = resolveReadingStale({
      live: true,
      demoActive: false,
      lastUpdateMs: FRESH_READING_MS,
      nowMs: STALE_NOW,
    });
    expect(derived).toBe(false);
    const html = renderStatusNotices(false, derived);
    expect(html.includes(t("wheel.banner.none"))).toBe(true);
    expect(html.includes(t("dash.reading.stale.title"))).toBe(false);
    expect(html.includes('role="status"')).toBe(false);
  });

  test("negative: forcing the pre-A02 constant-false path hides the stale state", () => {
    // La misma marca envejecida sí es obsoleta según el resolutor; si la
    // ruta de producción volviera al `stale: false` anterior, ningún aviso
    // aparecería y el mensaje de calma tranquilizaría con datos viejos.
    expect(isReadingStale(AGED_READING_MS, STALE_NOW)).toBe(true);
    const html = renderStatusNotices(false, false);
    expect(html.includes(t("dash.reading.stale.title"))).toBe(false);
    expect(html.includes(t("wheel.banner.none"))).toBe(true);
  });

  test("outage keeps its own banner without duplicating the stale notice", () => {
    const html = renderStatusNotices(true, true);
    expect(html.includes('role="alert"')).toBe(true);
    expect(html.includes(t("dash.backend.outage.title"))).toBe(true);
    expect(html.includes(t("dash.reading.stale.title"))).toBe(false);
    expect(html.includes(t("wheel.banner.none"))).toBe(false);
  });
});

describe("stale notice layout", () => {
  // Igual que el aviso de apagón: un único hijo coherente para que título y
  // detalle envuelvan como un aviso natural a 390px.
  test("keeps title and detail in a single coherent content node", () => {
    const html = renderStatusNotices(false, true);
    const noticeInner = html.match(/og-notice--stale[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "";
    expect(noticeInner.includes("<span>")).toBe(true);
    const spanInner = noticeInner.match(/<span>([\s\S]*?)<\/span>/)?.[1] ?? "";
    expect(spanInner.includes("<strong>")).toBe(true);
    expect(spanInner.includes(t("dash.reading.stale.title"))).toBe(true);
    expect(spanInner.includes(t("dash.reading.stale.detail"))).toBe(true);
    const outsideSpan = noticeInner.replace(/<span>[\s\S]*?<\/span>/, "");
    expect(outsideSpan.includes(t("dash.reading.stale.detail"))).toBe(false);
  });

  // Una sola caja ámbar coherente: la vía obsoleta no usa el envoltorio rojo
  // de apagón (`og-analyzer-notice`), así no se anidan dos bordes ni la
  // lectura vieja comparte carril de error; el `role="status"` vive en un
  // `div` neutro sin clases y la única caja visible es el Notice `stale`.
  test("renders one stale box with status semantics, never nested in the outage lane", () => {
    const html = renderStatusNoticesFromReading(false, {
      live: true,
      demoActive: false,
      lastUpdateMs: AGED_READING_MS,
      nowMs: STALE_NOW,
    });
    expect(html.includes('role="status"')).toBe(true);
    expect(html.includes("og-notice--stale")).toBe(true);
    expect(html.includes("og-analyzer-notice")).toBe(false);
    const staleCount = html.split("og-notice--stale").length - 1;
    expect(staleCount).toBe(1);
  });
});

describe("dashboard numeric provenance path", () => {
  test("the local wheel render does not expose bare demo confidence", () => {
    const html = renderToString(h(Dashboard, { wheelId: "wheel-LH-01" }));
    expect(html.includes('data-field="confidence"')).toBe(true);
    expect(html.includes(t("fleet.source.demo"))).toBe(true);
    expect(html.includes("0.908")).toBe(false);
  });
});
