import { describe, expect, test } from "bun:test";
// @ts-expect-error Bun aporta node:fs al ejecutar las pruebas; Astro no incluye sus tipos.
import { readFileSync } from "node:fs";

describe("frontend demo data source", () => {
  test("stays in exact parity with the simulator export", () => {
    const frontendData = readFileSync(new URL("./demo-data.json", import.meta.url));
    const simulatorData = readFileSync(new URL("../../../sim/demo-data.json", import.meta.url));

    expect(frontendData.equals(simulatorData)).toBe(true);
  });
});
