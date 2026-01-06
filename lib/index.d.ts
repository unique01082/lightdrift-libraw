/**
 * TypeScript definitions for LibRaw Node.js wrapper
 * Provides type-safe access to LibRaw functionality for RAW image processing
 */

declare module 'libraw' {
  export interface LibRawMetadata {
    /** Camera manufacturer */
    make?: string;
    /** Camera model */
    model?: string;
    /** Camera software/firmware */
    software?: string;
    /** Processed image width */
    width: number;
    /** Processed image height */
    height: number;
    /** RAW image width */
    rawWidth: number;
    /** RAW image height */
    rawHeight: number;
    /** Number of color channels */
    colors: number;
    /** Color filter array pattern */
    filters: number;
    /** ISO sensitivity */
    iso?: number;
    /** Shutter speed in seconds */
    shutterSpeed?: number;
    /** Aperture value (f-number) */
    aperture?: number;
    /** Focal length in mm */
    focalLength?: number;
    /** Timestamp of image capture */
    timestamp?: number;
  }

  export interface LibRawAdvancedMetadata {
    /** Normalized camera manufacturer */
    normalizedMake?: string;
    /** Normalized camera model */
    normalizedModel?: string;
    /** Number of RAW images in file */
    rawCount: number;
    /** DNG version number */
    dngVersion: number;
    /** Foveon sensor indicator */
    is_foveon: number;
    /** Color transformation matrix (4x3) */
    colorMatrix: number[][];
    /** Camera white balance multipliers */
    camMul: number[];
    /** Preprocessing multipliers */
    preMul: number[];
    /** Sensor black level */
    blackLevel: number;
    /** Maximum data value */
    dataMaximum: number;
    /** Sensor white level */
    whiteLevel: number;
  }

  export interface LibRawImageSize {
    /** Processed image width */
    width: number;
    /** Processed image height */
    height: number;
    /** RAW image width */
    rawWidth: number;
    /** RAW image height */
    rawHeight: number;
    /** Top margin in pixels */
    topMargin: number;
    /** Left margin in pixels */
    leftMargin: number;
    /** Internal width */
    iWidth: number;
    /** Internal height */
    iHeight: number;
  }

  export interface LibRawLensInfo {
    /** Lens name/model */
    lensName?: string;
    /** Lens manufacturer */
    lensMake?: string;
    /** Lens serial number */
    lensSerial?: string;
    /** Internal lens serial number */
    internalLensSerial?: string;
    /** Minimum focal length */
    minFocal?: number;
    /** Maximum focal length */
    maxFocal?: number;
    /** Maximum aperture at minimum focal length */
    maxAp4MinFocal?: number;
    /** Maximum aperture at maximum focal length */
    maxAp4MaxFocal?: number;
    /** EXIF maximum aperture */
    exifMaxAp?: number;
    /** Focal length in 35mm equivalent */
    focalLengthIn35mmFormat?: number;
  }

  export interface LibRawColorInfo {
    /** Number of color channels */
    colors: number;
    /** Color filter array pattern */
    filters: number;
    /** Sensor black level */
    blackLevel: number;
    /** Maximum data value */
    dataMaximum: number;
    /** Sensor white level */
    whiteLevel: number;
    /** Color profile length */
    profileLength?: number;
    /** RGB to camera space matrix (3x4) */
    rgbCam: number[][];
    /** Camera white balance multipliers */
    camMul: number[];
  }

  export interface LibRawOutputParams {
    /** Gamma correction curve [gamma, toe_slope] */
    gamma?: [number, number];
    /** Brightness adjustment (0.25-8.0) */
    bright?: number;
    /** Output color space (0=raw, 1=sRGB, 2=Adobe, 3=Wide, 4=ProPhoto, 5=XYZ, 6=ACES) */
    output_color?: number;
    /** Output bits per sample (8 or 16) */
    output_bps?: number;
    /** Manual white balance multipliers [R, G, B, G2] */
    user_mul?: [number, number, number, number];
    /** Disable automatic brightness adjustment */
    no_auto_bright?: boolean;
    /** Highlight recovery mode (0-9) */
    highlight?: number;
    /** Output TIFF format instead of PPM */
    output_tiff?: boolean;
  }

  export interface LibRawImageData {
    /** Image type (1=JPEG, 3=PPM/TIFF) */
    type: number;
    /** Image height in pixels */
    height: number;
    /** Image width in pixels */
    width: number;
    /** Number of color channels */
    colors: number;
    /** Bits per channel */
    bits: number;
    /** Total data size in bytes */
    dataSize: number;
    /** Raw image data buffer */
    data: Buffer;
  }

  export interface LibRawJPEGOptions {
    /** JPEG quality (1-100) */
    quality?: number;
    /** Target width (maintains aspect ratio if height not specified) */
    width?: number;
    /** Target height (maintains aspect ratio if width not specified) */
    height?: number;
    /** Use progressive JPEG */
    progressive?: boolean;
    /** Use mozjpeg encoder for better compression */
    mozjpeg?: boolean;
    /** Chroma subsampling ('4:4:4', '4:2:0') - Note: 4:2:2 maps to 4:4:4 */
    chromaSubsampling?: '4:4:4' | '4:2:2' | '4:2:0';
    /** Enable trellis quantisation */
    trellisQuantisation?: boolean;
    /** Optimize scan order */
    optimizeScans?: boolean;
    /** Overshoot deringing */
    overshootDeringing?: boolean;
    /** Optimize Huffman coding */
    optimizeCoding?: boolean;
    /** Output color space */
    colorSpace?: 'srgb' | 'rec2020' | 'p3' | 'cmyk';
    /** Enable fast mode for better performance */
    fastMode?: boolean;
    /** Encoding effort (1=fastest, 9=slowest) */
    effort?: number;
    /** Maximum concurrency for batch operations */
    maxConcurrency?: number;
  }

  export interface LibRawOptimalSettings {
    quality: number;
    progressive: boolean;
    mozjpeg: boolean;
    chromaSubsampling: string;
    effort: number;
    reasoning: string;
  }

  export interface LibRawBufferResult {
    /** Buffer creation success status */
    success: boolean;
    /** Raw binary data buffer */
    buffer: Buffer;
    /** Buffer metadata */
    metadata: {
      /** Original image dimensions */
      originalDimensions?: {
        width: number;
        height: number;
      };
      /** Output image dimensions */
      outputDimensions?: {
        width: number;
        height: number;
      };
      /** Processed dimensions */
      dimensions?: {
        width: number;
        height: number;
      };
      /** File size information */
      fileSize: {
        original?: number;
        compressed: number;
        compressionRatio?: string;
      };
      /** Processing performance */
      processing: {
        timeMs: string;
        throughputMBps?: string;
        fromCache?: boolean;
      };
      /** Format-specific options */
      jpegOptions?: object;
      pngOptions?: object;
      tiffOptions?: object;
      webpOptions?: object;
      avifOptions?: object;
      /** Format type */
      format?: string;
    };
  }

  export interface LibRawImageConversionOptions {
    /** Target width (maintains aspect ratio if height not specified) */
    width?: number;
    /** Target height (maintains aspect ratio if width not specified) */
    height?: number;
    /** Output color space */
    colorSpace?: 'srgb' | 'rec2020' | 'p3' | 'cmyk';
    /** Enable fast mode for better performance */
    fastMode?: boolean;
  }

  export interface LibRawPNGOptions extends LibRawImageConversionOptions {
    /** PNG compression level (0-9) */
    compressionLevel?: number;
    /** Use progressive PNG */
    progressive?: boolean;
  }

  export interface LibRawTIFFOptions extends LibRawImageConversionOptions {
    /** TIFF compression type */
    compression?: 'none' | 'lzw' | 'jpeg' | 'zip';
    /** JPEG quality when using JPEG compression */
    quality?: number;
    /** Create pyramidal TIFF */
    pyramid?: boolean;
  }

  export interface LibRawWebPOptions extends LibRawImageConversionOptions {
    /** WebP quality (1-100) */
    quality?: number;
    /** Use lossless WebP */
    lossless?: boolean;
    /** Encoding effort (0-6) */
    effort?: number;
  }

  export interface LibRawAVIFOptions extends LibRawImageConversionOptions {
    /** AVIF quality (1-100) */
    quality?: number;
    /** Use lossless AVIF */
    lossless?: boolean;
    /** Encoding effort (0-9) */
    effort?: number;
  }

  export interface LibRawThumbnailJPEGOptions {
    /** JPEG quality (1-100) */
    quality?: number;
    /** Maximum dimension size */
    maxSize?: number;
  }

  export interface LibRawJPEGResult {
    /** Conversion success status */
    success: boolean;
    /** Output file path */
    outputPath: string;
    /** Conversion metadata */
    metadata: {
      /** Original image dimensions */
      originalDimensions: {
        width: number;
        height: number;
      };
      /** Output image dimensions */
      outputDimensions: {
        width: number;
        height: number;
      };
      /** File size information */
      fileSize: {
        original: number;
        compressed: number;
        compressionRatio: string;
      };
      /** Processing performance */
      processing: {
        timeMs: string;
        throughputMBps: string;
      };
      /** Applied JPEG options */
      jpegOptions: object;
    };
  }

  export interface LibRawBatchResult {
    /** Successfully processed files */
    successful: Array<{
      input: string;
      output: string;
      result: LibRawJPEGResult;
    }>;
    /** Failed files */
    failed: Array<{
      input: string;
      error: string;
    }>;
    /** Processing summary */
    summary: {
      total: number;
      processed: number;
      errors: number;
      totalProcessingTime: number;
      averageCompressionRatio: string;
      totalOriginalSize: number;
      totalCompressedSize: number;
      averageProcessingTimePerFile: string;
    };
  }

  export interface LibRawOptimalSettings {
    /** Recommended JPEG settings */
    recommended: LibRawJPEGOptions & {
      reasoning: string[];
    };
    /** Image analysis results */
    imageAnalysis: {
      dimensions: {
        width: number;
        height: number;
        area: number;
      };
      category: 'high-resolution' | 'medium-resolution' | 'low-resolution';
      camera: {
        make?: string;
        model?: string;
      };
    };
  }

  export class LibRaw {
    constructor();

    // ============== FILE OPERATIONS ==============
    /**
     * Load RAW image from file
     * @param filename Path to RAW image file
     */
    loadFile(filename: string): Promise<boolean>;

    /**
     * Load RAW image from buffer
     * @param buffer Binary data buffer containing RAW image
     */
    loadBuffer(buffer: Buffer): Promise<boolean>;

    /**
     * Close current image and free resources
     */
    close(): Promise<boolean>;

    // ============== METADATA & INFORMATION ==============
    /**
     * Get basic image metadata and EXIF information
     */
    getMetadata(): Promise<LibRawMetadata>;

    /**
     * Get image size and margin information
     */
    getImageSize(): Promise<LibRawImageSize>;

    /**
     * Get advanced metadata including color matrices
     */
    getAdvancedMetadata(): Promise<LibRawAdvancedMetadata>;

    /**
     * Get lens information from EXIF data
     */
    getLensInfo(): Promise<LibRawLensInfo>;

    /**
     * Get color space and sensor information
     */
    getColorInfo(): Promise<LibRawColorInfo>;

    // ============== IMAGE PROCESSING ==============
    /**
     * Unpack thumbnail from RAW file
     */
    unpackThumbnail(): Promise<boolean>;

    /**
     * Process RAW image with current settings
     */
    processImage(): Promise<boolean>;

    /**
     * Subtract black level from image data
     */
    subtractBlack(): Promise<boolean>;

    /**
     * Convert RAW data to RGB image
     */
    raw2Image(): Promise<boolean>;

    /**
     * Adjust image maximum values
     */
    adjustMaximum(): Promise<boolean>;

    // ============== MEMORY IMAGE CREATION ==============
    /**
     * Create processed image in memory
     */
    createMemoryImage(): Promise<LibRawImageData>;

    /**
     * Create thumbnail image in memory
     */
    createMemoryThumbnail(): Promise<LibRawImageData>;

    // ============== FILE WRITERS ==============
    /**
     * Write processed image as PPM file
     * @param filename Output PPM file path
     */
    writePPM(filename: string): Promise<boolean>;

    /**
     * Write processed image as TIFF file
     * @param filename Output TIFF file path
     */
    writeTIFF(filename: string): Promise<boolean>;

    /**
     * Write thumbnail as JPEG file
     * @param filename Output JPEG file path
     */
    writeThumbnail(filename: string): Promise<boolean>;

    // ============== CONFIGURATION & SETTINGS ==============
    /**
     * Set output processing parameters
     * @param params Output parameters configuration
     */
    setOutputParams(params: LibRawOutputParams): Promise<boolean>;

    /**
     * Get current output processing parameters
     */
    getOutputParams(): Promise<LibRawOutputParams>;

    // ============== UTILITY FUNCTIONS ==============
    /**
     * Check if image uses floating point values
     */
    isFloatingPoint(): Promise<boolean>;

    /**
     * Check if image is from Fuji camera and rotated
     */
    isFujiRotated(): Promise<boolean>;

    /**
     * Check if image is sRAW format
     */
    isSRAW(): Promise<boolean>;

    /**
     * Check if file contains JPEG thumbnail
     */
    isJPEGThumb(): Promise<boolean>;

    /**
     * Get current error count
     */
    errorCount(): Promise<number>;

    // ============== MEMORY STREAM OPERATIONS (NEW FEATURE) ==============
    /**
     * Create processed image as JPEG buffer in memory
     * @param options JPEG conversion options
     */
    createJPEGBuffer(options?: LibRawJPEGOptions): Promise<LibRawBufferResult>;

    /**
     * Create processed image as PNG buffer in memory
     * @param options PNG conversion options
     */
    createPNGBuffer(options?: LibRawPNGOptions): Promise<LibRawBufferResult>;

    /**
     * Create processed image as TIFF buffer in memory
     * @param options TIFF conversion options
     */
    createTIFFBuffer(options?: LibRawTIFFOptions): Promise<LibRawBufferResult>;

    /**
     * Create processed image as WebP buffer in memory
     * @param options WebP conversion options
     */
    createWebPBuffer(options?: LibRawWebPOptions): Promise<LibRawBufferResult>;

    /**
     * Create processed image as AVIF buffer in memory
     * @param options AVIF conversion options
     */
    createAVIFBuffer(options?: LibRawAVIFOptions): Promise<LibRawBufferResult>;

    /**
     * Create raw PPM buffer from processed image data
     */
    createPPMBuffer(): Promise<LibRawBufferResult>;

    /**
     * Create thumbnail as JPEG buffer in memory
     * @param options JPEG options for thumbnail
     */
    createThumbnailJPEGBuffer(options?: LibRawThumbnailJPEGOptions): Promise<LibRawBufferResult>;

    /**
     * High-level method to process RAW file thumbnail in one call
     * Optimized for worker threads with single serialization boundary
     * @param options Processing options
     */
    processRawThumbnail(options: {
      /** Path to RAW file */
      filePath: string;
      /** Output format: 'jpeg', 'png', or 'webp' */
      format: 'jpeg' | 'png' | 'webp';
      /** Maximum dimension size */
      maxSize: number;
      /** Quality (1-100) for JPEG/WebP */
      quality?: number;
      /** Compression level (0-9) for PNG */
      compressionLevel?: number;
      /** Try embedded thumbnail first (default: true) */
      tryEmbedded?: boolean;
    }): Promise<{
      success: boolean;
      buffer: Buffer;
      format: string;
      dimensions: { width: number; height: number };
      outputDimensions?: { width: number; height: number };
      usedEmbedded?: boolean;
      processingTimeMs: string;
      fileSize: number;
    }>;

    // ============== JPEG CONVERSION (NEW FEATURE) ==============
    /**
     * Convert RAW to JPEG with advanced options
     * @param outputPath Output JPEG file path
     * @param options JPEG conversion options
     */
    convertToJPEG(outputPath: string, options?: LibRawJPEGOptions): Promise<LibRawJPEGResult>;

    /**
     * Batch convert multiple RAW files to JPEG
     * @param inputPaths Array of input RAW file paths
     * @param outputDir Output directory for JPEG files
     * @param options JPEG conversion options
     */
    batchConvertToJPEG(inputPaths: string[], outputDir: string, options?: LibRawJPEGOptions): Promise<LibRawBatchResult>;

    /**
     * Get optimal JPEG conversion settings based on image analysis
     * @param analysisOptions Options for image analysis
     */
    getOptimalJPEGSettings(analysisOptions?: { usage?: 'web' | 'print' | 'archive' }): Promise<LibRawOptimalSettings>;

    /**
     * High-performance JPEG conversion with minimal processing for speed
     * @param outputPath Output JPEG file path
     * @param options Speed-optimized JPEG options
     */
    convertToJPEGFast(outputPath: string, options?: LibRawJPEGOptions): Promise<LibRawJPEGResult>;

    /**
     * Create multiple JPEG sizes from single RAW (thumbnail, web, full)
     * @param baseOutputPath Base output path (without extension)
     * @param options Multi-size options
     */
    convertToJPEGMultiSize(baseOutputPath: string, options?: {
      sizes?: Array<{
        name: string;
        width?: number;
        height?: number;
        quality?: number;
        progressive?: boolean;
        mozjpeg?: boolean;
        chromaSubsampling?: string;
        effort?: number;
      }>;
    }): Promise<{
      success: boolean;
      sizes: Record<string, {
        name: string;
        outputPath: string;
        dimensions: { width: number; height: number };
        fileSize: number;
        processingTime: number;
        config: any;
      }>;
      originalDimensions: { width: number; height: number };
      totalProcessingTime: number;
      averageTimePerSize: string;
    }>;

    // ============== STATIC METHODS ==============
    /**
     * Get LibRaw library version
     */
    static getVersion(): string;

    /**
     * Get LibRaw library capabilities bitmask
     */
    static getCapabilities(): number;

    /**
     * Get list of supported camera models
     */
    static getCameraList(): string[];

    /**
     * Get count of supported camera models
     */
    static getCameraCount(): number;
  }

  export = LibRaw;
}