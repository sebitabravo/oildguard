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

    expect(disclosure !== null).toBe(true);
    expect(disclosure?.[1]?.includes("open") ?? false).toBe(false);
    expect(details.includes(`<summary>${t("alerts.recur.title")}</summary>`)).toBe(true);
    expect(details.includes('class="og-alerts-ranking"')).toBe(true);
    expect((details.match(/<button\b/g)?.length ?? 0) > 0).toBe(true);
  });
});
