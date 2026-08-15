import { parentPort, workerData } from "node:worker_threads";

import { loadNativeAddon, type NativeWrapper } from "./native";

interface Request {
  id: number;
  method: string;
  args: unknown[];
}

const port = parentPort;
if (!port) throw new Error("processor-worker must run in a worker thread");

const Native = loadNativeAddon().LibRawWrapper;
const wrapper = new Native(Number(workerData?.flags ?? 0));
const cancellation = new Int32Array(workerData.cancellationBuffer as SharedArrayBuffer);
wrapper.setCancellationBuffer(cancellation);
let ownedInput: Buffer | undefined;
let processed = false;
let thumbnailUnpacked = false;

const aliases: Record<string, string> = {
  unpackThumb: "unpackThumbnail",
  thumbOk: "thumbOK",
  dcrawProcess: "processImage",
  dcrawPpmTiffWriter: "writePPM",
  dcrawThumbWriter: "writeThumbnail",
  dcrawMakeMemImage: "createMemoryImage",
  dcrawMakeMemThumb: "createMemoryThumbnail",
  colorAt: "getColorAt",
  isSraw: "isSRAW",
  isNikonSraw: "isNikonSRAW",
  isCoolscanNef: "isCoolscanNEF",
  isJpegThumb: "isJPEGThumb",
  haveFpData: "haveFPData",
  strError: "strerror",
};

function asBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (value instanceof Uint8Array) return Buffer.from(value);
  throw new TypeError("Expected Buffer or Uint8Array");
}

function invoke(method: string, args: unknown[]): unknown {
  if (method === "recycle") {
    try {
      return wrapper.close();
    } finally {
      ownedInput = undefined;
      processed = false;
      thumbnailUnpacked = false;
    }
  }
  if (method === "close") {
    try {
      return wrapper.close();
    } finally {
      ownedInput = undefined;
      processed = false;
      thumbnailUnpacked = false;
    }
  }
  if (method === "loadFile") {
    wrapper.close();
    ownedInput = undefined;
    processed = false;
    thumbnailUnpacked = false;
    const result = wrapper.loadFile(...args);
    return result;
  }
  if (method === "openFile") {
    const result = wrapper.openFile(...args);
    ownedInput = undefined;
    processed = false;
    thumbnailUnpacked = false;
    return result;
  }
  if (method === "loadBayerData") {
    wrapper.close();
    ownedInput = undefined;
    processed = false;
    thumbnailUnpacked = false;
    const result = wrapper.loadBayerData(...args);
    return result;
  }
  if (method === "loadBuffer") {
    wrapper.close();
    ownedInput = undefined;
    processed = false;
    thumbnailUnpacked = false;
    ownedInput = asBuffer(args[0]);
    const result = wrapper.loadBuffer(ownedInput);
    return result;
  }
  if (method === "openBuffer") {
    const input = asBuffer(args[0]);
    const nativeOpen = wrapper.openBuffer;
    const result = nativeOpen
      ? nativeOpen.call(wrapper, input)
      : wrapper.loadBuffer(input);
    ownedInput = input;
    processed = false;
    thumbnailUnpacked = false;
    return result;
  }
  if (method === "openBayer") {
    const input = asBuffer(args[0]);
    const result = wrapper.openBayer(input, args[1]);
    ownedInput = input;
    processed = false;
    thumbnailUnpacked = false;
    return result;
  }
  if (method === "phaseOneSubtractBlack") {
    return wrapper.phaseOneSubtractBlack(asBuffer(args[0]));
  }
  if (method === "copyMemImageOwned") {
    const destination = Buffer.alloc(Number(args[0]));
    wrapper.copyMemImage(destination, args[1], args[2]);
    return destination;
  }
  if (method === "renderProcessedImage") {
    if (!processed) {
      wrapper.processImage();
      processed = true;
    }
    return wrapper.createMemoryImage();
  }
  if (method === "renderThumbnail") {
    if (!thumbnailUnpacked) {
      wrapper.unpackThumbnail();
      thumbnailUnpacked = true;
    }
    return wrapper.createMemoryThumbnail();
  }
  if (method === "processRawThumbnailNative") {
    const options = args[0] as {
      filePath: string;
      format: string;
      tryEmbedded: boolean;
    };
    wrapper.close();
    ownedInput = undefined;
    processed = false;
    thumbnailUnpacked = false;
    wrapper.loadFile(options.filePath);
    if (options.tryEmbedded && options.format === "jpeg") {
      try {
        wrapper.unpackThumbnail();
        thumbnailUnpacked = true;
        return {
          image: wrapper.createMemoryThumbnail(),
          source: "embedded-thumbnail",
        };
      } catch {
        // The full decode below is the deterministic fallback.
      }
    }
    wrapper.processImage();
    processed = true;
    return { image: wrapper.createMemoryImage(), source: "processed" };
  }
  if (method === "getImgData") {
    return {
      metadata: wrapper.getMetadata(),
      sizes: wrapper.getImageSize(),
      advanced: wrapper.getAdvancedMetadata(),
      lens: wrapper.getLensInfo(),
      color: wrapper.getColorInfo(),
      params: wrapper.getOutputParams(),
    };
  }

  const nativeName = aliases[method] ?? method;
  const nativeMethod = wrapper[nativeName];
  if (typeof nativeMethod !== "function") {
    const error = new Error(`Native operation ${method} is unavailable`);
    Object.assign(error, { code: "UNSUPPORTED_OPERATION" });
    throw error;
  }
  const result = nativeMethod.apply(wrapper, args);
  if (method === "dcrawProcess" || method === "processImage") processed = true;
  if (method === "unpackThumb" || method === "unpackThumbEx") thumbnailUnpacked = true;
  if (method === "freeImage" || method === "setOutputParams") processed = false;
  if (method === "recycleDatastream") ownedInput = undefined;
  return result;
}

port.on("message", ({ id, method, args }: Request) => {
  try {
    const result = invoke(method, args);
    const events = wrapper.drainEvents() as Array<Record<string, unknown>>;
    for (const event of events) port.postMessage({ event });
    port.postMessage({ id, result });
  } catch (error) {
    const events = wrapper.drainEvents() as Array<Record<string, unknown>>;
    for (const event of events) port.postMessage({ event });
    const candidate = error as Error & { code?: string; librawCode?: number };
    port.postMessage({
      id,
      error: {
        name: candidate.name,
        message: candidate.message,
        code: candidate.code,
        librawCode: candidate.librawCode,
        stack: candidate.stack,
      },
    });
  }
});
