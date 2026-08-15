import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));
const text = (relative) => readFile(path.join(root, relative), "utf8");

describe("Stable v1 plan contract", () => {
  it("locks package identity, supported Node majors, and dual module exports", async () => {
    const manifest = JSON.parse(await text("package.json"));

    expect(manifest).toMatchObject({
      name: "lightdrift-libraw",
      version: "1.0.0-rc.1",
      engines: { node: "^22.0.0 || ^24.0.0" },
      main: "dist/index.cjs",
      module: "dist/index.mjs",
      types: "dist/index.d.ts",
    });
    expect(manifest.exports["."]).toEqual({
      types: "./dist/index.d.ts",
      import: "./dist/index.mjs",
      require: "./dist/index.cjs",
    });
    expect(manifest.exports["./legacy"]).toMatchObject({
      import: "./dist/legacy.mjs",
      require: "./lib/legacy.cjs",
    });
    expect(manifest.dependencies).toHaveProperty("sharp");
    expect(manifest.dependencies.sharp).toMatch(/^\^0\.35\./);
    expect(Object.keys(manifest.dependencies)).not.toContain("libraw");
    expect(manifest.scripts).not.toHaveProperty("prebuild");
    expect(manifest.scripts["build:prebuild"]).toContain("prebuildify --napi");
    expect(manifest.scripts["publish:check"]).toContain(
      "pnpm audit --prod --audit-level high",
    );
    expect(manifest.scripts["publish:check"]).toContain("tsc --noEmit");
    expect(manifest.scripts["publish:check"]).toContain("test:package");
    expect(manifest.files).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/sample-images|^test\/|^output\//)]),
    );
  });

  it("pins the source-only native build profile and Node-API ABI", async () => {
    const [binding, sourceList, librawVersion, zlibHeader] = await Promise.all([
      text("binding.gyp"),
      text("scripts/list-libraw-sources.js"),
      text("vendor/libraw-0.22.2/libraw/libraw_version.h"),
      text("vendor/zlib-1.3.2/zlib.h"),
    ]);

    expect(binding).toMatch(/"target_name": "zlib"[\s\S]*"type": "static_library"/);
    expect(binding).toMatch(/"target_name": "libraw"[\s\S]*"type": "static_library"/);
    expect(binding).toContain('"NAPI_VERSION=8"');
    expect(binding).toContain('"USE_ZLIB"');
    expect(binding).not.toMatch(/(?:-lraw|pkg-config|brew|apt-get|USE_DNGSDK|USE_RAWSPEED|USE_JASPER|USE_LCMS|OPENMP)/i);
    expect(sourceList).toContain('!entry.name.endsWith("_ph.cpp")');
    expect(librawVersion).toMatch(/LIBRAW_MAJOR_VERSION\s+0/);
    expect(librawVersion).toMatch(/LIBRAW_MINOR_VERSION\s+22/);
    expect(librawVersion).toMatch(/LIBRAW_PATCH_VERSION\s+2/);
    expect(zlibHeader).toMatch(/ZLIB_VERSION\s+"1\.3\.2"/);
  });

  it("keeps the TypeScript facade split by the planned responsibilities", async () => {
    for (const file of [
      "lib/stable/lifecycle.ts",
      "lib/stable/mirror.ts",
      "lib/stable/metadata.ts",
      "lib/stable/errors.ts",
      "lib/stable/events.ts",
      "lib/stable/workflows.ts",
      "lib/stable/processor-worker.ts",
    ]) {
      await expect(stat(path.join(root, file))).resolves.toMatchObject({
        size: expect.any(Number),
      });
    }
  });

  it("defines every required platform, source fallback, sanitizer, and consumer CI gate", async () => {
    const ci = await text(".github/workflows/ci.yml");

    expect(ci).toContain("branches: [master]");
    for (const target of [
      "linux-x64",
      "linux-arm64",
      "darwin-x64",
      "darwin-arm64",
      "win32-x64",
    ]) {
      expect(ci).toContain(`platform: ${target}`);
    }
    expect(ci).toContain("node: [22, 24]");
    expect(ci).toContain("runner: windows-2022");
    expect(ci).not.toContain("runner: windows-2025");
    expect(ci).toContain("npm_config_build_from_source=true");
    expect(ci).toContain("pnpm run build:prebuild");
    expect(ci).toContain("-fsanitize=address,undefined");
    expect(ci).toMatch(
      /LD_PRELOAD=.*ASAN_OPTIONS=.*pnpm run test:stable/,
    );
    expect(ci).toContain("scripts/test-malformed-child.js");
    expect(ci).toContain("REQUIRE_ALL_PREBUILDS=1");
    expect(ci).toContain("npm install --ignore-scripts ./package.tgz");
    expect(ci).toContain("pnpm audit --prod --audit-level high");
    expect(ci).toMatch(/name: Prebuilt tarball consumer Node \$\{\{ matrix\.node \}\}/);
  });

  it("allows native RAW workflows enough time on constrained CI runners", async () => {
    const config = await text("vitest.config.ts");
    expect(config).toContain("testTimeout: 120_000");
  });

  it("gates trusted RC/stable publication on builds, consumers, provenance, and SBOM", async () => {
    const release = await text(".github/workflows/release.yml");

    expect(release).toContain("runner: windows-2022");
    expect(release).not.toContain("runner: windows-2025");

    expect(release).toContain("id-token: write");
    expect(release).toContain(
      "needs: [prebuild, source-fallback, sanitizers, security]",
    );
    expect(release).toContain("needs: [package, consumer]");
    expect(release).toContain("pnpm run build:prebuild");
    expect(release).toContain("npm_config_build_from_source=true pnpm run build:native");
    expect(release).toContain("@cyclonedx/cdxgen@12.7.0");
    expect(release).toContain("pnpm audit --prod --audit-level high");
    expect(release).toMatch(
      /LD_PRELOAD=.*ASAN_OPTIONS=.*pnpm run test:stable/,
    );
    expect(release).toContain("--spec-version 1.6");
    expect(release).toContain("--provenance");
    expect(release).toContain('echo "tag=next"');
    expect(release).toContain('echo "tag=latest"');
    expect(release).toContain("'v' + require('./package.json').version");
    expect(release).not.toMatch(/NODE_AUTH_TOKEN|NPM_TOKEN/);
  });

  it("enforces npm contents, all-prebuild assembly, and excluded artifacts", async () => {
    const checker = await text("scripts/check-package.js");

    for (const required of [
      "README.md",
      "LICENSE",
      "THIRD_PARTY_NOTICES.md",
      "docs/api-mapping.md",
      "docs/lifecycle.md",
      "docs/migration-v1.md",
      "docs/platform-support.md",
      "docs/source-build.md",
      "vendor/libraw-0.22.2/LICENSE.CDDL",
      "vendor/libraw-0.22.2/COPYRIGHT",
    ]) {
      expect(checker).toContain(`\"${required}\"`);
    }

    for (const target of [
      "prebuilds/linux-x64/lightdrift-libraw.node",
      "prebuilds/linux-arm64/lightdrift-libraw.node",
      "prebuilds/darwin-x64/lightdrift-libraw.node",
      "prebuilds/darwin-arm64/lightdrift-libraw.node",
      "prebuilds/win32-x64/lightdrift-libraw.node",
    ]) {
      expect(checker).toContain(target);
    }
    expect(checker).toContain('process.env.REQUIRE_ALL_PREBUILDS === "1"');
    expect(checker).toContain('file.startsWith("sample-images/")');
    expect(checker).toContain('file.startsWith("output/")');
    expect(checker).toContain('file.startsWith("test/")');
  });

  it("keeps all required stable documentation and policy statements", async () => {
    const [readme, docsHub, mapping, lifecycle, migration, platform, sourceBuild, notices, releaseNotes] =
      await Promise.all([
        text("README.md"),
        text("docs/README.md"),
        text("docs/api-mapping.md"),
        text("docs/lifecycle.md"),
        text("docs/migration-v1.md"),
        text("docs/platform-support.md"),
        text("docs/source-build.md"),
        text("THIRD_PARTY_NOTICES.md"),
        text("docs/releases/1.0.0-rc.1.md"),
      ]);

    expect(readme).toContain("deterministic heuristic");
    expect(readme).toContain("does not claim streaming support");
    expect(mapping).toContain("api/libraw-0.22.2.json");
    expect(lifecycle).toContain("close()` waits for queued work");
    expect(lifecycle).toContain("buffered inside the processor worker");
    expect(migration).toContain("lightdrift-libraw/legacy");
    expect(migration).toContain("removed in v2");
    expect(platform).toContain("Node.js 20");
    expect(platform).toContain("Alpine/musl");
    expect(platform).toContain("resource limits remain unchanged");
    expect(sourceBuild).toContain("vendor/libraw-0.22.2");
    expect(sourceBuild).toContain("vendor/zlib-1.3.2");
    expect(notices).toContain("LibRaw 0.22.2");
    expect(notices).toContain("zlib 1.3.2");
    expect(docsHub).toContain("releases/1.0.0-rc.1.md");
    expect(releaseNotes).toContain("1.0.0-rc.1");
    expect(releaseNotes).toContain("Promotion gates");
  });

  it("uses assertion-based stable gates instead of console diagnostics", async () => {
    const manifest = JSON.parse(await text("package.json"));

    expect(manifest.scripts.test).toBe("vitest run");
    expect(manifest.scripts["test:stable"]).toContain("vitest run");
    expect(manifest.scripts["test:legacy"]).toContain("vitest run");
    expect(manifest.scripts["test:formats"]).toContain("vitest run");
    expect(manifest.scripts["test:queue"]).toContain("vitest run");
  });
});
