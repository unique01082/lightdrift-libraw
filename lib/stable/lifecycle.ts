import { LibRawError } from "./errors";
import type { EncodedImageResult, ProcessorState } from "./types";

export const stateAfterOperation: Partial<Record<string, ProcessorState>> = {
  openFile: "opened",
  openBuffer: "opened",
  openBayer: "opened",
  loadFile: "unpacked",
  loadBuffer: "unpacked",
  loadBayerData: "unpacked",
  unpack: "unpacked",
  dcrawProcess: "processed",
  processImage: "processed",
  renderProcessedImage: "processed",
  recycle: "idle",
};

export const stateAfterFailure: Partial<Record<string, ProcessorState>> = {
  loadFile: "idle",
  loadBuffer: "idle",
  loadBayerData: "idle",
  processRawThumbnailNative: "idle",
};

export function stateAfterThumbnail(
  value: unknown,
): Extract<ProcessorState, "unpacked" | "processed"> {
  const source = (value as { source?: EncodedImageResult["source"] })?.source;
  return source === "embedded-thumbnail" ? "unpacked" : "processed";
}

export function restoreBuffers(value: unknown): unknown {
  if (value instanceof Uint8Array && !Buffer.isBuffer(value)) {
    return Buffer.from(value);
  }
  if (Array.isArray(value)) return value.map(restoreBuffers);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, restoreBuffers(child)]),
    );
  }
  return value;
}

export function abortError(
  operation: string,
  state: ProcessorState,
  cause: unknown,
): LibRawError {
  return new LibRawError(`Operation ${operation} was aborted`, {
    code: "ABORT_ERR",
    operation,
    state,
    cause,
  });
}
