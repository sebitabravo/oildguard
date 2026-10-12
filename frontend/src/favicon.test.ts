import { describe, expect, test } from "bun:test";

declare const Bun: { file(url: URL): { arrayBuffer(): Promise<ArrayBuffer> } };

describe("browser favicon asset", () => {
  test("ships an ICO file with a valid header", async () => {
    const bytes = new Uint8Array(await Bun.file(new URL("../public/favicon.ico", import.meta.url)).arrayBuffer());

    expect([...bytes.slice(0, 4)]).toEqual([0, 0, 1, 0]);
    expect(bytes.byteLength).toBeGreaterThan(4);
  });
});
