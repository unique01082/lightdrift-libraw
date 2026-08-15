import { EventEmitter } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import sharp from "sharp";

import { LibRawError, normalizeError } from "./errors";
import {
  abortError,
  restoreBuffers,
  stateAfterFailure,
  stateAfterOperation,
  stateAfterThumbnail,
} from "./lifecycle";
import { installForwardedOperations } from "./mirror";
import { findPackageRoot, loadNativeAddon } from "./native";
import type {
  BayerDescriptor,
  DataErrorEvent,
  DecoderInfo,
  EncodedImageResult,
  ExifTagEvent,
  LibRawImageDataSnapshot,
  LibRawOptions,
  JPEGUsage,
  MakerNoteEvent,
  MemoryImageFormat,
  OperationOptions,
  OptimalJPEGSettings,
  ProcessedImage,
  ProcessorState,
  ProgressEvent,
} from "./types";
import {
  createPpmResult,
  optimalJpegSettings,
  sharpInput,
  type RenderOptions,
} from "./workflows";

export * from "./errors";
export type * from "./types";

interface WorkerResponse {
  id?: number;
  event?: { name: string; [key: string]: unknown };
  result?: unknown;
  error?: Error & { code?: string; librawCode?: number };
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: unknown): void;
}

export class LibRaw extends EventEmitter {
  readonly flags: number;
  private readonly worker: Worker;
  private readonly cancellationBuffer = new SharedArrayBuffer(4);
  private readonly cancellation: Int32Array;
  private readonly pending = new Map<number, PendingRequest>();
  private nextRequestId = 1;
  private tail: Promise<void> = Promise.resolve();
  private closePromise?: Promise<void>;
  private closeRequested = false;
  private workerFailure?: Error;
  private _state: ProcessorState = "idle";

  constructor(options: LibRawOptions = {}) {
    super();
    this.flags = options.flags ?? 0;
    this.cancellation = new Int32Array(this.cancellationBuffer);
    this.worker = new Worker(
      path.join(findPackageRoot(), "dist", "processor-worker.cjs"),
      {
        workerData: {
          flags: this.flags,
          cancellationBuffer: this.cancellationBuffer,
        },
      },
    );
    this.worker.on("message", (message: WorkerResponse) => {
      if (message.event) {
        const { name, ...event } = message.event;
        this.emit(name, event);
        return;
      }
      if (message.id === undefined) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(message.error);
      else pending.resolve(restoreBuffers(message.result));
    });
    const failWorker = (error: Error) => {
      this.workerFailure ??= error;
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
      if (this._state !== "closing" && this._state !== "closed") {
        this._state = "error";
      }
    };
    this.worker.on("error", failWorker);
    this.worker.on("exit", (code) => {
      if (this._state !== "closing" && this._state !== "closed") {
        failWorker(new Error(`LibRaw processor worker exited with code ${code}`));
      }
    });
  }

  get state(): ProcessorState {
    return this._state;
  }

  private request(method: string, args: unknown[]): Promise<unknown> {
    if (this.workerFailure) return Promise.reject(this.workerFailure);
    const id = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.worker.postMessage({ id, method, args });
      } catch (error) {
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  private enqueue<T>(
    operation: string,
    args: unknown[] = [],
    options: OperationOptions = {},
    nativeOperation = operation,
  ): Promise<T> {
    if (this.closeRequested || this._state === "closing" || this._state === "closed") {
      return Promise.reject(
        new LibRawError("LibRaw instance is closed", {
          code: "INSTANCE_CLOSED",
          operation,
          state: "closed",
        }),
      );
    }
    if (options.signal?.aborted) {
      return Promise.reject(
        abortError(operation, this._state, options.signal.reason),
      );
    }

    const queuedState = this._state;
    const run = this.tail.then(async () => {
      if (options.signal?.aborted) {
        throw abortError(operation, queuedState, options.signal.reason);
      }
      const before = this._state;
      Atomics.store(this.cancellation, 0, 0);
      if (nativeOperation.startsWith("open") || nativeOperation.startsWith("load")) {
        this._state = "opening";
      }
      let aborted = false;
      const onAbort = () => {
        aborted = true;
        Atomics.store(this.cancellation, 0, 1);
      };
      options.signal?.addEventListener("abort", onAbort, { once: true });
      try {
        const value = await this.request(nativeOperation, args);
        if (aborted) throw abortError(operation, before, options.signal?.reason);
        if (!this.closeRequested) {
          if (nativeOperation === "processRawThumbnailNative") {
            this._state = stateAfterThumbnail(value);
          } else if (
            nativeOperation === "freeImage" ||
            nativeOperation === "setOutputParams"
          ) {
            this._state = before === "processed" ? "unpacked" : before;
          } else {
            this._state = stateAfterOperation[nativeOperation] ?? this._state;
          }
        }
        return value as T;
      } catch (error) {
        if (aborted) throw abortError(operation, before, options.signal?.reason);
        if (!this.closeRequested) {
          this._state = stateAfterFailure[nativeOperation] ?? before;
        }
        throw normalizeError(error, operation, before);
      } finally {
        options.signal?.removeEventListener("abort", onAbort);
      }
    });
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  openFile(file: string, options?: OperationOptions): Promise<void> {
    return this.enqueue("openFile", [file], options).then(() => undefined);
  }

  openBuffer(input: Uint8Array, options?: OperationOptions): Promise<void> {
    return this.enqueue("openBuffer", [Buffer.from(input)], options).then(
      () => undefined,
    );
  }

  openBayer(
    input: Uint8Array,
    descriptor: BayerDescriptor,
    options?: OperationOptions,
  ): Promise<void> {
    return this.enqueue(
      "openBayer",
      [Buffer.from(input), descriptor],
      options,
    ).then(() => undefined);
  }

  loadFile(file: string, options?: OperationOptions): Promise<void> {
    return this.enqueue("loadFile", [file], options).then(() => undefined);
  }

  loadBuffer(input: Uint8Array, options?: OperationOptions): Promise<void> {
    return this.enqueue("loadBuffer", [Buffer.from(input)], options).then(
      () => undefined,
    );
  }

  loadBayerData(
    file: string,
    descriptor: BayerDescriptor,
    options?: OperationOptions,
  ): Promise<void> {
    return this.enqueue("loadBayerData", [file, descriptor], options).then(
      () => undefined,
    );
  }

  recycle(options?: OperationOptions): Promise<void> {
    return this.enqueue("recycle", [], options).then(() => undefined);
  }

  async close(): Promise<void> {
    if (this._state === "closed") return;
    if (this.closePromise) return this.closePromise;
    this.closeRequested = true;
    this._state = "closing";
    this.closePromise = this.tail
      .then(() =>
        this.workerFailure ? undefined : this.request("close", []),
      )
      .then(() => undefined)
      .finally(async () => {
        await this.worker.terminate();
        this._state = "closed";
      });
    return this.closePromise;
  }

  getImgData(options?: OperationOptions): Promise<LibRawImageDataSnapshot> {
    return this.enqueue("getImgData", [], options);
  }

  unpack(options?: OperationOptions): Promise<void> {
    return this.enqueue("unpack", [], options).then(() => undefined);
  }

  unpackThumb(options?: OperationOptions): Promise<void> {
    return this.enqueue("unpackThumb", [], options).then(() => undefined);
  }

  unpackThumbEx(index: number, options?: OperationOptions): Promise<void> {
    return this.enqueue("unpackThumbEx", [index], options).then(() => undefined);
  }

  dcrawProcess(options?: OperationOptions): Promise<void> {
    return this.enqueue("dcrawProcess", [], options).then(() => undefined);
  }

  processImage(options?: OperationOptions): Promise<void> {
    return this.enqueue("processImage", [], options).then(() => undefined);
  }

  dcrawMakeMemImage(options?: OperationOptions): Promise<ProcessedImage> {
    return this.enqueue("dcrawMakeMemImage", [], options);
  }

  dcrawMakeMemThumb(options?: OperationOptions): Promise<ProcessedImage> {
    return this.enqueue("dcrawMakeMemThumb", [], options);
  }

  createMemoryImage(options?: OperationOptions): Promise<ProcessedImage> {
    return this.dcrawMakeMemImage(options);
  }

  createMemoryThumbnail(options?: OperationOptions): Promise<ProcessedImage> {
    return this.dcrawMakeMemThumb(options);
  }

  setCancelFlag(): void {
    Atomics.store(this.cancellation, 0, 1);
  }

  clearCancelFlag(): void {
    Atomics.store(this.cancellation, 0, 0);
  }

  async copyMemImage(
    destination: Buffer,
    stride: number,
    bgr = false,
    options?: OperationOptions,
  ): Promise<void> {
    const copy = await this.enqueue<Buffer>(
      "copyMemImage",
      [destination.length, stride, bgr],
      options,
      "copyMemImageOwned",
    );
    copy.copy(destination);
  }

  private async runWorkflow<T>(
    operation: string,
    work: () => T | Promise<T>,
  ): Promise<T> {
    try {
      return await work();
    } catch (error) {
      throw normalizeError(error, operation, this._state);
    }
  }

  private async render(
    format: Exclude<EncodedImageResult["format"], "ppm">,
    options: RenderOptions = {},
    source: EncodedImageResult["source"] = "processed",
    operation = `create${format.toUpperCase()}Buffer`,
  ): Promise<EncodedImageResult> {
    const started = performance.now();
    const image =
      source === "embedded-thumbnail"
        ? await this.enqueue<ProcessedImage>(
            operation,
            [],
            options,
            "renderThumbnail",
          )
        : await this.enqueue<ProcessedImage>(
            operation,
            [],
            options,
            "renderProcessedImage",
          );
    return this.runWorkflow(operation, () =>
      this.encodeImage(image, format, options, source, started),
    );
  }

  private async encodeImage(
    image: ProcessedImage,
    format: Exclude<EncodedImageResult["format"], "ppm">,
    options: RenderOptions,
    source: EncodedImageResult["source"],
    started = performance.now(),
  ): Promise<EncodedImageResult> {
    const sharpData = sharpInput(
      image,
      `create${format.toUpperCase()}Buffer`,
      this._state,
    );
    let pipeline =
      image.type === 1
        ? sharp(sharpData)
        : sharp(sharpData, {
            raw: {
              width: image.width,
              height: image.height,
              channels: image.colors as 1 | 2 | 3 | 4,
            },
          });
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, { fit: "inside" });
    }
    if (format === "jpeg") {
      pipeline = pipeline.jpeg({
        quality: options.quality,
        progressive: options.progressive,
        mozjpeg: options.mozjpeg,
        chromaSubsampling: options.chromaSubsampling,
        optimizeCoding: options.optimizeCoding,
        trellisQuantisation: options.trellisQuantisation,
        optimizeScans: options.optimizeScans,
      });
    }
    if (format === "png") {
      pipeline = pipeline.png({ compressionLevel: options.compressionLevel });
    }
    if (format === "tiff") pipeline = pipeline.tiff();
    if (format === "webp") pipeline = pipeline.webp({ quality: options.quality });
    if (format === "avif") {
      pipeline = pipeline.avif({ quality: options.quality, effort: options.effort });
    }
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      data,
      format,
      width: info.width,
      height: info.height,
      channels: info.channels,
      size: data.length,
      processingTimeMs: performance.now() - started,
      source,
    };
  }

  createJPEGBuffer(options?: RenderOptions): Promise<EncodedImageResult> {
    return this.render("jpeg", options, "processed", "createJPEGBuffer");
  }
  createPNGBuffer(options?: RenderOptions): Promise<EncodedImageResult> {
    return this.render("png", options, "processed", "createPNGBuffer");
  }
  createTIFFBuffer(options?: RenderOptions): Promise<EncodedImageResult> {
    return this.render("tiff", options, "processed", "createTIFFBuffer");
  }
  createWebPBuffer(options?: RenderOptions): Promise<EncodedImageResult> {
    return this.render("webp", options, "processed", "createWebPBuffer");
  }
  createAVIFBuffer(options?: RenderOptions): Promise<EncodedImageResult> {
    return this.render("avif", options, "processed", "createAVIFBuffer");
  }
  createThumbnailJPEGBuffer(options?: RenderOptions): Promise<EncodedImageResult> {
    return this.render(
      "jpeg",
      options,
      "embedded-thumbnail",
      "createThumbnailJPEGBuffer",
    );
  }

  async createPPMBuffer(options: OperationOptions = {}): Promise<EncodedImageResult> {
    const started = performance.now();
    const image = await this.enqueue<ProcessedImage>(
      "createPPMBuffer",
      [],
      options,
      "renderProcessedImage",
    );
    return this.runWorkflow("createPPMBuffer", () =>
      createPpmResult(image, started, this._state),
    );
  }

  async convertToJPEG(
    outputPath: string,
    options: RenderOptions = {},
  ): Promise<EncodedImageResult> {
    return this.writeJPEG("convertToJPEG", outputPath, options);
  }

  convertToJPEGFast(
    outputPath: string,
    options: RenderOptions = {},
  ): Promise<EncodedImageResult> {
    return this.writeJPEG("convertToJPEGFast", outputPath, {
      quality: 80,
      effort: 1,
      ...options,
    });
  }

  private async writeJPEG(
    operation: string,
    outputPath: string,
    options: RenderOptions,
  ): Promise<EncodedImageResult> {
    const result = await this.render("jpeg", options, "processed", operation);
    return this.runWorkflow(operation, async () => {
      await writeFile(outputPath, result.data);
      return result;
    });
  }

  async convertToJPEGMultiSize(
    baseOutputPath: string,
    options: RenderOptions & {
      sizes?: Array<RenderOptions & { name: string }>;
    } = {},
  ): Promise<Record<string, EncodedImageResult>> {
    const sizes = options.sizes ?? [
      { name: "thumb", width: 400, quality: 85 },
      { name: "web", width: 1920, quality: 80 },
      { name: "full", quality: 85 },
    ];
    const image = await this.enqueue<ProcessedImage>(
      "convertToJPEGMultiSize",
      [],
      options,
      "renderProcessedImage",
    );
    return this.runWorkflow("convertToJPEGMultiSize", async () => {
      const result: Record<string, EncodedImageResult> = {};
      for (const size of sizes) {
        const { name, ...renderOptions } = size;
        const encoded = await this.encodeImage(
          image,
          "jpeg",
          { ...options, ...renderOptions } as RenderOptions,
          "processed",
        );
        await writeFile(`${baseOutputPath}_${name}.jpg`, encoded.data);
        result[name] = encoded;
      }
      return result;
    });
  }

  batchConvertToJPEG(
    inputPaths: string[],
    outputDirectory: string,
    options: RenderOptions & { maxConcurrency?: number } = {},
  ): Promise<EncodedImageResult[]> {
    return LibRaw.batchConvertToJPEGParallel(
      inputPaths,
      outputDirectory,
      options,
    );
  }

  async processRawThumbnail(options: {
    filePath: string;
    format: "jpeg" | "png" | "webp";
    maxSize: number;
    quality?: number;
    compressionLevel?: number;
    tryEmbedded?: boolean;
    signal?: AbortSignal;
  }): Promise<EncodedImageResult> {
    const started = performance.now();
    const native = await this.enqueue<{
      image: ProcessedImage;
      source: EncodedImageResult["source"];
    }>(
      "processRawThumbnail",
      [{
        filePath: options.filePath,
        format: options.format,
        tryEmbedded: options.tryEmbedded !== false,
      }],
      options,
      "processRawThumbnailNative",
    );
    const renderOptions = {
      width: options.maxSize,
      quality: options.quality,
      compressionLevel: options.compressionLevel,
      signal: options.signal,
    };
    return this.runWorkflow("processRawThumbnail", () =>
      this.encodeImage(
        native.image,
        options.format,
        renderOptions,
        native.source,
        started,
      ),
    );
  }

  async getOptimalJPEGSettings(
    options: { usage?: JPEGUsage } = {},
  ): Promise<OptimalJPEGSettings> {
    const metadata = await this.getMetadata();
    return optimalJpegSettings(metadata, options.usage);
  }

  static async batchConvertToJPEGParallel(
    inputPaths: string[],
    outputDirectory: string,
    options: RenderOptions & { maxConcurrency?: number } = {},
  ): Promise<EncodedImageResult[]> {
    try {
      await mkdir(outputDirectory, { recursive: true });
      const concurrency = Math.max(
        1,
        Math.min(
          options.maxConcurrency ?? Math.min(os.cpus().length, 4),
          inputPaths.length || 1,
        ),
      );
      const results = new Array<EncodedImageResult>(inputPaths.length);
      let nextIndex = 0;
      await Promise.all(
        Array.from({ length: concurrency }, async () => {
          for (;;) {
            const index = nextIndex++;
            if (index >= inputPaths.length) return;
            const input = inputPaths[index]!;
            const processor = new LibRaw();
            try {
              await processor.loadFile(input, options);
              const filename = path.basename(input, path.extname(input));
              results[index] = await processor.convertToJPEG(
                path.join(outputDirectory, `${filename}.jpg`),
                options,
              );
            } finally {
              await processor.close();
            }
          }
        }),
      );
      return results;
    } catch (error) {
      throw normalizeError(error, "batchConvertToJPEGParallel", "idle");
    }
  }

  static version(): string {
    return loadNativeAddon().LibRawWrapper.getVersion().replace(/-.*$/, "");
  }
  static versionNumber(): number {
    const [major = 0, minor = 0, patch = 0] = this.version()
      .split(".")
      .map(Number);
    return (major << 16) | (minor << 8) | patch;
  }
  static capabilities(): number {
    return loadNativeAddon().LibRawWrapper.getCapabilities();
  }
  static cameraList(): readonly string[] {
    return Object.freeze([...loadNativeAddon().LibRawWrapper.getCameraList()]);
  }
  static cameraCount(): number {
    return loadNativeAddon().LibRawWrapper.getCameraCount();
  }
  static strError(code: number): string {
    const wrapper = new (loadNativeAddon().LibRawWrapper)();
    try {
      const strerror = wrapper.strerror;
      if (!strerror) return `LibRaw error ${code}`;
      return String(strerror.call(wrapper, code));
    } finally {
      wrapper.close();
    }
  }
  static strProgress(progress: number): string {
    return loadNativeAddon().LibRawWrapper.strProgress(progress);
  }
  static cameraMakerIndexToMaker(index: number): string | null {
    return loadNativeAddon().LibRawWrapper.cameraMakerIndexToMaker(index);
  }
  static simplifyMakeModel(
    makerIndex: number,
    make: string,
    model: string,
  ): { makerIndex: number; make: string; model: string } {
    const result = loadNativeAddon().LibRawWrapper.simplifyMakeModel(
      makerIndex,
      make,
      model,
    ) as { makerIndex: number; make: string; model: string };
    return result;
  }
  static powfLimited(base: number, exponent: number, limit: number): number {
    return exponent > limit || exponent < -limit
      ? 0
      : Math.pow(base, exponent);
  }
  static powf64Limited(base: number, exponent: number): number {
    return this.powfLimited(base, exponent, 64);
  }
  static readBigEndianUnsigned(length: number, input: Uint8Array): number {
    if (length < 0 || length > 4 || input.length < length) {
      throw new RangeError("length must be between 0 and 4 and fit input");
    }
    let result = 0;
    for (let index = 0; index < length; index++) {
      result = result * 256 + input[index]!;
    }
    return result >>> 0;
  }

  version(): string {
    return LibRaw.version();
  }
  versionNumber(): number {
    return LibRaw.versionNumber();
  }
  static getVersion(): string {
    return this.version();
  }
  static getCapabilities(): number {
    return this.capabilities();
  }
  static getCameraList(): readonly string[] {
    return this.cameraList();
  }
  static getCameraCount(): number {
    return this.cameraCount();
  }
}

installForwardedOperations(LibRaw.prototype);

export interface LibRaw {
  on(event: "progress", listener: (event: ProgressEvent) => void): this;
  on(event: "dataError", listener: (event: DataErrorEvent) => void): this;
  on(event: "exifTag", listener: (event: ExifTagEvent) => void): this;
  on(event: "makerNote", listener: (event: MakerNoteEvent) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  errorCount(options?: OperationOptions): Promise<number>;
  recycleDatastream(options?: OperationOptions): Promise<void>;
  subtractBlack(options?: OperationOptions): Promise<void>;
  subtractBlackInternal(options?: OperationOptions): Promise<void>;
  raw2Image(options?: OperationOptions): Promise<void>;
  raw2ImageEx(subtractBlack?: boolean, options?: OperationOptions): Promise<void>;
  raw2ImageStart(options?: OperationOptions): Promise<void>;
  freeImage(options?: OperationOptions): Promise<void>;
  adjustMaximum(options?: OperationOptions): Promise<void>;
  adjustSizesInfoOnly(options?: OperationOptions): Promise<void>;
  adjustToRawInsetCrop(mask: number, maxCrop?: number, options?: OperationOptions): Promise<void>;
  setMakeFromIndex(index: number, options?: OperationOptions): Promise<void>;
  convertFloatToInt(min?: number, max?: number, target?: number, options?: OperationOptions): Promise<void>;
  dcrawPpmTiffWriter(file: string, options?: OperationOptions): Promise<void>;
  dcrawThumbWriter(file: string, options?: OperationOptions): Promise<void>;
  getMemImageFormat(options?: OperationOptions): Promise<MemoryImageFormat>;
  copyMemImage(destination: Buffer, stride: number, bgr?: boolean, options?: OperationOptions): Promise<void>;
  colorAt(row: number, column: number, options?: OperationOptions): Promise<number>;
  filterColorAt(row: number, column: number, options?: OperationOptions): Promise<number>;
  fcol(row: number, column: number, options?: OperationOptions): Promise<number>;
  unpackFunctionName(options?: OperationOptions): Promise<string>;
  getDecoderInfo(options?: OperationOptions): Promise<DecoderInfo>;
  phaseOneSubtractBlack(source: Buffer, options?: OperationOptions): Promise<Buffer>;
  phaseOneCorrect(options?: OperationOptions): Promise<void>;
  adobeCoeff(makerIndex: number, model: string, internalOnly?: boolean, options?: OperationOptions): Promise<void>;
  thumbOk(maxSize?: number, options?: OperationOptions): Promise<number>;
  isFujiRotated(options?: OperationOptions): Promise<boolean>;
  isSraw(options?: OperationOptions): Promise<boolean>;
  srawMidpoint(options?: OperationOptions): Promise<number>;
  isNikonSraw(options?: OperationOptions): Promise<boolean>;
  isCoolscanNef(options?: OperationOptions): Promise<boolean>;
  isJpegThumb(options?: OperationOptions): Promise<boolean>;
  isFloatingPoint(options?: OperationOptions): Promise<boolean>;
  haveFpData(options?: OperationOptions): Promise<boolean>;
  getMetadata(options?: OperationOptions): Promise<LibRawImageDataSnapshot["metadata"]>;
  getImageSize(options?: OperationOptions): Promise<LibRawImageDataSnapshot["sizes"]>;
  getAdvancedMetadata(options?: OperationOptions): Promise<LibRawImageDataSnapshot["advanced"]>;
  getLensInfo(options?: OperationOptions): Promise<LibRawImageDataSnapshot["lens"]>;
  getColorInfo(options?: OperationOptions): Promise<LibRawImageDataSnapshot["color"]>;
  setOutputParams(params: Partial<LibRawImageDataSnapshot["params"]>, options?: OperationOptions): Promise<void>;
  getOutputParams(options?: OperationOptions): Promise<LibRawImageDataSnapshot["params"]>;
  getLastError(options?: OperationOptions): Promise<unknown>;
  strerror(code: number, options?: OperationOptions): Promise<string>;
  writePPM(file: string, options?: OperationOptions): Promise<void>;
  writeTIFF(file: string, options?: OperationOptions): Promise<void>;
  writeThumbnail(file: string, options?: OperationOptions): Promise<void>;
  getRawImageBuffer(options?: OperationOptions): Promise<Buffer>;
}

export default LibRaw;
