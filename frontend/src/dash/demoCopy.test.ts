import { describe, expect, test } from "bun:test";
import { formatDemoLabNote } from "./demoCopy";

describe("demo dashboard copy", () => {
  test("formats the lab note with the Spanish decimal separator", () => {
    expect(formatDemoLabNote()).toBe(
      "Fuga LAB-ACELERADA ~128,5 %/h x257 vs espec 0,5 %/h (~4,0 L en 120 s)",
    );
  });
});
