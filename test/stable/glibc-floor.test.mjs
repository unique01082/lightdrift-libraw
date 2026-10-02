import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../../scripts/check-glibc-floor.js", import.meta.url));

describe("Linux prebuild compatibility gate", () => {
  it("rejects a missing directory instead of silently passing", () => {
    const temporary = mkdtempSync(path.join(tmpdir(), "glibc-floor-"));
    try {
      const result = spawnSync(process.execPath, [script, path.join(temporary, "missing")], { encoding: "utf8" });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("No prebuilds directory");
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("rejects a directory without any Linux ELF addons", () => {
    const temporary = mkdtempSync(path.join(tmpdir(), "glibc-floor-"));
    try {
      writeFileSync(path.join(temporary, "invalid.node"), "not an ELF binary");
      const result = spawnSync(process.execPath, [script, temporary], { encoding: "utf8" });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("No ELF .node files found");
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });
});
