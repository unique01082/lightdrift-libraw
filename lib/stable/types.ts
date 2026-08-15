export interface LibRawOptions {
  flags?: number;
}

export interface OperationOptions {
  signal?: AbortSignal;
}

export type ProcessorState =
  | "idle"
  | "opening"
  | "opened"
  | "unpacked"
  | "processed"
  | "closing"
  | "closed"
  | "error";

export interface BayerDescriptor {
  width: number;
  height: number;
  leftMargin?: number;
  topMargin?: number;
  rightMargin?: number;
  bottomMargin?: number;
  procFlags?: number;
  bayerPattern?: number;
  unusedBits?: number;
  otherFlags?: number;
  blackLevel?: number;
}

export interface ProcessedImage {
  data: Buffer;
  type: number;
  height: number;
  width: number;
  colors: number;
  bits: number;
  dataSize: number;
}

export interface MemoryImageFormat {
  width: number;
  height: number;
  colors: number;
  bps: number;
}

export interface DecoderInfo {
  decoder_name: string;
  decoder_flags: number;
}

export interface EncodedImageResult {
  data: Buffer;
  format: "jpeg" | "png" | "tiff" | "webp" | "avif" | "ppm";
  width: number;
  height: number;
  channels: number;
  size: number;
  processingTimeMs: number;
  source: "processed" | "embedded-thumbnail";
}

export type JPEGUsage = "web" | "print" | "archive";

export interface OptimalJPEGSettings {
  recommended: {
    quality: number;
    progressive: boolean;
    mozjpeg: boolean;
    chromaSubsampling: "4:2:0" | "4:4:4";
    optimizeCoding: boolean;
    trellisQuantisation: boolean;
    optimizeScans: boolean;
    reasoning: string[];
  };
  imageAnalysis: {
    dimensions: { width: number; height: number; area: number };
    category: "high-resolution" | "medium-resolution" | "low-resolution";
    camera: { make?: string; model?: string };
  };
}

export type {
  DataErrorEvent,
  ExifTagEvent,
  MakerNoteEvent,
  ProgressEvent,
} from "./events";
export type {
  AdvancedMetadataSnapshot,
  ColorInfoSnapshot,
  ImageSizeSnapshot,
  LensInfoSnapshot,
  LibRawImageDataSnapshot,
  MetadataSnapshot,
  OutputParamsSnapshot,
} from "./metadata";
