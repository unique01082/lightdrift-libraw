#!/usr/bin/env node
"use strict";

// Installs the packed tarball with --ignore-scripts (prebuild-only, no
// compiler) and decodes a RAW fixture. Run from inside an Amazon Linux 2023
// container to catch glibc-floor regressions like
// https://github.com/unique01082/lightdrift-libraw/issues/8.
const { mkdtempSync, copyFileSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const assert = require("node:assert/strict");

assert.equal(process.platform, "linux");
assert.equal(process.report.getReport().header.glibcVersionRuntime, "2.34");
if (process.env.EXPECTED_ARCH) assert.equal(process.arch, process.env.EXPECTED_ARCH);
if (process.env.EXPECTED_NODE) {
  assert.equal(process.versions.node.split(".")[0], process.env.EXPECTED_NODE);
}
console.log(`Lambda consumer: Node ${process.version}, ${process.arch}, glibc 2.34`);

const [, , tarballPath, fixturePath] = process.argv;
if (!tarballPath || !fixturePath) {
  console.error("Usage: test-al2023-consumer.cjs <tarball> <raw-fixture>");
  process.exit(1);
}

function run(command, args, cwd, env) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", env });
  if (result.status !== 0) {
    throw result.error || new Error(`${command} failed with exit status ${result.status}`);
  }
}

const work = mkdtempSync(path.join(tmpdir(), "al2023-consumer-"));
try {
  copyFileSync(path.resolve(tarballPath), path.join(work, "package.tgz"));
  copyFileSync(path.resolve(fixturePath), path.join(work, "fixture.raf"));
  run("npm", ["init", "-y"], work, process.env);
  run("npm", ["install", "--ignore-scripts", "--no-audit", "package.tgz"], work, {
    ...process.env,
    npm_config_engine_strict: "false",
  });

  writeFileSync(
    path.join(work, "consumer.cjs"),
    `const assert = require("node:assert/strict");
const path = require("node:path");
const { LibRaw } = require("lightdrift-libraw");
const sharp = require("sharp");
const packageRoot = path.dirname(require.resolve("lightdrift-libraw/package.json"));
const binary = require("node-gyp-build").path(packageRoot);
assert.equal(binary, path.join(packageRoot, "prebuilds", "linux-" + process.arch, "lightdrift-libraw.node"));

(async () => {
  assert.equal(LibRaw.version(), "0.22.2");
  const processor = new LibRaw();
  try {
    await processor.loadFile("fixture.raf");
    const thumb = await processor.createThumbnailJPEGBuffer({ width: 64 });
    assert.equal(thumb.format, "jpeg");
    assert.ok(Buffer.isBuffer(thumb.data));
    const metadata = await sharp(thumb.data).metadata();
    assert.equal(metadata.format, "jpeg");
    assert.ok(metadata.width > 0 && metadata.width <= 64);
    assert.ok(metadata.height > 0);
  } finally {
    await processor.close();
  }
  console.log("Amazon Linux 2023 prebuilt consumer OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
`,
  );
  run(process.execPath, ["consumer.cjs"], work, process.env);
} finally {
  rmSync(work, { recursive: true, force: true });
}
