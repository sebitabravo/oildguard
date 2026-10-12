import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import AlertsInboxPage from "../ops/alerts/AlertsInboxPage";
import DeviceInventoryPage from "../platform/devices/DeviceInventoryPage";
import Landing from "../platform/landing/Landing";
import Login from "../platform/login/Login";

function hasExplicitLabel(html: string, id: string): boolean {
  return new RegExp(`<label\\b[^>]*for="${id}"[^>]*>[\\s\\S]*?<\\/label>`).test(html)
    && new RegExp(`<input\\b[^>]*id="${id}"`).test(html);
}

function hasWrappedInput(html: string, id: string): boolean {
  return new RegExp(`<label\\b[^>]*class="og-form-field"[^>]*>[\\s\\S]*?<input\\b[^>]*id="${id}"`).test(html);
}

describe("A11Y-13 input labels and hit-area hooks", () => {
  test("login inputs have stable IDs and explicit labels", () => {
    const html = renderToString(h(Login, {}));
    expect(hasExplicitLabel(html, "login-email")).toBe(true);
    expect(hasExplicitLabel(html, "login-password")).toBe(true);
  });

  test("alerts and device search inputs have stable IDs and native label associations", () => {
    const alerts = renderToString(h(AlertsInboxPage, {}));
    const devices = renderToString(h(DeviceInventoryPage, {}));
    expect(hasWrappedInput(alerts, "alerts-search")).toBe(true);
    expect(hasExplicitLabel(devices, "devices-search")).toBe(true);
  });

  test("alerts ID and callout links expose the hit-area class", () => {
    const html = renderToString(h(AlertsInboxPage, {}));
    expect(html).toContain('class="og-mono og-alerts-hit-area" href="/alerts/detail?id=');
    expect(html).toContain('class="og-alerts-hit-area" href="/alerts/rules"');
  });

  test("landing exposes the existing footer and masthead target hooks", () => {
    const html = renderToString(h(Landing, {}));
    expect(html).toContain('class="landing__brand"');
    expect(html).toContain('class="landing__footer-grid"');
    expect(html).toContain('class="landing__footer-brand"');
  });
});
