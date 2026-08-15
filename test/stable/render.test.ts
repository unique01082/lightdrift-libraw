import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import LibRaw, { LibRawError } from "../../lib/stable/index";

const raf = fileURLToPath(
  new URL("../../sample-images/DSCF4042.RAF", import.meta.url),
);

describe("Sharp render pipeline", () => {
  it("returns the unified stable result for an embedded thumbnail", async () => {
    const processor = new LibRaw();
    await processor.loadFile(raf);
    const result = await processor.createThumbnailJPEGBuffer({ width: 128 });

    expect(result).toMatchObject({
      data: expect.any(Buffer),
      format: "jpeg",
      width: expect.any(Number),
      height: expect.any(Number),
      channels: expect.any(Number),
      size: expect.any(Number),
      processingTimeMs: expect.any(Number),
      source: "embedded-thumbnail",
    });
    expect(result.data.subarray(0, 2).toString("hex")).toBe("ffd8");
    expect(result.size).toBe(result.data.length);
    expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(128);
    await processor.close();
  });

  it("returns deterministic, image-aware JPEG recommendations", async () => {
    const processor = new LibRaw();
    await processor.loadFile(raf);
    const first = await processor.getOptimalJPEGSettings({ usage: "web" });
    const second = await processor.getOptimalJPEGSettings({ usage: "web" });

    expect(second).toEqual(first);
    expect(first.recommended).toMatchObject({
      quality: expect.any(Number),
      progressive: true,
      mozjpeg: true,
      reasoning: expect.arrayContaining([
        "Web usage - optimized for loading speed",
      ]),
    });
    expect(first.imageAnalysis.dimensions.area).toBe(
      first.imageAnalysis.dimensions.width * first.imageAnalysis.dimensions.height,
    );
    await processor.close();
  });

  it("reuses an unpacked embedded thumbnail for repeated renders", async () => {
    const processor = new LibRaw();
    await processor.loadFile(raf);
    const [first, second] = await Promise.all([
      processor.createThumbnailJPEGBuffer({ width: 64 }),
      processor.createThumbnailJPEGBuffer({ width: 32 }),
    ]);

    expect(first.width).toBe(64);
    expect(second.width).toBe(32);
    await processor.close();
  });

  it("renders valid encoded and PPM output from 16-bit LibRaw samples", async () => {
    const processor = new LibRaw();
    await processor.setOutputParams({
      output_bps: 16,
      half_size: true,
      no_auto_bright: true,
    });
    await processor.loadFile(raf);

    const jpeg = await processor.createJPEGBuffer({ width: 32 });
    expect(jpeg.data.subarray(0, 2).toString("hex")).toBe("ffd8");

    const ppm = await processor.createPPMBuffer();
    const headerEnd = ppm.data.indexOf(Buffer.from("\n", "ascii"), 3);
    const maxValueEnd = ppm.data.indexOf(Buffer.from("\n", "ascii"), headerEnd + 1);
    expect(ppm.data.subarray(headerEnd + 1, maxValueEnd).toString("ascii")).toBe(
      "65535",
    );
    expect(ppm.data.length - maxValueEnd - 1).toBe(
      ppm.width * ppm.height * ppm.channels * 2,
    );
    await processor.close();
  });

  it("normalizes Sharp and filesystem workflow failures", async () => {
    const processor = new LibRaw();
    await processor.loadFile(raf);

    const encoding = processor.createJPEGBuffer({ quality: 101 });
    await expect(encoding).rejects.toBeInstanceOf(LibRawError);
    await expect(encoding).rejects.toMatchObject({
      operation: "createJPEGBuffer",
      state: "processed",
      cause: expect.any(Error),
    });

    const writing = processor.convertToJPEG(
      "/definitely/missing/lightdrift/output.jpg",
      { width: 16 },
    );
    await expect(writing).rejects.toBeInstanceOf(LibRawError);
    await expect(writing).rejects.toMatchObject({
      operation: "convertToJPEG",
      cause: expect.any(Error),
    });
    await processor.close();
  });
});
