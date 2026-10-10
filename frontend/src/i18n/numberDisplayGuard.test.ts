import { describe, expect, test } from "bun:test";
import ts from "typescript";

declare const Bun: {
  Glob: new (pattern: string) => {
    scan(options: { cwd: string }): AsyncIterable<string>;
  };
  file(path: URL): { text(): Promise<string> };
};

const sourceRoot = new URL("../", import.meta.url);
const geometryVariables = new Set(["line", "bandTop", "bandBottom"]);

async function findDirectDisplayFormatting(): Promise<{ violations: string[]; geometryCalls: number }> {
  const violations: string[] = [];
  let geometryCalls = 0;
  for await (const filePath of new Bun.Glob("**/*.tsx").scan({ cwd: sourceRoot.pathname })) {
    const sourceText = await Bun.file(new URL(filePath, sourceRoot)).text();
    const source = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    function visit(node: ts.Node): void {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "toFixed"
      ) {
        let parent: ts.Node | undefined = node.parent;
        while (parent && !ts.isVariableDeclaration(parent)) parent = parent.parent;
        const variableName = parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)
          ? parent.name.text
          : undefined;
        const isSvgGeometry = filePath === "dash/LevelChart.tsx" &&
          variableName !== undefined && geometryVariables.has(variableName);
        if (isSvgGeometry) {
          geometryCalls += 1;
        } else {
          const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          violations.push(`${filePath}:${line}`);
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
  }
  return { violations, geometryCalls };
}

describe("dashboard number display formatting", () => {
  test("uses the shared locale formatter for displayed numbers", async () => {
    const result = await findDirectDisplayFormatting();
    expect(result.violations).toEqual([]);
    expect(result.geometryCalls).toBe(6);
  });
});
