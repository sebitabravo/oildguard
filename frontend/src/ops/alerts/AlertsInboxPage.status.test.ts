import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import AlertsInboxPage from "./AlertsInboxPage";
import { t } from "../../i18n";

describe("alerts status honesty", () => {
  test("separates backend reachability from the DEMO alert data source", () => {
    const html = renderToString(h(AlertsInboxPage, {}));
    const badge = html.match(/<span class="og-alerts-pill[^>]*>(.*?)<\/span>/)?.[1] ?? "";
    const notice = html.match(/<div class="og-notice[^>]*>(.*?)<\/div>/)?.[1] ?? "";

    expect(badge).toContain("Comprobando backend");
    expect(notice).toContain("Fuente de alertas: DEMO");
    expect(!notice.includes("no disponible o")).toBe(true);
    expect(!notice.includes("Backend")).toBe(true);
  });
});

describe("alerts filter control associations", () => {
  test("pairs all five filter labels with their native controls", () => {
    const html = renderToString(h(AlertsInboxPage, {}));
    const fieldsMarkup = html.match(/<div class="og-alerts-filter-fields">([\s\S]*?)<\/div>/)?.[1] ?? "";
    const fields = [...fieldsMarkup.matchAll(/<label class="og-form-field">([\s\S]*?)<\/label>/g)].map((match) => match[1] ?? "");
    const expected = [
      ["alerts.filter.level", "select"],
      ["alerts.filter.lifecycle", "select"],
      ["alerts.filter.truck", "select"],
      ["alerts.filter.role", "select"],
      ["alerts.filter.search", 'input type="search"'],
    ] as const;

    expect(fields.length).toBe(expected.length);
    expected.forEach(([labelKey, control]) => {
      const field = fields.find((markup) => markup.includes(`<span>${t(labelKey)}</span>`));
      expect(field !== undefined).toBe(true);
      expect(field).toContain(`<${control}`);
    });
  });
});
