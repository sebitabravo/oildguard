import { describe, expect, test } from "bun:test";
import { activeRoute, navGroups } from "./nav";
import { routeRegistry } from "./routes";

describe("navigation registry", () => {
  test("contains every D5 route and preserves readiness flags", () => {
    const paths = routeRegistry.map((route) => route.path);
    const required = [
      "/", "/login", "/fleet", "/monitoring", "/wheel/history", "/rul", "/calibration",
      "/mine", "/wheel", "/alerts", "/alerts/detail", "/alerts/rules", "/devices", "/link",
      "/lab/sim", "/lab/validation", "/lab/bench", "/report",
    ];
    expect(required.every((path) => paths.includes(path))).toBe(true);
    expect(routeRegistry.find((route) => route.path === "/monitoring")?.ready).toBe(true);
    expect(routeRegistry.find((route) => route.path === "/fleet")?.ready).toBe(false);
  });

  test("groups contain only unique navigation items", () => {
    const items = navGroups.flatMap((group) => group.items);
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
    expect(navGroups.map((group) => group.items.length)).toEqual([5, 2, 2, 2, 3]);
  });

  test("matches nested alert detail to the alerts item", () => {
    expect(activeRoute("/alerts")).toBe("alerts");
    expect(activeRoute("/alerts/detail")).toBe("alerts");
    expect(activeRoute("/alerts/detail?id=alert-1")).toBe("alerts");
  });
});
