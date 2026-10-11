import { describe, expect, test } from "bun:test";
import { languageFromQuery } from "./queryLanguage";

// Solo español (S05): ?lang= se ignora siempre (decisión S01); ningún
// valor de consulta cambia el idioma.
describe("query language parsing", () => {
  test("ignores every query value, including formerly supported codes", () => {
    expect(languageFromQuery("?lang=es")).toBe(undefined);
    expect(languageFromQuery("?lang=en")).toBe(undefined);
  });

  test("ignores missing and unsupported values", () => {
    expect(languageFromQuery("?demo=1")).toBe(undefined);
    expect(languageFromQuery("?lang=fr")).toBe(undefined);
    expect(languageFromQuery("?lang=")).toBe(undefined);
  });

  test("ignores case variants instead of normalizing them", () => {
    expect(languageFromQuery("?lang=ES")).toBe(undefined);
    expect(languageFromQuery("?lang=eN")).toBe(undefined);
  });
});
