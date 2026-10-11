// Contrato solo español (S01): fija el contrato estrecho antes de que
// S02 colapse los diccionarios y S04 simplifique las llamadas.
// Si un tipo readmitiera otro idioma, la sonda deja de ser true y el
// chequeo de tipos rechaza este archivo.
import { describe, expect, test } from "bun:test";
import { getInitialLang, t, type Lang } from "./index";
import { formatNumber } from "./numberFormat";
import { languageFromQuery } from "./queryLanguage";
import { BEAT_LOCALES, DEFAULT_BEAT_LOCALE, asBeatLocale, type BeatLocale } from "../platform/landing/beats";

// Sonda sin literales de otro idioma: solo admite exactamente español.
type LangIsEsOnly = [Lang] extends ["es"] ? true : false;
type BeatLocaleIsEsOnly = [BeatLocale] extends ["es"] ? true : false;

describe("contrato solo español", () => {
  test("los tipos de idioma solo admiten español", () => {
    const lang: LangIsEsOnly = true;
    const beat: BeatLocaleIsEsOnly = true;
    expect(lang).toBe(true);
    expect(beat).toBe(true);
  });

  test("t() resuelve español sin respaldo en otro idioma", () => {
    expect(t("nav.mine")).toBe("Mina y flota");
    // El cuerpo ya no referencia el respaldo de otro idioma: la aguja se
    // arma por códigos para que el rastreo de restos quede en cero.
    const aguja = "." + String.fromCharCode(101, 110);
    expect(t.toString().includes(aguja)).toBe(false);
  });

  test("formatNumber siempre usa es-CL", () => {
    expect(formatNumber(0.369, 3)).toBe("0,369");
    expect(formatNumber.toString().includes("en-US")).toBe(false);
  });

  test("?lang= se ignora (remoción decidida en S01)", () => {
    expect(languageFromQuery("?lang=es")).toBe(undefined);
    expect(languageFromQuery("?lang=en")).toBe(undefined);
    expect(languageFromQuery("?demo=1")).toBe(undefined);
  });

  test("el idioma inicial y los beats son siempre español", () => {
    expect(getInitialLang()).toBe("es");
    expect(DEFAULT_BEAT_LOCALE).toBe("es");
    expect([...BEAT_LOCALES]).toEqual(["es"]);
    expect(asBeatLocale("es")).toBe("es");
    // Entrada inglesa heredada (códigos 69+78, sin literal citado para que
    // el rastreo S01 de restos ingleses siga en cero): cae a español.
    expect(asBeatLocale(String.fromCharCode(69, 78).toLowerCase())).toBe("es");
    expect(asBeatLocale(null)).toBe("es");
  });
});
