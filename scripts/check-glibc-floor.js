#!/usr/bin/env node
"use strict";

// Fails when a Linux prebuild needs a newer GLIBC/GLIBCXX symbol than the
// glibc 2.31 (Debian 11) build container guarantees. Regression guard for
// https://github.com/unique01082/lightdrift-libraw/issues/8 (AL2023 glibc 2.34).
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const MAX_GLIBC = [2, 31];
// Static-linked (see binding.gyp), so this should normally stay unmatched.
const MAX_GLIBCXX = [3, 4, 28];

function findNodeFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findNodeFiles(full));
    else if (entry.name.endsWith(".node")) out.push(full);
  }
  return out;
}

function isElf(file) {
  const fd = fs.openSync(file, "r");
  try {
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    return buf.toString("hex") === "7f454c46";
  } finally {
    fs.closeSync(fd);
  }
}

function compareVersions(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function maxRequiredVersion(file, prefix) {
  const output = execFileSync("objdump", ["-T", file], { encoding: "utf8" });
  const re = new RegExp(`\\b${prefix}_([0-9]+(?:\\.[0-9]+)+)\\b`, "g");
  let max = null;
  let match;
  while ((match = re.exec(output))) {
    const parts = match[1].split(".").map(Number);
    if (!max || compareVersions(parts, max) > 0) max = parts;
  }
  return max;
}

const targetDir = process.argv[2] || "prebuilds";
if (!fs.existsSync(targetDir)) {
  console.error(`No prebuilds directory at ${targetDir}; cannot verify Linux compatibility.`);
  process.exit(1);
}

const files = findNodeFiles(targetDir).filter(isElf);
if (files.length === 0) {
  console.error("No ELF .node files found; cannot verify Linux compatibility.");
  process.exit(1);
}

let failed = false;
for (const file of files) {
  const glibc = maxRequiredVersion(file, "GLIBC");
  const glibcxx = maxRequiredVersion(file, "GLIBCXX");
  console.log(
    `${file}: GLIBC <= ${glibc ? glibc.join(".") : "none"}, GLIBCXX <= ${
      glibcxx ? glibcxx.join(".") : "none"
    }`,
  );
  if (glibc && compareVersions(glibc, MAX_GLIBC) > 0) {
    console.error(`  FAIL: requires GLIBC_${glibc.join(".")}, floor is ${MAX_GLIBC.join(".")}`);
    failed = true;
  }
  if (glibcxx && compareVersions(glibcxx, MAX_GLIBCXX) > 0) {
    console.error(
      `  FAIL: requires GLIBCXX_${glibcxx.join(".")}, floor is ${MAX_GLIBCXX.join(".")}`,
    );
    failed = true;
  }
}

if (failed) {
  console.error(
    "\nRebuild inside the pinned container in .github/workflows (node:24-bullseye) so " +
      "prebuilds stay loadable on Amazon Linux 2023 (glibc 2.34) and similar runtimes. If the " +
      "floor changed intentionally, update MAX_GLIBC/MAX_GLIBCXX here and docs/platform-support.md.",
  );
  process.exit(1);
}

console.log("All Linux prebuilds are within the supported glibc/libstdc++ floor.");
