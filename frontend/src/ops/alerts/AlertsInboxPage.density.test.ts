import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import AlertsInboxPage from "./AlertsInboxPage";
import { t } from "../../i18n";

describe("alerts recurrence density", () => {
  test("keeps recurrence ranking in a collapsed one-click disclosure", () => {
    const html = renderToString(h(AlertsInboxPage, {}));
    const disclosure = html.match(/<details\b([^>]*)>([\s\S]*?)<\/details>/);
    const details = disclosure?.[2] ?? "";

    expect(disclosure).not.toBeNull();
    expect(disclosure?.[1]).not.toContain("open");
    expect(details).toContain(`<summary>${t("alerts.recur.title")}</summary>`);
    expect(details).toContain('class="og-alerts-ranking"');
    expect(details.match(/<button\b/g)?.length).toBeGreaterThan(0);
  });
});
