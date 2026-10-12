import { expect, test } from "bun:test";
import { renderToString } from "preact-render-to-string";
import { demoDataset } from "../../demo/dataset";
import { dict, t, type DictKey } from "../../i18n";
import { buildDemoAlerts } from "./logic";
import AlertDetailPage from "./AlertDetailPage";

test("alert detail presents level intent as guidance without dispatch controls", () => {
  const record = buildDemoAlerts(demoDataset).find((alert) => alert.level === "N2");
  expect(record).toBeDefined();
  if (!record) return;

  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { search: `?id=${record.id}` } },
  });

  try {
    const html = renderToString(<AlertDetailPage />);
    const guidanceKey = "alerts.intent.guidance" as DictKey;
    const guidance = t(guidanceKey);
    const intentSection = html.match(/<section[^>]*aria-label="[^"]+"[^>]*>[\s\S]*?<\/section>/)?.[0] ?? "";

    expect(Object.hasOwn(dict, guidanceKey)).toBe(true);
    expect(html).toContain(guidance);
    expect(intentSection).toContain(record.intent.action);
    expect(intentSection).toContain(record.intent.recipient);
    expect(intentSection).not.toContain("<button");
    expect(intentSection).not.toContain("<a ");
    expect(intentSection).not.toContain("<form");
  } finally {
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
    }
  }
});
