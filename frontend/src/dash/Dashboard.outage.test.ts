import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { isBackendOutage } from "./analyzerAvailability";
import { BackendOutageBanner, DashboardStatusNotices } from "./Dashboard";
import { t, type Lang } from "../i18n";

// Representa la caída total del backend en la rueda en vivo: ninguna
// respuesta llegó (el catch de Dashboard deja backendNote en "error").
function renderOutageBanner(lang: Lang): string {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => lang },
  });
  try {
    return renderToString(h(BackendOutageBanner, {}));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
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
  test("renders an unmistakable alert banner in English, never the calm message", () => {
    const html = renderOutageBanner("en");
    expect(html.includes('role="alert"')).toBe(true);
    expect(html.includes("Backend unreachable · showing local DEMO data only")).toBe(true);
    expect(html.includes("Live telemetry, alerts and RUL are unavailable. Do not mistake this view for a healthy fleet.")).toBe(true);
    expect(html.includes(t("wheel.banner.none", "en"))).toBe(false);
  });

  test("renders the same alert banner localized in Spanish, never the calm message", () => {
    const html = renderOutageBanner("es");
    expect(html.includes('role="alert"')).toBe(true);
    expect(html.includes("Backend no disponible · mostrando solo datos DEMO locales")).toBe(true);
    expect(html.includes("La telemetría en vivo, las alertas y el RUL no están disponibles. No confundas esta vista con una flota sana.")).toBe(true);
    expect(html.includes(t("wheel.banner.none", "es"))).toBe(false);
  });
});

describe("backend outage banner layout", () => {
  // El flex de Notice parte cada hijo directo en columnas: a 390px el título
  // quedaba en una columna lateral con saltos de una palabra. Un único hijo
  // coherente deja que título y detalle envuelvan como un aviso natural.
  test("keeps title and detail in a single coherent content node", () => {
    for (const lang of ["en", "es"] as const) {
      const html = renderOutageBanner(lang);
      const noticeInner = html.match(/og-notice--error[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "";
      expect(noticeInner.includes("<span>")).toBe(true);
      const spanInner = noticeInner.match(/<span>([\s\S]*?)<\/span>/)?.[1] ?? "";
      expect(spanInner.includes("<strong>")).toBe(true);
      expect(spanInner.includes(t("dash.backend.outage.title", lang))).toBe(true);
      expect(spanInner.includes(t("dash.backend.outage.detail", lang))).toBe(true);
      const outsideSpan = noticeInner.replace(/<span>[\s\S]*?<\/span>/, "");
      expect(outsideSpan.includes(t("dash.backend.outage.detail", lang))).toBe(false);
    }
  });
});

// Representa el tramo de avisos tal como lo pinta Dashboard en producción:
// el mismo componente, sin sonda ni backend. Si se elimina el aviso de apagón
// o se restaura el mensaje de calma durante el apagón, estos casos fallan.
function renderStatusNotices(lang: Lang, backendOutage: boolean): string {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => lang },
  });
  try {
    return renderToString(h(DashboardStatusNotices, { activeLevel: null, backendOutage, analyzerNotice: null }));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

describe("dashboard outage status path", () => {
  test("outage without active alert shows the prominent banner and no calm message", () => {
    for (const lang of ["en", "es"] as const) {
      const html = renderStatusNotices(lang, true);
      expect(html.includes('role="alert"')).toBe(true);
      expect(html.includes(t("dash.backend.outage.title", lang))).toBe(true);
      expect(html.includes(t("dash.backend.outage.detail", lang))).toBe(true);
      expect(html.includes(t("wheel.banner.none", lang))).toBe(false);
    }
  });

  test("healthy state without escalation keeps the calm notice and no outage banner", () => {
    for (const lang of ["en", "es"] as const) {
      const html = renderStatusNotices(lang, false);
      expect(html.includes(t("wheel.banner.none", lang))).toBe(true);
      expect(html.includes(t("dash.backend.outage.title", lang))).toBe(false);
    }
  });
});
