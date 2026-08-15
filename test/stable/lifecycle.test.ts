import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import LibRaw, { LibRawError } from "../../lib/stable/index";

const raf = fileURLToPath(
  new URL("../../sample-images/DSCF4042.RAF", import.meta.url),
);

describe("stable lifecycle", () => {
  it("allows output parameters to be configured before opening input", async () => {
    const processor = new LibRaw();
    await processor.setOutputParams({
      output_bps: 8,
      no_auto_bright: true,
      half_size: true,
      use_camera_wb: true,
      threshold: 1.25,
      gamma: [2.2, 4.5, 0, 0, 0, 0],
    });
    await expect(processor.getOutputParams()).resolves.toMatchObject({
      output_bps: 8,
      no_auto_bright: true,
      half_size: true,
      use_camera_wb: true,
      threshold: 1.25,
      gamma: [2.2, 4.5, 0, 0, 0, 0],
    });
    await processor.close();
  });

  it("rejects unsafe output bit depths before native allocation", async () => {
    const processor = new LibRaw();
    const before = await processor.getOutputParams();
    await expect(
      processor.setOutputParams({
        output_bps: 7,
        gamma: [9, 8, 7, 6, 5, 4],
      }),
    ).rejects.toMatchObject({ operation: "setOutputParams" });
    await expect(processor.getOutputParams()).resolves.toMatchObject({
      output_bps: before.output_bps,
      gamma: before.gamma,
    });
    await processor.close();
  });

  it("allows nullable output paths to clear owned native strings", async () => {
    const processor = new LibRaw();
    await processor.setOutputParams({ output_profile: "profile.icc" });
    await expect(processor.getOutputParams()).resolves.toMatchObject({
      output_profile: "profile.icc",
    });
    await processor.setOutputParams({ output_profile: null });
    await expect(processor.getOutputParams()).resolves.toMatchObject({
      output_profile: null,
    });
    await processor.close();
  });

  it("invalidates processed state when pixels or output parameters change", async () => {
    const processor = new LibRaw();
    await processor.setOutputParams({ half_size: true });
    await processor.loadFile(raf);
    await processor.createJPEGBuffer({ width: 32 });
    expect(processor.state).toBe("processed");

    await processor.freeImage();
    expect(processor.state).toBe("unpacked");
    await expect(processor.createJPEGBuffer({ width: 32 })).resolves.toMatchObject({
      format: "jpeg",
    });

    await processor.setOutputParams({ no_auto_bright: true });
    expect(processor.state).toBe("unpacked");
    await expect(processor.createJPEGBuffer({ width: 32 })).resolves.toMatchObject({
      format: "jpeg",
    });
    await processor.close();
  }, 60_000);

  it("keeps upstream openFile and unpack as distinct queued operations", async () => {
    const processor = new LibRaw();
    await processor.openFile(raf);
    expect(processor.state).toBe("opened");

    const opened = await processor.getImgData();
    expect(opened.metadata.make).toMatch(/FUJI/i);

    await processor.unpack();
    expect(processor.state).toBe("unpacked");
    await processor.close();
  });

  it("copies buffer input so it remains valid through unpack", async () => {
    const input = await readFile(raf);
    const processor = new LibRaw();
    await processor.openBuffer(input);
    input.fill(0);

    await expect(processor.unpack()).resolves.toBeUndefined();
    const snapshot = await processor.getImgData();
    expect(snapshot.sizes.width).toBeGreaterThan(0);
    await processor.close();
  });

  it("opens synthetic Bayer data and returns copied pixel memory", async () => {
    const width = 32;
    const height = 32;
    const input = Buffer.alloc(width * height * 2);
    for (let index = 0; index < width * height; index++) {
      input.writeUInt16LE((index * 31) % 4096, index * 2);
    }
    const processor = new LibRaw();
    await processor.openBayer(input, { width, height });
    input.fill(0);
    await processor.unpack();

    const first = await processor.getRawImageBuffer();
    expect(first.length).toBe(width * height * 2);
    expect(first.some((value) => value !== 0)).toBe(true);
    first.fill(0);
    const second = await processor.getRawImageBuffer();
    expect(second.some((value) => value !== 0)).toBe(true);
    await processor.close();
  });

  it("rejects a missing Bayer file without terminating the process", async () => {
    const processor = new LibRaw();
    await expect(
      processor.loadBayerData("/definitely/missing/lightdrift.raw", {
        width: 32,
        height: 32,
      }),
    ).rejects.toMatchObject({
      name: "LibRawError",
      operation: "loadBayerData",
    });
    await processor.close();
  });

  it("keeps the event loop responsive during native decode", async () => {
    const processor = new LibRaw();
    let ticks = 0;
    const timer = setInterval(() => ticks++, 1);
    await processor.loadFile(raf);
    clearInterval(timer);

    expect(ticks).toBeGreaterThan(0);
    await processor.close();
  });

  it("bridges native progress callbacks as instance events", async () => {
    const processor = new LibRaw();
    const events: Array<{ stage: number; iteration: number; expected: number }> = [];
    processor.on("progress", (event) => events.push(event));
    await processor.loadFile(raf);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toEqual({
      stage: expect.any(Number),
      iteration: expect.any(Number),
      expected: expect.any(Number),
    });
    await processor.close();
  });

  it("rejects undersized native copy buffers before LibRaw can write", async () => {
    const processor = new LibRaw();
    await processor.loadFile(raf);
    await processor.processImage();

    await expect(
      processor.copyMemImage(Buffer.alloc(1), 1),
    ).rejects.toMatchObject({ operation: "copyMemImage" });
    await expect(
      processor.phaseOneSubtractBlack(Buffer.alloc(2)),
    ).rejects.toMatchObject({ operation: "phaseOneSubtractBlack" });
    await processor.close();
  });

  it("normalizes malformed input failures", async () => {
    const processor = new LibRaw();
    await expect(processor.openBuffer(Buffer.from("not a raw file"))).rejects.toBeInstanceOf(
      LibRawError,
    );
    await processor.close();
  });

  it("returns to idle when a destructive convenience load fails", async () => {
    const processor = new LibRaw();
    await processor.loadFile(raf);

    await expect(
      processor.loadFile("/definitely/missing/replacement.raw"),
    ).rejects.toBeInstanceOf(LibRawError);
    expect(processor.state).toBe("idle");
    await expect(processor.getImgData()).rejects.toBeInstanceOf(LibRawError);
    await processor.close();
  });
});
