import type { OperationOptions } from "./types";

export const forwardedOperations = [
  "errorCount", "recycleDatastream", "subtractBlack", "subtractBlackInternal",
  "raw2Image", "raw2ImageEx", "raw2ImageStart", "freeImage", "adjustMaximum",
  "adjustSizesInfoOnly", "adjustToRawInsetCrop", "setMakeFromIndex",
  "convertFloatToInt", "dcrawPpmTiffWriter", "dcrawThumbWriter",
  "getMemImageFormat", "colorAt", "filterColorAt", "fcol",
  "unpackFunctionName", "getDecoderInfo", "phaseOneSubtractBlack",
  "phaseOneCorrect", "adobeCoeff", "thumbOk",
  "isFujiRotated", "isSraw", "srawMidpoint", "isNikonSraw",
  "isCoolscanNef", "isJpegThumb", "isFloatingPoint", "haveFpData",
  "getMetadata", "getImageSize", "getAdvancedMetadata", "getLensInfo",
  "getColorInfo", "setOutputParams", "getOutputParams", "getLastError",
  "strerror", "writePPM", "writeTIFF", "writeThumbnail",
  "getRawImageBuffer",
] as const;

interface QueueTarget {
  enqueue<T>(
    name: string,
    values: unknown[],
    options?: OperationOptions,
  ): Promise<T>;
}

export function installForwardedOperations(
  prototype: object,
): void {
  for (const operation of forwardedOperations) {
    Object.defineProperty(prototype, operation, {
      configurable: true,
      value: function (this: QueueTarget, ...args: unknown[]) {
        const maybeOptions = args.at(-1);
        const options =
          maybeOptions &&
          typeof maybeOptions === "object" &&
          "signal" in maybeOptions
            ? (args.pop() as OperationOptions)
            : undefined;
        return this.enqueue(operation, args, options);
      },
    });
  }
}
