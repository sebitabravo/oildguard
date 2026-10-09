import { describe, expect, test } from "bun:test";
import { languageFromQuery } from "./queryLanguage";

describe("query language parsing", () => {
  test("accepts supported language values", () => {
    expect(languageFromQuery("?lang=en")).toBe("en");
    expect(languageFromQuery("?lang=es")).toBe("es");
  });

  test("ignores missing and unsupported values", () => {
    expect(languageFromQuery("?demo=1")).toBe(undefined);
    expect(languageFromQuery("?lang=fr")).toBe(undefined);
    expect(languageFromQuery("?lang=")).toBe(undefined);
  });

  test("normalizes the language value case", () => {
    expect(languageFromQuery("?lang=ES")).toBe("es");
    expect(languageFromQuery("?lang=eN")).toBe("en");
  });
});
