import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import AlertsInboxPage from "./AlertsInboxPage";

describe("alerts status honesty", () => {
  test("separates backend reachability from the DEMO alert data source", () => {
    const html = renderToString(h(AlertsInboxPage, {}));
    const badge = html.match(/<span class="og-alerts-pill[^>]*>(.*?)<\/span>/)?.[1] ?? "";
    const notice = html.match(/<div class="og-notice[^>]*>(.*?)<\/div>/)?.[1] ?? "";

    expect(badge).toContain("Comprobando backend");
    expect(notice).toContain("Fuente de alertas: DEMO");
    expect(notice).not.toContain("no disponible o");
    expect(notice).not.toContain("Backend");
  });
});
