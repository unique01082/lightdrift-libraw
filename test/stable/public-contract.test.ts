import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import LibRaw, { LibRawError } from "../../lib/stable/index";

const manifest = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../api/libraw-0.22.2.json", import.meta.url)),
    "utf8",
  ),
) as {
  operations: Array<{
    jsName: string | null;
    status: "supported" | "excluded";
  }>;
};

const eventNames = new Set(["progress", "dataError", "exifTag", "makerNote"]);
const staticNames = new Set([
  "cameraMakerIndexToMaker",
  "simplifyMakeModel",
  "capabilities",
  "version",
  "versionNumber",
  "cameraList",
  "cameraCount",
  "strProgress",
  "strError",
  "powfLimited",
  "powf64Limited",
  "readBigEndianUnsigned",
]);

describe("stable public contract", () => {
  it("exposes every supported parity-manifest operation", () => {
    for (const operation of manifest.operations) {
      if (operation.status !== "supported" || !operation.jsName) continue;
      if (eventNames.has(operation.jsName)) continue;

      const owner = staticNames.has(operation.jsName)
        ? LibRaw
        : LibRaw.prototype;
      expect(owner, operation.jsName).toHaveProperty(operation.jsName);
      expect(typeof (owner as unknown as Record<string, unknown>)[operation.jsName]).toBe(
        "function",
      );
    }
  });

  it("is an EventEmitter and exposes synchronous static helpers", async () => {
    const processor = new LibRaw({ flags: 0 });
    expect(processor).toBeInstanceOf(EventEmitter);
    expect(LibRaw.version()).toBe("0.22.2");
    expect(LibRaw.versionNumber()).toBe(0x001602);
    expect(LibRaw.capabilities()).toBeTypeOf("number");
    expect(LibRaw.cameraList().length).toBeGreaterThan(0);
    await processor.close();
  });

  it("retains every beta convenience workflow on the stable root", () => {
    for (const method of [
      "createJPEGBuffer",
      "createPNGBuffer",
      "createTIFFBuffer",
      "createWebPBuffer",
      "createAVIFBuffer",
      "createPPMBuffer",
      "createThumbnailJPEGBuffer",
      "convertToJPEG",
      "convertToJPEGFast",
      "convertToJPEGMultiSize",
      "batchConvertToJPEG",
      "getOptimalJPEGSettings",
      "processRawThumbnail",
    ]) {
      expect(LibRaw.prototype, method).toHaveProperty(method);
    }
    expect(LibRaw).toHaveProperty("batchConvertToJPEGParallel");
    expect(LibRaw.prototype).toHaveProperty("getRawImageBuffer");
  });

  it("makes close idempotent and permanently rejects later operations", async () => {
    const processor = new LibRaw();
    await expect(processor.close()).resolves.toBeUndefined();
    await expect(processor.close()).resolves.toBeUndefined();
    await expect(processor.recycle()).rejects.toMatchObject({
      name: "LibRawError",
      code: "INSTANCE_CLOSED",
      operation: "recycle",
      librawCode: null,
      state: "closed",
    });
  });

  it("rejects a pre-aborted operation with a typed error", async () => {
    const processor = new LibRaw();
    const controller = new AbortController();
    controller.abort(new Error("stop"));

    const rejection = processor.openBuffer(Buffer.from("not raw"), {
      signal: controller.signal,
    });
    await expect(rejection).rejects.toBeInstanceOf(LibRawError);
    await expect(rejection).rejects.toMatchObject({
      code: "ABORT_ERR",
      operation: "openBuffer",
      state: "idle",
    });
    await processor.close();
  });
});
