import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { t } from "../i18n";
import BackendOutageNotice from "./BackendOutageNotice";

describe("shared backend outage notice", () => {
  test("preserves the Spanish alert copy and error styling", () => {
    const html = renderToString(h(BackendOutageNotice, {}));

    expect(html).toContain('class="og-analyzer-notice" role="alert"');
    expect(html).toContain("og-notice--error");
    expect(html).toContain(t("dash.backend.outage.title"));
    expect(html).toContain(t("dash.backend.outage.detail"));
  });

  test("keeps title and detail in one coherent content node", () => {
    const html = renderToString(h(BackendOutageNotice, {}));
    const noticeInner = html.match(/og-notice--error[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "";
    const spanInner = noticeInner.match(/<span>([\s\S]*?)<\/span>/)?.[1] ?? "";

    expect(spanInner).toContain(`<strong>${t("dash.backend.outage.title")}</strong>`);
    expect(spanInner).toContain(t("dash.backend.outage.detail"));
    expect(noticeInner.replace(/<span>[\s\S]*?<\/span>/, "").includes(t("dash.backend.outage.detail"))).toBe(false);
  });
});
