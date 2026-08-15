const {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const temporary = mkdtempSync(path.join(tmpdir(), "lightdrift-consumer-"));
const npmCache = path.join(temporary, "npm-cache");
mkdirSync(npmCache);
const npm = "npm";

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: npmCache,
      npm_config_engine_strict: "false",
    },
    // Resolve npm's .cmd shim on Windows; Node executables continue to spawn
    // directly so their argument boundaries are preserved.
    shell: process.platform === "win32" && command === npm,
  });
  if (result.status !== 0) {
    const diagnostic =
      result.stdout ||
      result.stderr ||
      result.error?.stack ||
      `Command failed: ${command}\n`;
    process.stderr.write(diagnostic);
    process.exit(result.status || 1);
  }
}

try {
  copyFileSync(
    path.join(process.cwd(), "sample-images", "DSCF4042.RAF"),
    path.join(temporary, "fixture.raf"),
  );
  run(npm, ["pack", "--ignore-scripts", "--pack-destination", temporary], process.cwd());
  const tarball = path.join(
    temporary,
    readdirSync(temporary).find((file) => file.endsWith(".tgz")),
  );
  run(
    npm,
    ["install", "--ignore-scripts", "--no-package-lock", "--no-audit", tarball],
    temporary,
  );

  writeFileSync(
    path.join(temporary, "consumer.cjs"),
    `const { LibRaw } = require("lightdrift-libraw");
const LegacyLibRaw = require("lightdrift-libraw/legacy");

async function thumbnail(file) {
  const processor = new LibRaw();
  try {
    await processor.loadFile(file);
    return await processor.createThumbnailJPEGBuffer({ width: 64 });
  } finally {
    await processor.close();
  }
}

(async () => {
  if (LibRaw.version() !== "0.22.2") process.exit(2);
  const result = await thumbnail("fixture.raf");
  if (result.format !== "jpeg" || result.width > 64 || result.data[0] !== 0xff) {
    process.exit(3);
  }
  const legacy = new LegacyLibRaw();
  try {
    await legacy.loadFile("fixture.raf");
    const beta = await legacy.createJPEGBuffer({ width: 32 });
    if (beta.success !== true || !Buffer.isBuffer(beta.buffer)) process.exit(4);
  } finally {
    await legacy.close();
  }
  console.log("CJS migration consumer OK");
})().catch((error) => { console.error(error); process.exit(1); });
`,
  );
  writeFileSync(
    path.join(temporary, "consumer.mjs"),
    `import { LibRaw } from "lightdrift-libraw";
import LegacyLibRaw from "lightdrift-libraw/legacy";

const processor = new LibRaw({ flags: 0 });
try {
  await processor.openFile("fixture.raf");
  const beforeDecode = await processor.getImgData();
  await processor.unpack();
  const pixels = await processor.getRawImageBuffer();
  if (!beforeDecode.metadata || pixels.length === 0) process.exit(2);
} finally {
  await processor.close();
}

const legacy = new LegacyLibRaw();
await legacy.close();
console.log("ESM migration consumer OK");
`,
  );
  run(process.execPath, ["consumer.cjs"], temporary);
  run(process.execPath, ["consumer.mjs"], temporary);

  const typeRoot = path.dirname(path.dirname(require.resolve("@types/node/package.json")));
  const compiler = require.resolve("typescript/bin/tsc");
  writeFileSync(
    path.join(temporary, "legacy-consumer.cts"),
    `import Legacy = require("lightdrift-libraw/legacy");
const processor = new Legacy();
processor.adjustSizesInfoOnly();
processor.copyMemImage(Buffer.alloc(16), 4);
processor.getDecoderInfo();
processor.loadBayerData("sensor.raw", { width: 2, height: 2 });
processor.raw2ImageEx(false);
processor.setCancelFlag();
processor.versionNumber();
Legacy.batchConvertToJPEGParallel([], "output");
`,
  );
  writeFileSync(
    path.join(temporary, "legacy-consumer.mts"),
    `import Legacy from "lightdrift-libraw/legacy";
const processor = new Legacy();
processor.loadFile("photo.raf");
processor.unpack();
processor.createJPEGBuffer();
processor.clearCancelFlag();
processor.strerror(-1);
`,
  );
  writeFileSync(
    path.join(temporary, "stable-consumer.mts"),
    `import { LibRaw, type DecoderInfo, type MemoryImageFormat } from "lightdrift-libraw";
const processor = new LibRaw({ flags: 0 });
const decoder: Promise<DecoderInfo> = processor.getDecoderInfo();
const format: Promise<MemoryImageFormat> = processor.getMemImageFormat();
void decoder;
void format;
processor.on("dataError", ({ offset, file }) => { void offset; void file; });
`,
  );
  writeFileSync(
    path.join(temporary, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        typeRoots: [typeRoot],
      },
      include: [
        "legacy-consumer.cts",
        "legacy-consumer.mts",
        "stable-consumer.mts",
      ],
    }),
  );
  run(process.execPath, [compiler, "-p", "tsconfig.json"], temporary);
  console.log(`Tarball consumers OK on ${process.version} without install scripts.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
