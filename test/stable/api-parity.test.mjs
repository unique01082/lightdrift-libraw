import { readFile } from "node:fs/promises";
import ts from "typescript";
import { expect, test } from "vitest";

const manifestUrl = new URL("../../api/libraw-0.22.2.json", import.meta.url);

function extractPublicApiNames(header) {
  let publicSection = header.slice(header.indexOf("class DllDef LibRaw"));
  publicSection = publicSection.slice(
    publicSection.indexOf("public:") + "public:".length,
    publicSection.indexOf("protected:"),
  );
  publicSection = publicSection
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/^\s*#.*$/gm, "");

  const names = new Set();
  let declaration = "";
  let bodyDepth = 0;
  const addDeclaration = (source) => {
    const text = source.trim();
    if (!text) return;
    const functions = [...text.matchAll(/(~?[A-Za-z_]\w*)\s*\(/g)];
    if (functions.length) {
      names.add(functions.at(-1)[1]);
      return;
    }
    const field = text.match(/(?:^|\s)([A-Za-z_]\w*)\s*$/);
    if (field) names.add(field[1]);
  };

  for (const character of publicSection) {
    if (bodyDepth === 0) {
      if (character === "{") {
        addDeclaration(declaration);
        declaration = "";
        bodyDepth = 1;
      } else if (character === ";") {
        addDeclaration(declaration);
        declaration = "";
      } else {
        declaration += character;
      }
    } else if (character === "{") {
      bodyDepth += 1;
    } else if (character === "}") {
      bodyDepth -= 1;
    }
  }
  return names;
}

test("parity manifest covers the vendored LibRaw public section exactly", async () => {
  const [manifestText, header] = await Promise.all([
    readFile(manifestUrl, "utf8"),
    readFile(
      new URL("../../vendor/libraw-0.22.2/libraw/libraw.h", import.meta.url),
      "utf8",
    ),
  ]);
  const manifestNames = new Set(
    JSON.parse(manifestText).operations.map((operation) => operation.upstreamName),
  );
  const headerNames = extractPublicApiNames(header);

  expect([...headerNames].filter((name) => !manifestNames.has(name))).toEqual([]);
  expect([...manifestNames].filter((name) => !headerNames.has(name))).toEqual([]);
});

test("build contract pins vendored dependencies and Node-API 8", async () => {
  const [librawVersion, zlibVersion, binding] = await Promise.all([
    readFile(
      new URL(
        "../../vendor/libraw-0.22.2/libraw/libraw_version.h",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../../vendor/zlib-1.3.2/zlib.h", import.meta.url), "utf8"),
    readFile(new URL("../../binding.gyp", import.meta.url), "utf8"),
  ]);

  expect(librawVersion).toMatch(/LIBRAW_MINOR_VERSION\s+22/);
  expect(librawVersion).toMatch(/LIBRAW_PATCH_VERSION\s+2/);
  expect(zlibVersion).toMatch(/ZLIB_VERSION\s+"1\.3\.2"/);
  expect(binding).toContain('"NAPI_VERSION=8"');
  expect(binding).toContain('"USE_ZLIB"');
  expect(binding).not.toMatch(/(?:-lraw|brew|apt|LibRaw-Win64)/i);
});

test("LibRaw 0.22.2 parity manifest covers the safe public surface", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

  expect(manifest.librawVersion).toBe("0.22.2");
  expect(manifest.naming).toBe("camelCase");

  const byUpstreamName = new Map(
    manifest.operations.map((operation) => [operation.upstreamName, operation])
  );

  for (const [upstreamName, jsName] of [
    ["open_file", "openFile"],
    ["open_buffer", "openBuffer"],
    ["open_bayer", "openBayer"],
    ["unpack", "unpack"],
    ["unpack_thumb_ex", "unpackThumbEx"],
    ["adjust_to_raw_inset_crop", "adjustToRawInsetCrop"],
    ["simplify_make_model", "simplifyMakeModel"],
    ["dcraw_make_mem_image", "dcrawMakeMemImage"],
    ["phase_one_subtract_black", "phaseOneSubtractBlack"],
    ["set_makernotes_handler", "makerNote"],
  ]) {
    const operation = byUpstreamName.get(upstreamName);
    expect(operation, `missing ${upstreamName}`).toBeDefined();
    expect(operation.jsName).toBe(jsName);
    expect(operation.status).toBe("supported");
  }

  for (const upstreamName of [
    "open_datastream",
    "get_internal_data_pointer",
    "set_dng_host",
    "output_params_ptr",
  ]) {
    const operation = byUpstreamName.get(upstreamName);
    expect(operation, `missing excluded operation ${upstreamName}`).toBeDefined();
    expect(operation.status).toBe("excluded");
    expect(operation.reason).toMatch(/pointer|lifetime|JavaScript/i);
  }

  expect(byUpstreamName.get("set_rawspeed_camerafile")).toMatchObject({
    status: "excluded",
    jsName: null,
    reason: expect.stringMatching(/RawSpeed|no-op/i),
  });

  expect(
    new Set(manifest.operations.map((operation) => operation.upstreamName)).size,
    "upstream operation names must be unique",
  ).toBe(manifest.operations.length);
});

test("generated stable declarations cover every supported manifest name", async () => {
  const [manifestText, declarationText] = await Promise.all([
    readFile(manifestUrl, "utf8"),
    readFile(new URL("../../dist/index.d.ts", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  const source = ts.createSourceFile(
    "index.d.ts",
    declarationText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const instanceNames = new Set();
  const staticNames = new Set();
  const eventNames = new Set();

  for (const statement of source.statements) {
    if (
      (ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement)) &&
      statement.name?.text === "LibRaw"
    ) {
      for (const member of statement.members) {
        if (ts.isConstructorDeclaration(member)) {
          instanceNames.add("constructor");
          continue;
        }
        if (!ts.isMethodSignature(member) && !ts.isMethodDeclaration(member)) continue;
        if (member.name && ts.isIdentifier(member.name)) {
          const isStatic = member.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword,
          );
          (isStatic ? staticNames : instanceNames).add(member.name.text);
        }
        if (
          member.name &&
          ts.isIdentifier(member.name) &&
          member.name.text === "on" &&
          member.parameters[0]?.type &&
          ts.isLiteralTypeNode(member.parameters[0].type) &&
          ts.isStringLiteral(member.parameters[0].type.literal)
        ) {
          eventNames.add(member.parameters[0].type.literal.text);
        }
      }
    }
  }

  const declaredNames = new Set([...instanceNames, ...staticNames, ...eventNames]);
  const missing = manifest.operations
    .filter((operation) => operation.status === "supported" && operation.jsName)
    .map((operation) => operation.jsName)
    .filter((name) => !declaredNames.has(name));

  expect(missing).toEqual([]);
});

test("generated declarations preserve concrete native snapshot shapes", async () => {
  const declarationText = await readFile(
    new URL("../../dist/index.d.ts", import.meta.url),
    "utf8",
  );

  expect(declarationText).toMatch(/interface MemoryImageFormat\s*\{/);
  expect(declarationText).toMatch(/interface DecoderInfo\s*\{/);
  expect(declarationText).toMatch(
    /getMemImageFormat\([^)]*\): Promise<MemoryImageFormat>/,
  );
  expect(declarationText).toMatch(
    /getDecoderInfo\([^)]*\): Promise<DecoderInfo>/,
  );
});
