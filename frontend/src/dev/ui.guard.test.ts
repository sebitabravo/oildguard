import { describe, expect, test } from "bun:test";
// @ts-expect-error Bun expone node:fs durante las pruebas; Astro no incluye sus tipos.
import { existsSync } from "node:fs";

const routeSource = new URL("../pages/dev/ui.astro", import.meta.url);
const productionRoute = new URL("../../dist/dev/ui/index.html", import.meta.url);

describe("developer UI production exclusion", () => {
  test("does not include the developer route source or production artifact", () => {
    expect(existsSync(routeSource)).toBe(false);
    expect(existsSync(productionRoute)).toBe(false);
  });
});
