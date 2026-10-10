import { describe, expect, test } from "bun:test";
import { formatDemoLabNote } from "./demoCopy";

describe("demo dashboard copy", () => {
  test("formats the lab note with the selected language's decimal separator", () => {
    expect(formatDemoLabNote("en")).toBe(
      "LAB-ACCELERATED leak ~128.5 %/h x257 vs spec 0.5 %/h (~4.0 L over 120 s)",
    );
    expect(formatDemoLabNote("es")).toBe(
      "Fuga LAB-ACELERADA ~128,5 %/h x257 vs espec 0,5 %/h (~4,0 L en 120 s)",
    );
  });
});
