import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { FleetBackendOutageNotice } from "./FleetPage";

describe("fleet backend outage notice", () => {
  test("shows only after the REST request reports failure", () => {
    const html = renderToString(h(FleetBackendOutageNotice, { backendState: "unavailable" }));
    expect(html).toContain('role="alert"');
  });

  test("stays hidden while checking or after a successful REST response", () => {
    for (const backendState of ["checking", "live"] as const) {
      const html = renderToString(h(FleetBackendOutageNotice, { backendState }));
      expect(html.includes('role="alert"')).toBe(false);
    }
  });
});
