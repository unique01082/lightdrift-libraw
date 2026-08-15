import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import LibRaw, { LibRawError } from "../../lib/stable/index";

const fixtures = [
  fileURLToPath(new URL("../../sample-images/DSCF4042.RAF", import.meta.url)),
  fileURLToPath(new URL("../../sample-images/P1020180.RW2", import.meta.url)),
];

describe("batch workflows", () => {
  it("limits concurrency and preserves input order", async () => {
    const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "lightdrift-batch-"));
    try {
      const results = await LibRaw.batchConvertToJPEGParallel(
        fixtures,
        outputDirectory,
        { width: 32, maxConcurrency: 2 },
      );

      expect(results).toHaveLength(fixtures.length);
      for (let index = 0; index < fixtures.length; index++) {
        const output = path.join(
          outputDirectory,
          `${path.basename(fixtures[index]!, path.extname(fixtures[index]!))}.jpg`,
        );
        await expect(readFile(output)).resolves.toEqual(results[index]!.data);
      }
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });

  it("normalizes setup failures before any processor is created", async () => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), "lightdrift-batch-error-"));
    const outputFile = path.join(temporary, "not-a-directory");
    await writeFile(outputFile, "occupied");

    try {
      const conversion = LibRaw.batchConvertToJPEGParallel(
        fixtures,
        outputFile,
        { width: 32, maxConcurrency: 2 },
      );
      await expect(conversion).rejects.toBeInstanceOf(LibRawError);
      await expect(conversion).rejects.toMatchObject({
        operation: "batchConvertToJPEGParallel",
        state: "idle",
        cause: expect.any(Error),
      });
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
});
