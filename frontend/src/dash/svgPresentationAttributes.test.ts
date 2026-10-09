import { describe, expect, test } from "bun:test";
import ts from "typescript";

declare const Bun: {
  Glob: new (pattern: string) => {
    scan(options: { cwd: string }): AsyncIterable<string>;
  };
  file(path: URL): { text(): Promise<string> };
};

const sourceRoot = new URL("../", import.meta.url);
const camelCaseSvgAttributes = new Map<string, string>([
  ["strokeWidth", "stroke-width"],
  ["strokeDasharray", "stroke-dasharray"],
  ["strokeLinecap", "stroke-linecap"],
  ["strokeLinejoin", "stroke-linejoin"],
  ["strokeOpacity", "stroke-opacity"],
  ["fillOpacity", "fill-opacity"],
  ["font" + "Size", "font-size"],
  ["font" + "Weight", "font-weight"],
  ["font" + "Family", "font-family"],
  ["textAnchor", "text-anchor"],
  ["dominantBaseline", "dominant-baseline"],
  ["stopColor", "stop-color"],
  ["stopOpacity", "stop-opacity"],
  ["clipPath", "clip-path"],
  ["clipRule", "clip-rule"],
  ["fillRule", "fill-rule"],
  ["vectorEffect", "vector-effect"],
  ["shapeRendering", "shape-rendering"],
  ["colorInterpolation", "color-interpolation"],
  ["colorInterpolationFilters", "color-interpolation-filters"],
  ["paintOrder", "paint-order"],
  ["alignmentBaseline", "alignment-baseline"],
  ["baselineShift", "baseline-shift"],
  ["markerEnd", "marker-end"],
  ["markerMid", "marker-mid"],
  ["markerStart", "marker-start"],
]);

async function findCamelCaseSvgAttributes(): Promise<string[]> {
  const violations: string[] = [];
  for await (const filePath of new Bun.Glob("**/*.tsx").scan({ cwd: sourceRoot.pathname })) {
    const fileUrl = new URL(filePath, sourceRoot);
    const source = ts.createSourceFile(
      filePath,
      await Bun.file(fileUrl).text(),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    function visit(node: ts.Node): void {
      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
        const replacement = camelCaseSvgAttributes.get(node.name.text);
        if (replacement) {
          const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          violations.push(`${filePath}:${line} ${node.name.text} -> ${replacement}`);
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
  }
  return violations;
}

describe("Preact SVG presentation attributes", () => {
  test("uses standards-compliant dashed names throughout the TSX tree", async () => {
    expect(await findCamelCaseSvgAttributes()).toEqual([]);
  });
});
