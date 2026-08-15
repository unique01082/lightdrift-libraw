const assert = require("node:assert/strict");
const {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ELECTRON_VERSION = "36.9.5";
const tarballArgument = process.argv[2];

if (!tarballArgument) {
  console.error("Usage: node scripts/test-electron-consumer.js <package.tgz>");
  process.exit(2);
}

const tarball = path.resolve(tarballArgument);
const temporary = mkdtempSync(path.join(tmpdir(), "lightdrift-electron-"));
const npmCache = path.join(temporary, "npm-cache");
mkdirSync(npmCache);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: temporary,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: npmCache,
      npm_config_engine_strict: "false",
      ...options.env,
    },
    shell: process.platform === "win32" && command === "npm",
  });

  if (result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || result.error?.stack || "");
    process.exit(result.status || 1);
  }

  return result.stdout.trim();
}

try {
  copyFileSync(tarball, path.join(temporary, "package.tgz"));
  writeFileSync(
    path.join(temporary, "package.json"),
    JSON.stringify({
      name: "lightdrift-electron-consumer",
      private: true,
      dependencies: {
        electron: ELECTRON_VERSION,
        "lightdrift-libraw": "file:./package.tgz",
      },
    }),
  );

  // Skip every package lifecycle so this gate can only use the shipped native
  // prebuild. Electron's download step is then invoked explicitly.
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
  const electronInstall = require.resolve("electron/install.js", {
    paths: [temporary],
  });
  run(process.execPath, [electronInstall]);

  writeFileSync(
    path.join(temporary, "smoke.cjs"),
    `const assert = require("node:assert/strict");
const { LibRaw } = require("lightdrift-libraw");

(async () => {
  assert.equal(process.versions.electron, "${ELECTRON_VERSION}");
  assert.match(process.versions.node, /^22\\./);
  assert.equal(LibRaw.version(), "0.22.2");
  const processor = new LibRaw();
  await processor.close();
  console.log(JSON.stringify({
    electron: process.versions.electron,
    node: process.versions.node,
    napi: process.versions.napi,
    libraw: LibRaw.version(),
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
`,
  );

  const electronCli = require.resolve("electron/cli.js", {
    paths: [temporary],
  });
  const output = run(process.execPath, [electronCli, "smoke.cjs"], {
    env: { ELECTRON_RUN_AS_NODE: "1" },
  });
  const result = JSON.parse(output.split(/\r?\n/).at(-1));

  assert.equal(result.electron, ELECTRON_VERSION);
  assert.equal(result.libraw, "0.22.2");
  console.log(
    `Electron ${result.electron} consumer OK on ${process.platform}-${process.arch} (Node ${result.node}, N-API ${result.napi}).`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
