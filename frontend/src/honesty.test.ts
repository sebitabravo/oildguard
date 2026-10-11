import { describe, expect, test } from "bun:test";

declare const Bun: {
  Glob: new (pattern: string) => {
    scan(options: { cwd: string }): AsyncIterable<string>;
  };
  file(path: URL): { text(): Promise<string> };
};

type BannedTerm = { term: string; reason: string };
type BannedMatch = BannedTerm & { index: number };

const sourceRoot = new URL("./", import.meta.url);

const bannedTerms: BannedTerm[] = [
  { term: "Pelambres", reason: "Real mining sites must not be presented as OilGuard deployments." },
  { term: "Escondida", reason: "Real mining sites must not be presented as OilGuard deployments." },
  { term: "Chuquicamata", reason: "Real mining sites must not be presented as OilGuard deployments." },
  { term: "Antofagasta Minerals", reason: "Do not imply an unsupported customer or partner relationship." },
  { term: "Codelco", reason: "Do not imply an unsupported customer or partner relationship." },
  { term: "Valenzuela", reason: "Do not invent people or operational staff." },
  { term: "op.vargas", reason: "Do not invent people or operational staff." },
  { term: "Razor Labs", reason: "Do not imply an unsupported customer or case study." },
  { term: "OilGuard Systems", reason: "Do not use an unsupported company identity." },
  { term: "Consortium", reason: "Do not invent organizational affiliations." },
  { term: "FrontRunner", reason: "Do not imply an unsupported third-party integration." },
  { term: "SAP PM", reason: "Do not imply an unsupported third-party integration." },
  { term: "Mettler Toledo", reason: "Do not imply an unrun bench test or unsupported instrument." },
  { term: "Weibull", reason: "Weibull prediction is outside the prototype's supported AI scope." },
  { term: "optico-dielectrico", reason: "Optical-dielectric sensing is unsupported by the product design." },
  { term: "optical-dielectric", reason: "Optical-dielectric sensing is unsupported by the product design." },
  { term: "PT100", reason: "PT100 is not a supported sensor claim for this prototype." },
  { term: "830E", reason: "Validated scope is Komatsu 930E/GDY106 only." },
  { term: "cero falsos positivos", reason: "Do not claim unmeasured detection performance." },
  { term: "zero false positives", reason: "Do not claim unmeasured detection performance." },
  { term: "SIL-2", reason: "Do not claim unsupported safety certification." },
  { term: "SIL 2", reason: "Do not claim unsupported safety certification." },
  { term: "ISO 13849", reason: "Do not claim unsupported safety certification." },
  { term: "IEC 62443 L2", reason: "Prototype row signing is not IEC 62443 compliance." },
  { term: "SL-3", reason: "Do not claim unsupported security certification." },
  { term: "FIPS", reason: "Do not claim unsupported security certification." },
  { term: "99.98%", reason: "Do not claim unmeasured availability or reliability." },
  { term: "Ingenieria Civil", reason: "Do not invent or misstate team credentials." },
  { term: "ROI", reason: "Do not make unsupported financial or return-on-investment claims." },
  { term: "USD", reason: "Do not put unsupported financial claims in the application." },
  { term: "interlock", reason: "OilGuard is read-only and must not imply machine-control actions." },
  { term: "emergency-stop", reason: "OilGuard is read-only and must not imply machine-control actions." },
  { term: "TRIGGER_HAUL_STOP", reason: "OilGuard is read-only and must not imply machine-control actions." },
  { term: "corta traccion", reason: "OilGuard is read-only and must not imply machine-control actions." },
  { term: "Confirmar Detencion", reason: "OilGuard is read-only and must not imply machine-control actions." },
  { term: "Alternar a Reposo", reason: "OilGuard is read-only and must not imply machine-control actions." },
  { term: "Flash NVS", reason: "OilGuard is read-only and must not imply device-write actions." },
];

const allowlist = new Map<string, string>();

// Puerta de política A12: la guardia sigue siendo solo del frontend hasta
// que el padre apruebe por escrito la remediación acotada de documentos.
// El inventario vive en docs/integrity-inventory.md y la aprobación sigue
// pendiente; por eso aquí no se amplía el alcance ni se agregan exenciones.
// El cero-match crudo sigue NO RESUELTO porque los literales de
// guardia/prueba/política existen en el repo por diseño.

function normalizeForMatching(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findBannedMatches(text: string, terms: readonly BannedTerm[]): BannedMatch[] {
  const normalizedText = normalizeForMatching(text);
  const matches: BannedMatch[] = [];
  for (const banned of terms) {
    const normalizedTerm = normalizeForMatching(banned.term);
    const requiresBoundary = ["ROI", "USD", "SIL-2", "SIL 2"].includes(banned.term);
    const pattern = new RegExp(
      `${requiresBoundary ? "\\b" : ""}${escapeRegExp(normalizedTerm)}${requiresBoundary ? "\\b" : ""}`,
      "g",
    );
    for (const match of normalizedText.matchAll(pattern)) {
      matches.push({ ...banned, index: match.index ?? 0 });
    }
  }
  return matches.sort((left, right) => left.index - right.index);
}

async function findSourceViolations(): Promise<string[]> {
  const violations: string[] = [];
  for await (const filePath of new Bun.Glob("**/*.{ts,tsx,astro,css,mjs}").scan({ cwd: sourceRoot.pathname })) {
    if (/\.test\.ts$/.test(filePath) || filePath === "honesty.test.ts" || allowlist.has(filePath)) continue;
    const sourceText = await Bun.file(new URL(filePath, sourceRoot)).text();
    for (const [lineIndex, line] of sourceText.split(/\r?\n/).entries()) {
      for (const match of findBannedMatches(line, bannedTerms)) {
        violations.push(`${filePath}:${lineIndex + 1}: ${match.term} — ${match.reason}`);
      }
    }
  }
  return violations;
}

describe("honesty matcher", () => {
  test("normalizes case and accents while respecting short-token boundaries", () => {
    const terms = [
      { term: "Pelambres", reason: "real site" },
      { term: "ROI", reason: "unsupported financial claim" },
    ];

    expect(findBannedMatches("Faena PÉLAMBRES — ROI estimate", terms).map(({ term }) => term)).toEqual([
      "Pelambres",
      "ROI",
    ]);
    expect(findBannedMatches("broiler inventory", [terms[1]])).toEqual([]);
    expect(findBannedMatches("WeibullModel TRIGGER_HAUL_STOP_NOW", bannedTerms).map(({ term }) => term)).toEqual([
      "Weibull",
      "TRIGGER_HAUL_STOP",
    ]);
    expect(findBannedMatches("usdCode", [{ term: "USD", reason: "short token" }])).toEqual([]);
  });
});

describe("frontend honesty guard", () => {
  test("contains no unsupported claims or machine-control actions", async () => {
    const violations = await findSourceViolations();
    if (violations.length > 0) throw new Error(violations.join("\n"));
  });
});

// Candado A12: documenta que la lista no se redujo y que no hay exenciones
// mientras la remediación amplia espera aprobación del padre.
describe("integrity inventory policy gate (A12)", () => {
  test("keeps the banned-term list unshrunk with no exemptions", () => {
    expect(bannedTerms.length).toBe(37);
    expect(allowlist.size).toBe(0);
  });
});
