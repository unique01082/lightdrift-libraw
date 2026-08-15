import { readFile } from "node:fs/promises";
import ts from "typescript";
import { expect, test } from "vitest";

test("legacy declarations cover the complete beta method surface", async () => {
  const [contractText, declarationText] = await Promise.all([
    readFile(new URL("../../api/beta-contract.json", import.meta.url), "utf8"),
    readFile(new URL("../../lib/index.d.ts", import.meta.url), "utf8"),
  ]);
  const contract = JSON.parse(contractText);
  const source = ts.createSourceFile(
    "index.d.ts",
    declarationText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = source.statements.find(
    (statement) => ts.isClassDeclaration(statement) && statement.name?.text === "LibRaw",
  );
  expect(declaration, "missing LibRaw declaration").toBeDefined();

  const instanceMethods = new Set();
  const staticMethods = new Set();
  for (const member of declaration.members) {
    if (!ts.isMethodDeclaration(member) || !member.name || !ts.isIdentifier(member.name)) {
      continue;
    }
    const isStatic = member.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword,
    );
    (isStatic ? staticMethods : instanceMethods).add(member.name.text);
  }

  expect([...contract.instanceMethods].filter((name) => !instanceMethods.has(name))).toEqual([]);
  expect([...contract.staticMethods].filter((name) => !staticMethods.has(name))).toEqual([]);
});
