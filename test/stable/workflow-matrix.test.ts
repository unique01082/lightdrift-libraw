import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import LibRaw from "../../lib/stable/index";
import type { EncodedImageResult } from "../../lib/stable/types";

const nef = fileURLToPath(
  new URL("../fixtures/raw/nikon-d40.nef", import.meta.url),
);

const resultKeys = [
  "channels",
  "data",
  "format",
  "height",
  "processingTimeMs",
  "size",
  "source",
  "width",
];

function expectUnifiedResult(
  result: EncodedImageResult,
  format: EncodedImageResult["format"],
  source: EncodedImageResult["source"] = "processed",
) {
  expect(Object.keys(result).sort()).toEqual(resultKeys);
  expect(result).toMatchObject({
    data: expect.any(Buffer),
    format,
    width: expect.any(Number),
    height: expect.any(Number),
    channels: expect.any(Number),
    size: expect.any(Number),
    processingTimeMs: expect.any(Number),
    source,
  });
  expect(result.width).toBeGreaterThan(0);
  expect(result.height).toBeGreaterThan(0);
  expect(result.channels).toBeGreaterThan(0);
  expect(result.size).toBe(result.data.length);
  expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
}

describe("complete stable convenience workflow matrix", () => {
  it("encodes every advertised in-memory format through one render pipeline", async () => {
    const processor = new LibRaw();
    try {
      await processor.setOutputParams({ half_size: true });
      await processor.loadFile(nef);
      const results = await Promise.all([
        processor.createJPEGBuffer({ width: 48, quality: 75 }),
        processor.createPNGBuffer({ width: 48, compressionLevel: 6 }),
        processor.createTIFFBuffer({ width: 48 }),
        processor.createWebPBuffer({ width: 48, quality: 75 }),
        processor.createAVIFBuffer({ width: 48, quality: 60, effort: 1 }),
        processor.createPPMBuffer(),
      ]);
      const formats: EncodedImageResult["format"][] = [
        "jpeg",
        "png",
        "tiff",
        "webp",
        "avif",
        "ppm",
      ];
      for (let index = 0; index < results.length; index++) {
        expectUnifiedResult(results[index]!, formats[index]!);
      }

      expect(results[0]!.data.subarray(0, 2).toString("hex")).toBe("ffd8");
      expect(results[1]!.data.subarray(0, 8).toString("hex")).toBe(
        "89504e470d0a1a0a",
      );
      expect(["49492a00", "4d4d002a"]).toContain(
        results[2]!.data.subarray(0, 4).toString("hex"),
      );
      expect(results[3]!.data.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(results[3]!.data.subarray(8, 12).toString("ascii")).toBe("WEBP");
      expect(results[4]!.data.subarray(4, 8).toString("ascii")).toBe("ftyp");
      expect(results[5]!.data.subarray(0, 3).toString("ascii")).toBe("P6\n");
    } finally {
      await processor.close();
    }
  }, 120_000);

  it("writes every JPEG conversion variant and preserves multi-size order", async () => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), "lightdrift-workflows-"));
    const processor = new LibRaw();
    try {
      await processor.setOutputParams({ half_size: true });
      await processor.loadFile(nef);

      const regularPath = path.join(temporary, "regular.jpg");
      const fastPath = path.join(temporary, "fast.jpg");
      const regular = await processor.convertToJPEG(regularPath, { width: 40 });
      const fast = await processor.convertToJPEGFast(fastPath, { width: 36 });
      expectUnifiedResult(regular, "jpeg");
      expectUnifiedResult(fast, "jpeg");
      await expect(readFile(regularPath)).resolves.toEqual(regular.data);
      await expect(readFile(fastPath)).resolves.toEqual(fast.data);

      const base = path.join(temporary, "multi");
      const multi = await processor.convertToJPEGMultiSize(base, {
        sizes: [
          { name: "small", width: 24, quality: 70 },
          { name: "large", width: 48, quality: 80 },
        ],
      });
      expect(Object.keys(multi)).toEqual(["small", "large"]);
      expectUnifiedResult(multi.small!, "jpeg");
      expectUnifiedResult(multi.large!, "jpeg");
      await expect(readFile(`${base}_small.jpg`)).resolves.toEqual(multi.small!.data);
      await expect(readFile(`${base}_large.jpg`)).resolves.toEqual(multi.large!.data);
    } finally {
      await processor.close();
      await rm(temporary, { recursive: true, force: true });
    }
  }, 120_000);

  it("covers embedded and processed thumbnail paths for every advertised format", async () => {
    const processor = new LibRaw();
    try {
      const embedded = await processor.processRawThumbnail({
        filePath: nef,
        format: "jpeg",
        maxSize: 48,
      });
      expectUnifiedResult(embedded, "jpeg", "embedded-thumbnail");

      const jpegProcessed = await processor.processRawThumbnail({
        filePath: nef,
        format: "jpeg",
        maxSize: 40,
        tryEmbedded: false,
      });
      const png = await processor.processRawThumbnail({
        filePath: nef,
        format: "png",
        maxSize: 36,
      });
      const webp = await processor.processRawThumbnail({
        filePath: nef,
        format: "webp",
        maxSize: 32,
      });
      expectUnifiedResult(jpegProcessed, "jpeg");
      expectUnifiedResult(png, "png");
      expectUnifiedResult(webp, "webp");
    } finally {
      await processor.close();
    }
  }, 120_000);

  it("keeps the instance batch wrapper and every deterministic heuristic mode", async () => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), "lightdrift-instance-batch-"));
    const processor = new LibRaw();
    try {
      const batch = await processor.batchConvertToJPEG([nef, nef], temporary, {
        width: 24,
        maxConcurrency: 1,
      });
      expect(batch).toHaveLength(2);
      batch.forEach((result) => expectUnifiedResult(result, "jpeg"));

      await processor.loadFile(nef);
      for (const usage of ["web", "print", "archive"] as const) {
        const first = await processor.getOptimalJPEGSettings({ usage });
        const second = await processor.getOptimalJPEGSettings({ usage });
        expect(second).toEqual(first);
        expect(first.recommended.reasoning.join(" ").toLowerCase()).toContain(usage);
      }
    } finally {
      await processor.close();
      await rm(temporary, { recursive: true, force: true });
    }
  }, 120_000);
});
