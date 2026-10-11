import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { t } from "../../i18n";
import { LinkFlowStatus } from "./LinkHealthPage";

describe("link live claims follow the connection state", () => {
  test("closed connection removes live wording", () => {
    const html = renderToString(h(LinkFlowStatus, { connected: false, lastTickMs: 1234, demo: true }));
    expect(html.includes(t("link.liveStrip"))).toBe(false);
    expect(html.includes(t("link.connection.live"))).toBe(false);
    expect(html.toLowerCase().includes("en vivo")).toBe(false);
    expect(html).toContain(t("link.connection.disconnected"));
    expect((html.match(new RegExp(t("link.connection.disconnected"), "g")) ?? []).length).toBe(1);
    expect((html.match(new RegExp(t("link.offlineStrip"), "g")) ?? []).length).toBe(1);
  });

  test("open connection preserves live wording", () => {
    const html = renderToString(h(LinkFlowStatus, { connected: true, lastTickMs: 1234, demo: false }));
    expect(html).toContain(t("link.liveStrip"));
    expect(html).toContain(t("link.connection.live"));
  });
});
