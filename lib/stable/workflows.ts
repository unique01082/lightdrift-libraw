import os from "node:os";

import { LibRawError } from "./errors";
import type { MetadataSnapshot } from "./metadata";
import type {
  EncodedImageResult,
  JPEGUsage,
  OperationOptions,
  OptimalJPEGSettings,
  ProcessedImage,
  ProcessorState,
} from "./types";

export interface RenderOptions extends OperationOptions {
  width?: number;
  height?: number;
  quality?: number;
  compressionLevel?: number;
  effort?: number;
  progressive?: boolean;
  mozjpeg?: boolean;
  chromaSubsampling?: string;
  optimizeCoding?: boolean;
  trellisQuantisation?: boolean;
  optimizeScans?: boolean;
}

export function sharpInput(
  image: ProcessedImage,
  operation: string,
  state: ProcessorState,
): Buffer {
  if (image.type === 1) return image.data;
  if (image.bits !== 8 && image.bits !== 16) {
    throw new LibRawError(`Unsupported encoded-image bit depth: ${image.bits}`, {
      code: "UNSUPPORTED_OUTPUT_BPS",
      operation,
      state,
    });
  }
  if (image.bits === 8) return image.data;

  const samples = image.width * image.height * image.colors;
  if (image.data.length < samples * 2) {
    throw new LibRawError("Processed 16-bit image Buffer is truncated", {
      code: "INVALID_PROCESSED_IMAGE",
      operation,
      state,
    });
  }
  const output = Buffer.allocUnsafe(samples);
  const highByte = os.endianness() === "LE" ? 1 : 0;
  for (let sample = 0; sample < samples; sample++) {
    output[sample] = image.data[sample * 2 + highByte]!;
  }
  return output;
}

export function createPpmResult(
  image: ProcessedImage,
  started: number,
  state: ProcessorState,
): EncodedImageResult {
  if (image.bits !== 8 && image.bits !== 16) {
    throw new LibRawError(`Unsupported PPM bit depth: ${image.bits}`, {
      code: "UNSUPPORTED_OUTPUT_BPS",
      operation: "createPPMBuffer",
      state,
    });
  }
  const bytesPerSample = image.bits / 8;
  const pixels = image.width * image.height;
  const sourceStride = image.colors * bytesPerSample;
  if (image.colors < 3 || image.data.length < pixels * sourceStride) {
    throw new LibRawError("Processed image does not contain complete RGB pixels", {
      code: "INVALID_PROCESSED_IMAGE",
      operation: "createPPMBuffer",
      state,
    });
  }
  const pixelData = Buffer.allocUnsafe(pixels * 3 * bytesPerSample);
  for (let pixel = 0; pixel < pixels; pixel++) {
    const source = pixel * sourceStride;
    const destination = pixel * 3 * bytesPerSample;
    for (let channel = 0; channel < 3; channel++) {
      if (image.bits === 8) {
        pixelData[destination + channel] = image.data[source + channel]!;
      } else if (os.endianness() === "LE") {
        pixelData[destination + channel * 2] =
          image.data[source + channel * 2 + 1]!;
        pixelData[destination + channel * 2 + 1] =
          image.data[source + channel * 2]!;
      } else {
        pixelData[destination + channel * 2] =
          image.data[source + channel * 2]!;
        pixelData[destination + channel * 2 + 1] =
          image.data[source + channel * 2 + 1]!;
      }
    }
  }
  const header = Buffer.from(
    `P6\n${image.width} ${image.height}\n${image.bits === 16 ? 65535 : 255}\n`,
  );
  const data = Buffer.concat([header, pixelData]);
  return {
    data,
    format: "ppm",
    width: image.width,
    height: image.height,
    channels: 3,
    size: data.length,
    processingTimeMs: performance.now() - started,
    source: "processed",
  };
}

export function optimalJpegSettings(
  metadata: MetadataSnapshot,
  usage?: JPEGUsage,
): OptimalJPEGSettings {
  const area = metadata.width * metadata.height;
  const category =
    area > 24_000_000
      ? "high-resolution"
      : area > 6_000_000
        ? "medium-resolution"
        : "low-resolution";
  const recommended: OptimalJPEGSettings["recommended"] = {
    quality: category === "high-resolution" ? 80 : category === "medium-resolution" ? 85 : 90,
    progressive: category === "high-resolution",
    mozjpeg: true,
    chromaSubsampling: category === "low-resolution" ? "4:4:4" : "4:2:0",
    optimizeCoding: true,
    trellisQuantisation: category === "high-resolution",
    optimizeScans: false,
    reasoning: [
      category === "high-resolution"
        ? "High resolution image detected - optimizing for file size"
        : category === "medium-resolution"
          ? "Medium resolution image - balanced quality and size"
          : "Lower resolution image - prioritizing quality",
    ],
  };
  if (usage === "web") {
    recommended.quality = Math.min(recommended.quality, 80);
    recommended.progressive = true;
    recommended.optimizeScans = true;
    recommended.reasoning.push("Web usage - optimized for loading speed");
  } else if (usage === "print") {
    recommended.quality = Math.max(recommended.quality, 90);
    recommended.chromaSubsampling = "4:4:4";
    recommended.reasoning.push("Print usage - optimized for quality");
  } else if (usage === "archive") {
    recommended.quality = 95;
    recommended.chromaSubsampling = "4:4:4";
    recommended.trellisQuantisation = true;
    recommended.reasoning.push("Archive usage - maximum quality preservation");
  }
  if (metadata.make && /canon|nikon/i.test(metadata.make)) {
    recommended.reasoning.push(`${metadata.make} camera detected`);
  }
  return {
    recommended,
    imageAnalysis: {
      dimensions: { width: metadata.width, height: metadata.height, area },
      category,
      camera: { make: metadata.make, model: metadata.model },
    },
  };
}
