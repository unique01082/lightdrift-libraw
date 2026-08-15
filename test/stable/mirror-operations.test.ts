import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import LibRaw, { LibRawError } from "../../lib/stable/index";
import manifest from "../../api/libraw-0.22.2.json";

const nef = fileURLToPath(
  new URL("../fixtures/raw/nikon-d40.nef", import.meta.url),
);

async function allowCameraSpecificFailure<T>(operation: Promise<T>): Promise<T | undefined> {
  try {
    return await operation;
  } catch (error) {
    expect(error).toBeInstanceOf(LibRawError);
    expect(error).not.toMatchObject({ code: "UNSUPPORTED_OPERATION" });
    return undefined;
  }
}

describe("complete safe LibRaw 0.22.2 mirror", () => {
  it("executes every supported manifest entry through its public contract", async () => {
    const executed = new Set<string>();
    const run = async <T>(name: string, operation: () => T | Promise<T>) => {
      executed.add(name);
      return operation();
    };
    const temporary = await mkdtemp(path.join(os.tmpdir(), "lightdrift-mirror-"));
    const input = await readFile(nef);

    try {
      const constructor = await run("constructor", async () => new LibRaw({ flags: 0 }));
      await constructor.close();

      expect(await run("version", () => LibRaw.version())).toBe("0.22.2");
      expect(await run("versionNumber", () => LibRaw.versionNumber())).toBe(0x001602);
      expect(await run("capabilities", () => LibRaw.capabilities())).toBeTypeOf("number");
      const cameras = await run("cameraList", () => LibRaw.cameraList());
      expect(cameras.length).toBeGreaterThan(0);
      expect(await run("cameraCount", () => LibRaw.cameraCount())).toBe(cameras.length);
      expect(await run("strProgress", () => LibRaw.strProgress(1))).toBeTypeOf("string");
      expect(await run("strError", () => LibRaw.strError(-1))).toBeTypeOf("string");
      expect(
        await run("cameraMakerIndexToMaker", () =>
          LibRaw.cameraMakerIndexToMaker(0),
        ),
      ).toSatisfy((value) => value === null || typeof value === "string");
      expect(
        await run("simplifyMakeModel", () =>
          LibRaw.simplifyMakeModel(0, "NIKON CORPORATION", "NIKON D40"),
        ),
      ).toMatchObject({ makerIndex: expect.any(Number), make: expect.any(String) });
      expect(await run("powfLimited", () => LibRaw.powfLimited(2, 3, 4))).toBe(8);
      expect(await run("powf64Limited", () => LibRaw.powf64Limited(2, 3))).toBe(8);
      expect(
        await run("readBigEndianUnsigned", () =>
          LibRaw.readBigEndianUnsigned(4, Uint8Array.from([0x12, 0x34, 0x56, 0x78])),
        ),
      ).toBe(0x12345678);

      const header = new LibRaw();
      await run("openFile", () => header.openFile(nef));
      expect(await run("getImgData", () => header.getImgData())).toMatchObject({
        metadata: { make: expect.stringMatching(/NIKON/i) },
      });
      expect(await run("errorCount", () => header.errorCount())).toBeGreaterThanOrEqual(0);
      await run("unpack", () => header.unpack());
      expect(await run("isFujiRotated", () => header.isFujiRotated())).toBeTypeOf("boolean");
      expect(await run("isSraw", () => header.isSraw())).toBeTypeOf("boolean");
      expect(await run("srawMidpoint", () => header.srawMidpoint())).toBeTypeOf("number");
      expect(await run("isNikonSraw", () => header.isNikonSraw())).toBeTypeOf("boolean");
      expect(await run("isCoolscanNef", () => header.isCoolscanNef())).toBeTypeOf("boolean");
      expect(await run("isJpegThumb", () => header.isJpegThumb())).toBeTypeOf("boolean");
      expect(await run("isFloatingPoint", () => header.isFloatingPoint())).toBeTypeOf("boolean");
      expect(await run("haveFpData", () => header.haveFpData())).toBeTypeOf("boolean");
      expect(await run("colorAt", () => header.colorAt(0, 0))).toBeTypeOf("number");
      expect(await run("filterColorAt", () => header.filterColorAt(0, 0))).toBeTypeOf("number");
      expect(await run("fcol", () => header.fcol(0, 0))).toBeTypeOf("number");
      expect(await run("unpackFunctionName", () => header.unpackFunctionName())).toBeTypeOf("string");
      expect(await run("getDecoderInfo", () => header.getDecoderInfo())).toMatchObject({
        decoder_name: expect.any(String),
        decoder_flags: expect.any(Number),
      });
      await run("setMakeFromIndex", () => header.setMakeFromIndex(0));
      await run("adobeCoeff", () =>
        allowCameraSpecificFailure(header.adobeCoeff(0, "NIKON D40", true)),
      );
      await run("recycleDatastream", () => header.recycleDatastream());
      await run("recycle", () => header.recycle());
      await run("close", () => header.close());

      // LibRaw documents adjust_sizes_info_only() as an alternative sizing path.
      // It advances processing flags, so following it with unpack() is out of order.
      const sizing = new LibRaw();
      await sizing.openFile(nef);
      await run("adjustSizesInfoOnly", () => sizing.adjustSizesInfoOnly());
      await sizing.close();

      const bufferInput = new LibRaw();
      await run("openBuffer", () => bufferInput.openBuffer(input));
      await bufferInput.unpack();
      await bufferInput.close();

      // LibRaw rejects synthetic Bayer dimensions below 22x22.
      const bayerWidth = 32;
      const bayerHeight = 32;
      const bayerData = Buffer.alloc(bayerWidth * bayerHeight * 2);
      for (let index = 0; index < bayerWidth * bayerHeight; index++) {
        bayerData.writeUInt16LE((index * 17) % 4096, index * 2);
      }
      const bayer = new LibRaw();
      await run("openBayer", () =>
        bayer.openBayer(bayerData, { width: bayerWidth, height: bayerHeight }),
      );
      await bayer.unpack();
      const rawPixels = await bayer.getRawImageBuffer();
      const phaseOne = await run("phaseOneSubtractBlack", () =>
        allowCameraSpecificFailure(bayer.phaseOneSubtractBlack(rawPixels)),
      );
      if (phaseOne) expect(Buffer.isBuffer(phaseOne)).toBe(true);
      await bayer.close();

      const thumbnail = new LibRaw();
      await thumbnail.loadFile(nef);
      await run("unpackThumb", () => thumbnail.unpackThumb());
      expect(await run("thumbOk", () => thumbnail.thumbOk())).toBeTypeOf("number");
      expect(await run("dcrawMakeMemThumb", () => thumbnail.dcrawMakeMemThumb())).toMatchObject({
        data: expect.any(Buffer),
      });
      await run("dcrawThumbWriter", () =>
        thumbnail.dcrawThumbWriter(path.join(temporary, "thumbnail.jpg")),
      );
      await thumbnail.close();

      const indexedThumbnail = new LibRaw();
      await indexedThumbnail.loadFile(nef);
      await run("unpackThumbEx", () => indexedThumbnail.unpackThumbEx(0));
      await indexedThumbnail.close();

      const raw = new LibRaw();
      await raw.loadFile(nef);
      await run("setCancelFlag", () => raw.setCancelFlag());
      await run("clearCancelFlag", () => raw.clearCancelFlag());
      await run("adjustToRawInsetCrop", () =>
        allowCameraSpecificFailure(raw.adjustToRawInsetCrop(0, 0)),
      );
      await run("convertFloatToInt", () =>
        allowCameraSpecificFailure(raw.convertFloatToInt()),
      );
      await run("raw2ImageStart", () => raw.raw2ImageStart());
      await run("raw2Image", () => allowCameraSpecificFailure(raw.raw2Image()));
      await run("subtractBlack", () => raw.subtractBlack());
      await run("subtractBlackInternal", () => raw.subtractBlackInternal());
      await run("adjustMaximum", () => raw.adjustMaximum());
      await run("freeImage", () => raw.freeImage());
      await raw.recycle();
      await raw.loadFile(nef);
      await run("raw2ImageEx", () => allowCameraSpecificFailure(raw.raw2ImageEx(true)));
      await raw.recycle();
      await raw.loadFile(nef);
      await run("phaseOneCorrect", () =>
        allowCameraSpecificFailure(raw.phaseOneCorrect()),
      );
      await raw.recycle();
      await raw.loadFile(nef);
      await run("dcrawProcess", () => raw.dcrawProcess());
      const format = await run("getMemImageFormat", () => raw.getMemImageFormat());
      expect(format).toMatchObject({
        width: expect.any(Number),
        height: expect.any(Number),
        colors: expect.any(Number),
        bps: expect.any(Number),
      });
      const stride = format.width * format.colors * (format.bps / 8);
      await run("copyMemImage", () =>
        raw.copyMemImage(Buffer.alloc(stride * format.height), stride),
      );
      expect(await run("dcrawMakeMemImage", () => raw.dcrawMakeMemImage())).toMatchObject({
        data: expect.any(Buffer),
      });
      await run("dcrawPpmTiffWriter", () =>
        raw.dcrawPpmTiffWriter(path.join(temporary, "processed.ppm")),
      );
      await raw.close();

      const callbackProcessor = new LibRaw();
      const counts = { progress: 0, exifTag: 0, makerNote: 0 };
      callbackProcessor.on("progress", () => counts.progress++);
      callbackProcessor.on("exifTag", () => counts.exifTag++);
      callbackProcessor.on("makerNote", () => counts.makerNote++);
      for (const name of ["progress", "exifTag", "makerNote"] as const) {
        executed.add(name);
      }
      await callbackProcessor.loadFile(nef);
      expect(counts).toMatchObject({
        progress: expect.any(Number),
        exifTag: expect.any(Number),
        makerNote: expect.any(Number),
      });
      expect(counts.progress).toBeGreaterThan(0);
      expect(counts.exifTag).toBeGreaterThan(0);
      expect(counts.makerNote).toBeGreaterThan(0);
      await callbackProcessor.close();

      const truncated = new LibRaw();
      const dataErrors: Array<{ offset: number; file: string }> = [];
      truncated.on("dataError", (event) => dataErrors.push(event));
      executed.add("dataError");
      await expect(
        truncated.loadBuffer(input.subarray(0, Math.floor(input.length * 0.9))),
      ).rejects.toBeInstanceOf(LibRawError);
      expect(dataErrors[0]).toEqual({ offset: expect.any(Number), file: expect.any(String) });
      await truncated.close();

      const supported = new Set(
        manifest.operations
          .filter((operation) => operation.status === "supported")
          .map((operation) => operation.jsName),
      );
      expect([...supported].filter((name) => !executed.has(name!))).toEqual([]);
      expect([...executed].filter((name) => !supported.has(name))).toEqual([]);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }, 120_000);
});
