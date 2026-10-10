import { describe, expect, test } from "bun:test";
import ts from "typescript";

declare const Bun: {
  Glob: new (pattern: string) => {
    scan(options: { cwd: string }): AsyncIterable<string>;
  };
  file(path: URL): { text(): Promise<string> };
};

const sourceRoot = new URL("../", import.meta.url);

async function findDirectDisplayFormatting(): Promise<string[]> {
  const violations: string[] = [];
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
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        violations.push(`${filePath}:${line}`);
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
  }
  return violations;
}

describe("dashboard number display formatting", () => {
  test("uses the shared locale formatter for displayed numbers", async () => {
    const result = await findDirectDisplayFormatting();
    expect(result).toEqual([]);
  });
});
