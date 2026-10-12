import { describe, expect, test } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { t } from "../i18n";
import { NumericEvidence } from "../ops/wheel/WheelPanels";
import { DashboardWindowsReadout } from "./Dashboard";

function renderChartCardReadout(validity: "valid" | "stale" | "invalid") {
  return renderToString(
    h("div", { class: "og-wheel-grid og-dashboard-panels" },
      h("div", { class: "og-wheel-main" },
        h("section", { class: "og-wheel-panel og-dashboard-chart" },
          h("h3", {},
            t("wheel.chart.title"),
            h("span", { class: "og-wheel-panel__meta" },
              h(NumericEvidence, { field: "sigma", source: "LIVE", validity, children: "Sigma" }),
              " · ",
              h(NumericEvidence, { field: "confidence", source: "LIVE", validity, children: "Confidence" }),
            ),
          ),
          h("span", {}, validity === "invalid" ? t("ui.invalid") : validity === "stale" ? t("ui.stale") : ""),
        ),
        h("section", { class: "og-wheel-panel og-wheel-mode" },
          h(DashboardWindowsReadout, { windowCount: 1, storeRows: 2, validity }),
        ),
      ),
    ),
  );
}

describe("dashboard chart-card source badge validity", () => {
  function expectNoLiveBadge(validity: "stale" | "invalid") {
    const html = renderChartCardReadout(validity);
    expect(html.includes(t("wheel.chart.title"))).toBe(true);
    expect(html.includes(validity === "stale" ? t("ui.stale") : t("ui.invalid"))).toBe(true);
    expect(html.includes(t("fleet.source.live"))).toBe(false);
  }

  test("does not present a live badge beside a stale chart reading", () => {
    expectNoLiveBadge("stale");
  });

  test("does not present a live badge beside an invalid chart reading", () => {
    expectNoLiveBadge("invalid");
  });

  test("keeps the live source badge for a valid chart reading", () => {
    expect(renderChartCardReadout("valid").includes(t("fleet.source.live"))).toBe(true);
  });
});
