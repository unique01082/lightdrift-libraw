const { spawnSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");

const npmCache = mkdtempSync(path.join(tmpdir(), "lightdrift-package-cache-"));

const packed = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["pack", "--dry-run", "--json", "--ignore-scripts"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, npm_config_cache: npmCache },
  },
);
rmSync(npmCache, { recursive: true, force: true });

if (packed.status !== 0) {
  process.stderr.write(packed.stderr || packed.stdout);
  process.exit(packed.status || 1);
}

const report = JSON.parse(packed.stdout);
const files = new Set(report[0].files.map((entry) => entry.path));
const required = [
  "README.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "docs/api-mapping.md",
  "docs/lifecycle.md",
  "docs/migration-v1.md",
  "docs/platform-support.md",
  "docs/source-build.md",
  "dist/index.cjs",
  "dist/index.mjs",
  "dist/index.d.ts",
  "dist/legacy.cjs",
  "dist/legacy.mjs",
  "dist/legacy.d.ts",
  "dist/processor-worker.cjs",
  "lib/index.d.ts",
  "lib/legacy.cjs",
  "lib/legacy.d.mts",
  "binding.gyp",
  "api/libraw-0.22.2.json",
  "vendor/libraw-0.22.2/COPYRIGHT",
  "vendor/libraw-0.22.2/LICENSE.CDDL",
  "vendor/libraw-0.22.2/LICENSE.LGPL",
  "vendor/zlib-1.3.2/LICENSE",
];

const missing = required.filter((file) => !files.has(file));
const forbidden = [...files].filter(
  (file) =>
    file.startsWith("sample-images/") ||
    file.startsWith("output/") ||
    file.startsWith("test/") ||
    file.includes("-output/"),
);
const prebuilds = [...files].filter(
  (file) => file.startsWith("prebuilds/") && file.endsWith(".node"),
);
const requiredPrebuilds = [
  "prebuilds/linux-x64/lightdrift-libraw.node",
  "prebuilds/linux-arm64/lightdrift-libraw.node",
  "prebuilds/darwin-x64/lightdrift-libraw.node",
  "prebuilds/darwin-arm64/lightdrift-libraw.node",
  "prebuilds/win32-x64/lightdrift-libraw.node",
];
const missingPrebuilds =
  process.env.REQUIRE_ALL_PREBUILDS === "1"
    ? requiredPrebuilds.filter((file) => !files.has(file))
    : [];

if (
  missing.length ||
  forbidden.length ||
  prebuilds.length === 0 ||
  missingPrebuilds.length
) {
  if (missing.length) console.error("Missing package files:", missing);
  if (forbidden.length) console.error("Forbidden package files:", forbidden);
  if (prebuilds.length === 0) console.error("No Node-API prebuilt binary found");
  if (missingPrebuilds.length) {
    console.error("Missing target prebuilds:", missingPrebuilds);
  }
  process.exit(1);
}

console.log(
  `Package content OK: ${files.size} files, ${prebuilds.length} prebuilt binary.`,
);
