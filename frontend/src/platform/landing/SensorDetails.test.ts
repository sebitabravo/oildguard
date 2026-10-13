import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import SensorDetails from "./SensorDetails";
import { LANDING_SENSOR_IDS, sensorById } from "./scenes/sensors";
import { dict, t } from "../../i18n";

// Las tarjetas del landing (B05): cada selector abre su tarjeta trazada,
// sin afirmar montajes fijos más allá de la verdad de origen.
// Solo español (S05): todo el render sale en español.
const BANNED_CLAIMS = [
  "stationary mount",
  "stationary sensor",
  "fixed point",
  "punto fijo",
  "estacionario",
];

describe("sensor details cards", () => {
  test("renders four selectors, one per traced sensor", () => {
    const html = renderToString(h(SensorDetails, { initial: "pressure" }));
    for (const id of LANDING_SENSOR_IDS) {
      expect(html.includes(`data-sensor="${id}"`)).toBe(true);
    }
  });

  test("selectors open the right card in Spanish", () => {
    for (const id of LANDING_SENSOR_IDS) {
      const sensor = sensorById(id);
      const html = renderToString(h(SensorDetails, { initial: id }));
      expect(html.includes(`data-sensor-card="${id}"`)).toBe(true);
      expect(html.includes(t(sensor.serviceKey))).toBe(true);
      expect(html.includes(t(sensor.titleKey))).toBe(true);
      expect(html.includes(sensor.item)).toBe(true);
    }
  });

  test("exposes keyboard-operable native buttons with named group and pressed state", () => {
    const html = renderToString(h(SensorDetails, { initial: "temperature" }));

    expect(html).toContain('role="group" aria-label="Selectores de sensores"');
    for (const id of LANDING_SENSOR_IDS) {
      const selector = html.match(new RegExp(`<button[^>]*data-sensor="${id}"[^>]*>`))?.[0];
      expect(selector).toBeDefined();
      expect(selector).toContain('type="button"');
      expect(selector).toContain(id === "temperature" ? 'aria-pressed="true"' : 'aria-pressed="false"');
    }
  });

  test("each card matches its B01 service point, not a neighbour", () => {
    const pressure = renderToString(h(SensorDetails, { initial: "pressure" }));
    expect(pressure.includes(t(sensorById("pressure").serviceKey))).toBe(true);
    expect(pressure.includes(t(sensorById("temperature").serviceKey))).toBe(false);
    const current = renderToString(h(SensorDetails, { initial: "current" }));
    expect(current.includes(t(sensorById("current").serviceKey))).toBe(true);
    expect(current.includes(t(sensorById("pressure").serviceKey))).toBe(false);
  });

  test("carries the rotating-output note without a stationary claim", () => {
    for (const id of LANDING_SENSOR_IDS) {
      const html = renderToString(h(SensorDetails, { initial: id }));
      for (const banned of BANNED_CLAIMS) {
        expect(html.toLowerCase().includes(banned.toLowerCase())).toBe(false);
      }
    }
    const pressure = renderToString(h(SensorDetails, { initial: "pressure" }));
    expect(pressure.includes(dict["landing.sensors.rotatingNote"])).toBe(true);
    const current = renderToString(h(SensorDetails, { initial: "current" }));
    expect(current.includes(dict["landing.sensors.current.service"])).toBe(true);
  });

  test("negative: a wrong card would fail — pressure never shows the cable service", () => {
    const html = renderToString(h(SensorDetails, { initial: "pressure" }));
    expect(html.includes(`data-sensor-card="current"`)).toBe(false);
    expect(html.includes(t(sensorById("current").serviceKey))).toBe(false);
  });

  test("negative: an unselectable sensor throws instead of rendering silently", () => {
    expect(() => renderToString(h(SensorDetails, { initial: "turbo" as never }))).toThrow();
    expect(() => sensorById("turbo")).toThrow();
  });
});
