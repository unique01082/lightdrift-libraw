import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

const betaContract = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../api/beta-contract.json", import.meta.url)),
    "utf8",
  ),
) as { instanceMethods: string[]; staticMethods: string[] };

describe("legacy compatibility entry point", () => {
  it("preserves the complete beta method surface", async () => {
    const { default: LegacyLibRaw } = await import("../../lib/stable/legacy");

    for (const name of betaContract.instanceMethods) {
      expect(LegacyLibRaw.prototype, name).toHaveProperty(name);
    }
    for (const name of betaContract.staticMethods) {
      expect(LegacyLibRaw, name).toHaveProperty(name);
    }
  });

  it("emits at most one deprecation warning per process", async () => {
    const warning = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
    const warningKey = Symbol.for("lightdrift-libraw.legacy-warning-emitted");
    delete (globalThis as Record<PropertyKey, unknown>)[warningKey];
    const localRequire = createRequire(import.meta.url);
    const LegacyCjs = localRequire(
      fileURLToPath(new URL("../../lib/legacy.cjs", import.meta.url)),
    ) as new () => { close(): Promise<unknown> };
    const { default: LegacyEsm } = await import("../../dist/legacy.mjs");
    const one = new LegacyCjs();
    const two = new LegacyEsm();
    expect((one as unknown as { versionNumber(): number[] }).versionNumber()).toEqual([
      0, 22, 2,
    ]);
    await Promise.all([one.close(), two.close()]);

    expect(warning).toHaveBeenCalledTimes(1);
    warning.mockRestore();
  });
});
