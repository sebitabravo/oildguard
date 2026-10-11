import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import AlertsInboxPage from "./AlertsInboxPage";
import { t } from "../../i18n";

describe("alert row provenance status", () => {
  test("keeps the DEMO row source separate from backend reachability", () => {
    const html = renderToString(h(AlertsInboxPage, {}));
    const row = html.match(/<tr class="og-alerts-row[^>]*>[\s\S]*?alert-wheel-RH-03[\s\S]*?<\/tr>/)?.[0] ?? "";

    expect(row).toContain("alert-wheel-RH-03");
    expect(row).toContain("DEMO");
    expect(!row.includes("Backend no disponible")).toBe(true);
    expect(t("alerts.backend.status.available")).toBe("Backend disponible");
  });
});
