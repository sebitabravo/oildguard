import { describe, expect, test } from "bun:test";
import messageCodes from "../../../shared/message_codes.json";
import { dict } from "../i18n";
import { formatNumber } from "../i18n/numberFormat";
import { localizeBackendZone } from "./backendNotes";
import * as backendNotes from "./backendNotes";
import { demoAlertsUpTo } from "./demoData";

const localizeBackendMessage = (
  backendNotes as unknown as {
    localizeBackendMessage?: (
      message: { code: string; params: Record<string, unknown> } | undefined,
      fallback: string,
    ) => string;
  }
).localizeBackendMessage;

type MessageCode = keyof typeof messageCodes;

function exampleParams(code: MessageCode): Record<string, unknown> {
  return Object.fromEntries(
    messageCodes[code].map((name) => [
      name,
      name === "zone" ? "DUMP" : name === "windows" ? [0, 1] : 1.25,
    ]),
  );
}

function placeholders(copy: string): string[] {
  return [...new Set(Array.from(copy.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g), (match) => match[1]))].sort();
}

describe("structured backend messages", () => {
  test("the shared catalog has Spanish entries with exactly the declared placeholders", () => {
    const translations = dict as Record<string, string>;

    for (const code of Object.keys(messageCodes) as MessageCode[]) {
      const translation = translations[code];
      expect(translation !== undefined).toBe(true);
      if (!translation) continue;
      const expected = [...messageCodes[code]].sort();
      expect(placeholders(translation)).toEqual(expected);
    }
  });

  test("every catalog message renders without unresolved placeholders", () => {
    expect(typeof localizeBackendMessage).toBe("function");
    if (!localizeBackendMessage) return;

    for (const code of Object.keys(messageCodes) as MessageCode[]) {
      const params = exampleParams(code);
      const message = { code, params };

      const copy = localizeBackendMessage(message, `legacy ${code}`);
      expect(/\{[A-Za-z][A-Za-z0-9_]*\}/.test(copy)).toBe(false);
    }
  });

  test("formats backend numbers in Spanish and uses localized PLM zone labels", () => {
    expect(typeof localizeBackendMessage).toBe("function");
    if (!localizeBackendMessage) return;

    const abruptDrop = {
      code: "ladder_n4_abrupt_drop",
      params: { from_l: 94.7, to_l: 88.6, threshold_l: 5 },
    };
    expect(localizeBackendMessage(abruptDrop, "legacy text"))
      .toBe("N4 crítico: caída abrupta entre ventanas, de 94,7 L a 88,6 L (más de 5 L).");

    const zones = [
      ["LOAD", "Cargando"],
      ["HAUL", "Acarreando"],
      ["DUMP", "Vaciando"],
      ["WAIT", "Posvaciado"],
    ] as const;
    for (const [zone, spanish] of zones) {
      expect(localizeBackendZone(zone)).toBe(spanish);
      const message = { code: "ladder_n1_trend_persistence", params: { window: 2, zone } };
      expect(localizeBackendMessage(message, "legacy text"))
        .toBe(`N1 tendencia (entrada por persistencia): evidencia en la ventana 2, zona ${spanish}.`);
    }
    expect(localizeBackendZone("UNKNOWN")).toBe("UNKNOWN");
  });

  test("rounds only the RUL no-leak-trend slope to two decimal places", () => {
    expect(typeof localizeBackendMessage).toBe("function");
    if (!localizeBackendMessage) return;

    const slope = 1.4902624063443084;
    const message = {
      code: "rul_no_leak_trend",
      params: { slope_l_per_h: slope },
    };
    const spanish = localizeBackendMessage(message, "legacy text");

    expect(spanish).toBe(
      `Sin tendencia de fuga: la pendiente es ${formatNumber(slope, 2)} L/h (no es menor que cero); solo se emiten anomalías.`,
    );
    expect(spanish.includes(formatNumber(slope, 6))).toBe(false);
  });

  test("known codes select translations while unknown codes preserve the legacy field exactly", () => {
    expect(typeof localizeBackendMessage).toBe("function");
    if (!localizeBackendMessage) return;

    const known = { code: "source_memory_store", params: {} };
    expect(localizeBackendMessage(known, "memory store (InfluxDB when reachable)"))
      .toBe("almacenamiento en memoria de esta sesión (InfluxDB cuando esté disponible)");

    const legacy = "Backend extension note: preserve exact casing, punctuation, and spacing!";
    expect(localizeBackendMessage({ code: "future_backend_code", params: {} }, legacy))
      .toBe(legacy);
    expect(localizeBackendMessage(undefined, "default (no rows ingested yet)"))
      .toBe("predeterminado (aún no se han ingerido filas)");
  });

  test("local leak-demo alerts use the shared structured ladder messages", () => {
    expect(typeof localizeBackendMessage).toBe("function");
    if (!localizeBackendMessage) return;

    const alerts = demoAlertsUpTo("abrupt-drop");
    expect(alerts.map((alert) => alert.reason_message?.code)).toEqual([
      "ladder_n1_trend_persistence",
      "ladder_n2_same_window_confirmation",
      "ladder_n3_shift_window",
      "ladder_n4_abrupt_drop",
    ]);
    expect(alerts.map((alert) => alert.reason_message?.params)).toEqual([
      { window: 2, zone: "DUMP" },
      { votes: 2, window: 2 },
      { warning_hours: 0.35, shift_hours: 8.0 },
      { from_l: 95.0, to_l: 80.0, threshold_l: 5.0 },
    ]);
    expect(alerts.map((alert) => alert.reason)).toEqual([
      "N1 trend (persistence entry)",
      "N2 confirmed leak: 2-of-3 channels same window 2",
      "N3 shift-window: RUL-to-warning 0.35 h < 8.0 h shift",
      "N4 critical: abrupt window-to-window drop 95.0->80.0 L (>5.0 L)",
    ]);

    expect(alerts.map((alert) => localizeBackendMessage(alert.reason_message, alert.reason))).toEqual([
      "N1 tendencia (entrada por persistencia): evidencia en la ventana 2, zona Vaciando.",
      "N2 fuga confirmada: 2 de 3 canales coincidieron en la ventana 2.",
      "N3 ventana de turno: faltan 0,35 h para la advertencia, menos que el turno de mantenimiento de 8 h.",
      "N4 crítico: caída abrupta entre ventanas, de 95 L a 80 L (más de 5 L).",
    ]);
  });
});
