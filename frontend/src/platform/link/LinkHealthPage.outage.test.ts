import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { LinkBackendOutageNotice } from "./LinkHealthPage";

describe("link backend outage notice", () => {
  test("shows after the existing REST load falls back to demo", () => {
    const html = renderToString(h(LinkBackendOutageNotice, { source: "demo" }));
    expect(html).toContain('role="alert"');
  });

  test("stays hidden while REST is loading or live, independent of WebSocket state", () => {
    for (const source of ["loading", "live"] as const) {
      const html = renderToString(h(LinkBackendOutageNotice, { source }));
      expect(html.includes('role="alert"')).toBe(false);
    }
  });
});
