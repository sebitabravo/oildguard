import { describe, expect, test } from "bun:test";
import { navGroups, publicNavGroups } from "./nav";
import { routeRegistry } from "./routes";

describe("public navigation menu", () => {
  test("omits utility entries without removing their routes", () => {
    const items = publicNavGroups.flatMap((group) => group.items);
    const labels = items.map((item) => item.label);
    const registeredItems = navGroups.flatMap((group) => group.items);
    const paths = routeRegistry.map((route) => route.path);

    expect(items).toHaveLength(12);
    expect(labels).not.toContain("nav.calibration");
    expect(labels).not.toContain("nav.simulation");
    expect(registeredItems.map((item) => item.id)).toContain("calibration");
    expect(registeredItems.map((item) => item.id)).toContain("lab-sim");
    expect(paths).toContain("/calibration");
    expect(paths).toContain("/lab/sim");
  });
});
