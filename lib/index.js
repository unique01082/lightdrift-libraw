const path = require("path");
const sharp = require("sharp");

let librawAddon;

// Try to load the native addon with multiple strategies
function loadAddon() {
  const loadAttempts = [
    // Try node-gyp-build first (for prebuilt binaries)
    () => {
      try {
        return require("node-gyp-build")(path.join(__dirname, ".."));
      } catch (e) {
        return null;
      }
    },
    // Try standard build locations
    () => require("../build/Release/libraw_addon"),
    () => require("../build/Debug/libraw_addon"),
    // Try alternative names (in case of renaming issues)
    () => require("../build/Release/libraw_addon.node"),
    () => require("../build/Debug/libraw_addon.node"),
  ];

  let lastError;
  for (const attempt of loadAttempts) {
    try {
      const addon = attempt();
      if (addon) return addon;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    "LibRaw addon not built. Please ensure the native module is compiled.\n" +
      "\n" +
      "If using Docker/pnpm, try:\n" +
      "  pnpm rebuild lightdrift-libraw\n" +
      "Or set enable-pre-post-scripts=true in .npmrc\n" +
      "\n" +
      "If on Linux/Mac, ensure LibRaw is installed:\n" +
      "  Alpine:  apk add libraw-dev\n" +
      "  Debian:  apt-get install libraw-dev\n" +
      "  Mac:     brew install libraw\n" +
      "\n" +
      "Build error: " +
      (lastError ? lastError.message : "Unknown error")
  );
}

librawAddon = loadAddon();

class LibRaw {
  constructor() {
    this._wrapper = new librawAddon.LibRawWrapper();
    this._isProcessed = false; // Track if processImage() has been called
    this._processedImageData = null; // Cache processed image data
  }

  // ============== FILE OPERATIONS ==============

  /**
   * Load a RAW file from filesystem
   * @param {string} filename - Path to the RAW file
   * @returns {Promise<boolean>} - Success status
   */
  async loadFile(filename) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.loadFile(filename);
        this._isProcessed = false; // Reset processing state for new file
        this._processedImageData = null; // Clear cached data
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Load raw Bayer sensor data from filesystem
   * @param {string} filename - Path to the Bayer sensor data
   * @param {Object} params - Parameter of Bayer sensor data; e.g, width and height
   * @returns {Promise<boolean>} - Success status
   */
  async loadBayerData(filename, params) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.loadBayerData(filename, params);
        this._isProcessed = false; // Reset processing state for new file
        this._processedImageData = null; // Clear cached data
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Load a RAW file from memory buffer
   * @param {Buffer} buffer - Buffer containing RAW data
   * @returns {Promise<boolean>} - Success status
   */
  async loadBuffer(buffer) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.loadBuffer(buffer);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Close and cleanup resources
   * @returns {Promise<boolean>} - Success status
   */
  async close() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.close();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== ERROR HANDLING ==============

  /**
   * Get the last error message
   * @returns {string} - Last error message
   */
  getLastError() {
    return this._wrapper.getLastError();
  }

  /**
   * Convert error code to string
   * @param {number} errorCode - Error code
   * @returns {string} - Error message
   */
  strerror(errorCode) {
    return this._wrapper.strerror(errorCode);
  }

  // ============== METADATA & INFORMATION ==============

  /**
   * Get basic metadata from the loaded RAW file
   * @returns {Promise<Object>} - Metadata object
   */
  async getMetadata() {
    return new Promise((resolve, reject) => {
      try {
        const metadata = this._wrapper.getMetadata();
        resolve(metadata);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get image dimensions and size information
   * @returns {Promise<Object>} - Size object with width/height details
   */
  async getImageSize() {
    return new Promise((resolve, reject) => {
      try {
        const size = this._wrapper.getImageSize();
        resolve(size);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get advanced metadata including color matrices and calibration data
   * @returns {Promise<Object>} - Advanced metadata object
   */
  async getAdvancedMetadata() {
    return new Promise((resolve, reject) => {
      try {
        const metadata = this._wrapper.getAdvancedMetadata();
        resolve(metadata);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get lens information
   * @returns {Promise<Object>} - Lens metadata object
   */
  async getLensInfo() {
    return new Promise((resolve, reject) => {
      try {
        const lensInfo = this._wrapper.getLensInfo();
        resolve(lensInfo);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get color information including white balance and color matrices
   * @returns {Promise<Object>} - Color information object
   */
  async getColorInfo() {
    return new Promise((resolve, reject) => {
      try {
        const colorInfo = this._wrapper.getColorInfo();
        resolve(colorInfo);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== IMAGE PROCESSING ==============

  /**
   * Unpack thumbnail data
   * @returns {Promise<boolean>} - Success status
   */
  async unpackThumbnail() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.unpackThumbnail();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Process the RAW image with current settings
   * @returns {Promise<boolean>} - Success status
   */
  async processImage() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.processImage();
        this._isProcessed = true; // Mark as processed
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Subtract black level from RAW data
   * @returns {Promise<boolean>} - Success status
   */
  async subtractBlack() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.subtractBlack();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert RAW data to image format
   * @returns {Promise<boolean>} - Success status
   */
  async raw2Image() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.raw2Image();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Adjust maximum values in the image
   * @returns {Promise<boolean>} - Success status
   */
  async adjustMaximum() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.adjustMaximum();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== MEMORY IMAGE CREATION ==============

  /**
   * Create processed image in memory
   * @returns {Promise<Object>} - Image data object with Buffer
   */
  async createMemoryImage() {
    return new Promise((resolve, reject) => {
      try {
        // Return cached data if available
        if (this._processedImageData) {
          resolve(this._processedImageData);
          return;
        }

        const imageData = this._wrapper.createMemoryImage();

        // Cache the result if image was processed
        if (this._isProcessed) {
          this._processedImageData = imageData;
        }

        resolve(imageData);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create thumbnail image in memory
   * @returns {Promise<Object>} - Thumbnail data object with Buffer
   */
  async createMemoryThumbnail() {
    return new Promise((resolve, reject) => {
      try {
        const thumbData = this._wrapper.createMemoryThumbnail();
        resolve(thumbData);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== FILE WRITERS ==============

  /**
   * Write processed image as PPM file
   * @param {string} filename - Output filename
   * @returns {Promise<boolean>} - Success status
   */
  async writePPM(filename) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.writePPM(filename);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Write processed image as TIFF file
   * @param {string} filename - Output filename
   * @returns {Promise<boolean>} - Success status
   */
  async writeTIFF(filename) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.writeTIFF(filename);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Write thumbnail to file
   * @param {string} filename - Output filename
   * @returns {Promise<boolean>} - Success status
   */
  async writeThumbnail(filename) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.writeThumbnail(filename);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== CONFIGURATION & SETTINGS ==============

  /**
   * Set output parameters for processing
   * @param {Object} params - Parameter object
   * @returns {Promise<boolean>} - Success status
   */
  async setOutputParams(params) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.setOutputParams(params);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get current output parameters
   * @returns {Promise<Object>} - Current parameters
   */
  async getOutputParams() {
    return new Promise((resolve, reject) => {
      try {
        const params = this._wrapper.getOutputParams();
        resolve(params);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== UTILITY FUNCTIONS ==============

  /**
   * Check if image uses floating point data
   * @returns {Promise<boolean>} - Floating point status
   */
  async isFloatingPoint() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.isFloatingPoint();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if image is Fuji rotated
   * @returns {Promise<boolean>} - Fuji rotation status
   */
  async isFujiRotated() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.isFujiRotated();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if image is sRAW format
   * @returns {Promise<boolean>} - sRAW status
   */
  async isSRAW() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.isSRAW();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if thumbnail is JPEG format
   * @returns {Promise<boolean>} - JPEG thumbnail status
   */
  async isJPEGThumb() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.isJPEGThumb();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get error count during processing
   * @returns {Promise<number>} - Number of errors
   */
  async errorCount() {
    return new Promise((resolve, reject) => {
      try {
        const count = this._wrapper.errorCount();
        resolve(count);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== EXTENDED UTILITY FUNCTIONS ==============

  /**
   * Check if image is Nikon sRAW format
   * @returns {Promise<boolean>} - True if Nikon sRAW
   */
  async isNikonSRAW() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.isNikonSRAW();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if image is Coolscan NEF format
   * @returns {Promise<boolean>} - True if Coolscan NEF
   */
  async isCoolscanNEF() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.isCoolscanNEF();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if image has floating point data
   * @returns {Promise<boolean>} - True if floating point data available
   */
  async haveFPData() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.haveFPData();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get sRAW midpoint value
   * @returns {Promise<number>} - sRAW midpoint
   */
  async srawMidpoint() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.srawMidpoint();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if thumbnail is OK
   * @param {number} [maxSize=-1] - Maximum size limit
   * @returns {Promise<number>} - Thumbnail status
   */
  async thumbOK(maxSize = -1) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.thumbOK(maxSize);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get unpacker function name
   * @returns {Promise<string>} - Name of the unpacker function
   */
  async unpackFunctionName() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.unpackFunctionName();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get decoder information
   * @returns {Promise<Object>} - Decoder info with name and flags
   */
  async getDecoderInfo() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.getDecoderInfo();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== ADVANCED PROCESSING ==============

  /**
   * Unpack RAW data (low-level operation)
   * @returns {Promise<boolean>} - Success status
   */
  async unpack() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.unpack();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert RAW to image with extended options
   * @param {boolean} [subtractBlack=true] - Whether to subtract black level
   * @returns {Promise<boolean>} - Success status
   */
  async raw2ImageEx(subtractBlack = true) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.raw2ImageEx(subtractBlack);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Adjust sizes for information only (no processing)
   * @returns {Promise<boolean>} - Success status
   */
  async adjustSizesInfoOnly() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.adjustSizesInfoOnly();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Free processed image data
   * @returns {Promise<boolean>} - Success status
   */
  async freeImage() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.freeImage();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert floating point to integer data
   * @param {number} [dmin=4096] - Minimum data value
   * @param {number} [dmax=32767] - Maximum data value
   * @param {number} [dtarget=16383] - Target value
   * @returns {Promise<boolean>} - Success status
   */
  async convertFloatToInt(dmin = 4096, dmax = 32767, dtarget = 16383) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.convertFloatToInt(dmin, dmax, dtarget);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== MEMORY OPERATIONS EXTENDED ==============

  /**
   * Get memory image format information
   * @returns {Promise<Object>} - Format info with width, height, colors, bps
   */
  async getMemImageFormat() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.getMemImageFormat();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Copy memory image to buffer
   * @param {Buffer} buffer - Destination buffer
   * @param {number} stride - Row stride in bytes
   * @param {boolean} bgr - Whether to use BGR order
   * @returns {Promise<boolean>} - Success status
   */
  async copyMemImage(buffer, stride, bgr = false) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.copyMemImage(buffer, stride, bgr);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== COLOR OPERATIONS ==============

  /**
   * Get color filter at specific position
   * @param {number} row - Row position
   * @param {number} col - Column position
   * @returns {Promise<number>} - Color value
   */
  async getColorAt(row, col) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.getColorAt(row, col);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== MEMORY STREAM OPERATIONS (NEW FEATURE) ==============

  /**
   * Create processed image as JPEG buffer in memory
   * @param {Object} options - JPEG conversion options
   * @param {number} [options.quality=85] - JPEG quality (1-100)
   * @param {number} [options.width] - Target width (maintains aspect ratio if height not specified)
   * @param {number} [options.height] - Target height (maintains aspect ratio if width not specified)
   * @param {boolean} [options.progressive=false] - Use progressive JPEG
   * @param {boolean} [options.mozjpeg=true] - Use mozjpeg encoder for better compression
   * @param {number} [options.chromaSubsampling='4:2:0'] - Chroma subsampling ('4:4:4', '4:2:2', '4:2:0')
   * @param {boolean} [options.trellisQuantisation=false] - Enable trellis quantisation
   * @param {boolean} [options.optimizeScans=false] - Optimize scan order
   * @param {number} [options.overshootDeringing=false] - Overshoot deringing
   * @param {boolean} [options.optimizeCoding=true] - Optimize Huffman coding
   * @param {string} [options.colorSpace='srgb'] - Output color space ('srgb', 'rec2020', 'p3', 'cmyk')
   * @returns {Promise<Object>} - JPEG buffer with metadata
   */
  async createJPEGBuffer(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // Set default options with performance-optimized values
        const opts = {
          quality: options.quality || 85,
          progressive: options.progressive || false,
          mozjpeg: options.mozjpeg !== false, // Default to true for better compression
          chromaSubsampling: options.chromaSubsampling || "4:2:0",
          trellisQuantisation: options.trellisQuantisation || false,
          optimizeScans: options.optimizeScans || false,
          overshootDeringing: options.overshootDeringing || false,
          optimizeCoding: options.optimizeCoding !== false, // Default to true
          colorSpace: options.colorSpace || "srgb",
          ...options,
        };

        const startTime = process.hrtime.bigint();

        // Smart processing: only process if not already processed
        if (!this._isProcessed) {
          await this.processImage();
        }

        // Create processed image in memory (uses cache if available)
        const imageData = await this.createMemoryImage();

        if (!imageData || !imageData.data) {
          throw new Error("Failed to create memory image from RAW data");
        }

        // Convert the LibRaw RGB data to Sharp-compatible buffer
        let sharpInstance;

        // Determine if this is a large image for performance optimizations
        const isLargeImage = imageData.width * imageData.height > 20_000_000; // > 20MP
        const fastMode = opts.fastMode !== false; // Default to fast mode

        // Optimized Sharp configuration
        const sharpConfig = {
          raw: {
            width: imageData.width,
            height: imageData.height,
            channels: imageData.colors,
            premultiplied: false,
          },
          // Performance optimizations
          sequentialRead: true,
          limitInputPixels: false,
          density: fastMode ? 72 : 300, // Lower DPI for speed
        };

        if (imageData.bits === 16) {
          sharpConfig.raw.depth = "ushort";
        }

        sharpInstance = sharp(imageData.data, sharpConfig);

        // Apply resizing if specified with performance optimizations
        if (opts.width || opts.height) {
          const resizeOptions = {
            withoutEnlargement: true,
            // Use faster kernel for large images or when fast mode is enabled
            kernel:
              isLargeImage || fastMode
                ? sharp.kernel.cubic
                : sharp.kernel.lanczos3,
            fit: "inside",
            fastShrinkOnLoad: true, // Enable fast shrink-on-load optimization
          };

          if (opts.width && opts.height) {
            sharpInstance = sharpInstance.resize(
              opts.width,
              opts.height,
              resizeOptions
            );
          } else if (opts.width) {
            sharpInstance = sharpInstance.resize(
              opts.width,
              null,
              resizeOptions
            );
          } else {
            sharpInstance = sharpInstance.resize(
              null,
              opts.height,
              resizeOptions
            );
          }
        }

        // Configure color space
        switch (opts.colorSpace.toLowerCase()) {
          case "rec2020":
            sharpInstance = sharpInstance.toColorspace("rec2020");
            break;
          case "p3":
            sharpInstance = sharpInstance.toColorspace("p3");
            break;
          case "cmyk":
            sharpInstance = sharpInstance.toColorspace("cmyk");
            break;
          case "srgb":
          default:
            sharpInstance = sharpInstance.toColorspace("srgb");
            break;
        }

        // Configure JPEG options with performance optimizations
        const jpegOptions = {
          quality: Math.max(1, Math.min(100, opts.quality)),
          progressive: fastMode ? false : opts.progressive, // Disable progressive for speed
          mozjpeg: fastMode ? false : opts.mozjpeg, // Disable mozjpeg for speed
          trellisQuantisation: fastMode ? false : opts.trellisQuantisation,
          optimizeScans: fastMode ? false : opts.optimizeScans,
          overshootDeringing: false, // Always disable for speed
          optimizeCoding: fastMode ? false : opts.optimizeCoding,
          // Add effort control for JPEG encoding
          effort: fastMode ? 1 : Math.min(opts.effort || 4, 6),
        };

        // Set chroma subsampling
        switch (opts.chromaSubsampling) {
          case "4:4:4":
            jpegOptions.chromaSubsampling = "4:4:4";
            break;
          case "4:2:2":
            jpegOptions.chromaSubsampling = "4:4:4"; // Sharp doesn't support 4:2:2, use 4:4:4 instead
            break;
          case "4:2:0":
          default:
            jpegOptions.chromaSubsampling = "4:2:0";
            break;
        }

        // Convert to JPEG and get buffer
        const jpegBuffer = await sharpInstance
          .jpeg(jpegOptions)
          .toBuffer({ resolveWithObject: true });

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        // Calculate compression ratio
        const originalSize = imageData.dataSize;
        const compressedSize = jpegBuffer.data.length;
        const compressionRatio = originalSize / compressedSize;

        const result = {
          success: true,
          buffer: jpegBuffer.data,
          metadata: {
            originalDimensions: {
              width: imageData.width,
              height: imageData.height,
            },
            outputDimensions: {
              width: jpegBuffer.info.width,
              height: jpegBuffer.info.height,
            },
            fileSize: {
              original: originalSize,
              compressed: compressedSize,
              compressionRatio: compressionRatio.toFixed(2),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
              throughputMBps: (
                originalSize /
                1024 /
                1024 /
                (processingTime / 1000)
              ).toFixed(2),
            },
            jpegOptions: jpegOptions,
          },
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`JPEG buffer creation failed: ${error.message}`));
      }
    });
  }

  /**
   * Create processed image as PNG buffer in memory
   * @param {Object} options - PNG conversion options
   * @param {number} [options.width] - Target width
   * @param {number} [options.height] - Target height
   * @param {number} [options.compressionLevel=6] - PNG compression level (0-9)
   * @param {boolean} [options.progressive=false] - Use progressive PNG
   * @param {string} [options.colorSpace='srgb'] - Output color space
   * @returns {Promise<Object>} - PNG buffer with metadata
   */
  async createPNGBuffer(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // Smart processing: only process if not already processed
        if (!this._isProcessed) {
          await this.processImage();
        }

        // Create processed image in memory (uses cache if available)
        const imageData = await this.createMemoryImage();

        if (!imageData || !imageData.data) {
          throw new Error("Failed to create memory image from RAW data");
        }

        // Set up Sharp configuration
        const sharpConfig = {
          raw: {
            width: imageData.width,
            height: imageData.height,
            channels: imageData.colors,
            premultiplied: false,
          },
          sequentialRead: true,
          limitInputPixels: false,
        };

        if (imageData.bits === 16) {
          sharpConfig.raw.depth = "ushort";
        }

        let sharpInstance = sharp(imageData.data, sharpConfig);

        // Apply resizing if specified
        if (options.width || options.height) {
          const resizeOptions = {
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
            fit: "inside",
            fastShrinkOnLoad: true,
          };

          if (options.width && options.height) {
            sharpInstance = sharpInstance.resize(
              options.width,
              options.height,
              resizeOptions
            );
          } else if (options.width) {
            sharpInstance = sharpInstance.resize(
              options.width,
              null,
              resizeOptions
            );
          } else {
            sharpInstance = sharpInstance.resize(
              null,
              options.height,
              resizeOptions
            );
          }
        }

        // Configure color space
        switch ((options.colorSpace || "srgb").toLowerCase()) {
          case "rec2020":
            sharpInstance = sharpInstance.toColorspace("rec2020");
            break;
          case "p3":
            sharpInstance = sharpInstance.toColorspace("p3");
            break;
          case "srgb":
          default:
            sharpInstance = sharpInstance.toColorspace("srgb");
            break;
        }

        // Configure PNG options
        const pngOptions = {
          compressionLevel: Math.max(
            0,
            Math.min(9, options.compressionLevel || 6)
          ),
          progressive: options.progressive || false,
          quality: 100, // PNG is lossless
        };

        // Convert to PNG and get buffer
        const pngBuffer = await sharpInstance
          .png(pngOptions)
          .toBuffer({ resolveWithObject: true });

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        const result = {
          success: true,
          buffer: pngBuffer.data,
          metadata: {
            originalDimensions: {
              width: imageData.width,
              height: imageData.height,
            },
            outputDimensions: {
              width: pngBuffer.info.width,
              height: pngBuffer.info.height,
            },
            fileSize: {
              original: imageData.dataSize,
              compressed: pngBuffer.data.length,
              compressionRatio: (
                imageData.dataSize / pngBuffer.data.length
              ).toFixed(2),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
              throughputMBps: (
                imageData.dataSize /
                1024 /
                1024 /
                (processingTime / 1000)
              ).toFixed(2),
            },
            pngOptions: pngOptions,
          },
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`PNG buffer creation failed: ${error.message}`));
      }
    });
  }

  /**
   * Create processed image as TIFF buffer in memory
   * @param {Object} options - TIFF conversion options
   * @param {number} [options.width] - Target width
   * @param {number} [options.height] - Target height
   * @param {string} [options.compression='lzw'] - TIFF compression ('none', 'lzw', 'jpeg', 'zip')
   * @param {number} [options.quality=90] - JPEG quality when using JPEG compression
   * @param {boolean} [options.pyramid=false] - Create pyramidal TIFF
   * @param {string} [options.colorSpace='srgb'] - Output color space
   * @returns {Promise<Object>} - TIFF buffer with metadata
   */
  async createTIFFBuffer(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // Smart processing: only process if not already processed
        if (!this._isProcessed) {
          await this.processImage();
        }

        // Create processed image in memory (uses cache if available)
        const imageData = await this.createMemoryImage();

        if (!imageData || !imageData.data) {
          throw new Error("Failed to create memory image from RAW data");
        }

        // Set up Sharp configuration
        const sharpConfig = {
          raw: {
            width: imageData.width,
            height: imageData.height,
            channels: imageData.colors,
            premultiplied: false,
          },
          sequentialRead: true,
          limitInputPixels: false,
        };

        if (imageData.bits === 16) {
          sharpConfig.raw.depth = "ushort";
        }

        let sharpInstance = sharp(imageData.data, sharpConfig);

        // Apply resizing if specified
        if (options.width || options.height) {
          const resizeOptions = {
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
            fit: "inside",
            fastShrinkOnLoad: true,
          };

          if (options.width && options.height) {
            sharpInstance = sharpInstance.resize(
              options.width,
              options.height,
              resizeOptions
            );
          } else if (options.width) {
            sharpInstance = sharpInstance.resize(
              options.width,
              null,
              resizeOptions
            );
          } else {
            sharpInstance = sharpInstance.resize(
              null,
              options.height,
              resizeOptions
            );
          }
        }

        // Configure color space
        switch ((options.colorSpace || "srgb").toLowerCase()) {
          case "rec2020":
            sharpInstance = sharpInstance.toColorspace("rec2020");
            break;
          case "p3":
            sharpInstance = sharpInstance.toColorspace("p3");
            break;
          case "srgb":
          default:
            sharpInstance = sharpInstance.toColorspace("srgb");
            break;
        }

        // Configure TIFF options
        const tiffOptions = {
          compression: options.compression || "lzw",
          pyramid: options.pyramid || false,
          quality: options.quality || 90,
        };

        // Convert to TIFF and get buffer
        const tiffBuffer = await sharpInstance
          .tiff(tiffOptions)
          .toBuffer({ resolveWithObject: true });

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        const result = {
          success: true,
          buffer: tiffBuffer.data,
          metadata: {
            originalDimensions: {
              width: imageData.width,
              height: imageData.height,
            },
            outputDimensions: {
              width: tiffBuffer.info.width,
              height: tiffBuffer.info.height,
            },
            fileSize: {
              original: imageData.dataSize,
              compressed: tiffBuffer.data.length,
              compressionRatio: (
                imageData.dataSize / tiffBuffer.data.length
              ).toFixed(2),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
              throughputMBps: (
                imageData.dataSize /
                1024 /
                1024 /
                (processingTime / 1000)
              ).toFixed(2),
            },
            tiffOptions: tiffOptions,
          },
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`TIFF buffer creation failed: ${error.message}`));
      }
    });
  }

  /**
   * Create processed image as WebP buffer in memory
   * @param {Object} options - WebP conversion options
   * @param {number} [options.width] - Target width
   * @param {number} [options.height] - Target height
   * @param {number} [options.quality=80] - WebP quality (1-100)
   * @param {boolean} [options.lossless=false] - Use lossless WebP
   * @param {number} [options.effort=4] - Encoding effort (0-6)
   * @param {string} [options.colorSpace='srgb'] - Output color space
   * @returns {Promise<Object>} - WebP buffer with metadata
   */
  async createWebPBuffer(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // Smart processing: only process if not already processed
        if (!this._isProcessed) {
          await this.processImage();
        }

        // Create processed image in memory (uses cache if available)
        const imageData = await this.createMemoryImage();

        if (!imageData || !imageData.data) {
          throw new Error("Failed to create memory image from RAW data");
        }

        // Set up Sharp configuration
        const sharpConfig = {
          raw: {
            width: imageData.width,
            height: imageData.height,
            channels: imageData.colors,
            premultiplied: false,
          },
          sequentialRead: true,
          limitInputPixels: false,
        };

        if (imageData.bits === 16) {
          sharpConfig.raw.depth = "ushort";
        }

        let sharpInstance = sharp(imageData.data, sharpConfig);

        // Apply resizing if specified
        if (options.width || options.height) {
          const resizeOptions = {
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
            fit: "inside",
            fastShrinkOnLoad: true,
          };

          if (options.width && options.height) {
            sharpInstance = sharpInstance.resize(
              options.width,
              options.height,
              resizeOptions
            );
          } else if (options.width) {
            sharpInstance = sharpInstance.resize(
              options.width,
              null,
              resizeOptions
            );
          } else {
            sharpInstance = sharpInstance.resize(
              null,
              options.height,
              resizeOptions
            );
          }
        }

        // Configure color space
        switch ((options.colorSpace || "srgb").toLowerCase()) {
          case "rec2020":
            sharpInstance = sharpInstance.toColorspace("rec2020");
            break;
          case "p3":
            sharpInstance = sharpInstance.toColorspace("p3");
            break;
          case "srgb":
          default:
            sharpInstance = sharpInstance.toColorspace("srgb");
            break;
        }

        // Configure WebP options
        const webpOptions = {
          quality: Math.max(1, Math.min(100, options.quality || 80)),
          lossless: options.lossless || false,
          effort: Math.max(0, Math.min(6, options.effort || 4)),
        };

        // Convert to WebP and get buffer
        const webpBuffer = await sharpInstance
          .webp(webpOptions)
          .toBuffer({ resolveWithObject: true });

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        const result = {
          success: true,
          buffer: webpBuffer.data,
          metadata: {
            originalDimensions: {
              width: imageData.width,
              height: imageData.height,
            },
            outputDimensions: {
              width: webpBuffer.info.width,
              height: webpBuffer.info.height,
            },
            fileSize: {
              original: imageData.dataSize,
              compressed: webpBuffer.data.length,
              compressionRatio: (
                imageData.dataSize / webpBuffer.data.length
              ).toFixed(2),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
              throughputMBps: (
                imageData.dataSize /
                1024 /
                1024 /
                (processingTime / 1000)
              ).toFixed(2),
            },
            webpOptions: webpOptions,
          },
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`WebP buffer creation failed: ${error.message}`));
      }
    });
  }

  /**
   * Create processed image as AVIF buffer in memory
   * @param {Object} options - AVIF conversion options
   * @param {number} [options.width] - Target width
   * @param {number} [options.height] - Target height
   * @param {number} [options.quality=50] - AVIF quality (1-100)
   * @param {boolean} [options.lossless=false] - Use lossless AVIF
   * @param {number} [options.effort=4] - Encoding effort (0-9)
   * @param {string} [options.colorSpace='srgb'] - Output color space
   * @returns {Promise<Object>} - AVIF buffer with metadata
   */
  async createAVIFBuffer(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // Smart processing: only process if not already processed
        if (!this._isProcessed) {
          await this.processImage();
        }

        // Create processed image in memory (uses cache if available)
        const imageData = await this.createMemoryImage();

        if (!imageData || !imageData.data) {
          throw new Error("Failed to create memory image from RAW data");
        }

        // Set up Sharp configuration
        const sharpConfig = {
          raw: {
            width: imageData.width,
            height: imageData.height,
            channels: imageData.colors,
            premultiplied: false,
          },
          sequentialRead: true,
          limitInputPixels: false,
        };

        if (imageData.bits === 16) {
          sharpConfig.raw.depth = "ushort";
        }

        let sharpInstance = sharp(imageData.data, sharpConfig);

        // Apply resizing if specified
        if (options.width || options.height) {
          const resizeOptions = {
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
            fit: "inside",
            fastShrinkOnLoad: true,
          };

          if (options.width && options.height) {
            sharpInstance = sharpInstance.resize(
              options.width,
              options.height,
              resizeOptions
            );
          } else if (options.width) {
            sharpInstance = sharpInstance.resize(
              options.width,
              null,
              resizeOptions
            );
          } else {
            sharpInstance = sharpInstance.resize(
              null,
              options.height,
              resizeOptions
            );
          }
        }

        // Configure color space
        switch ((options.colorSpace || "srgb").toLowerCase()) {
          case "rec2020":
            sharpInstance = sharpInstance.toColorspace("rec2020");
            break;
          case "p3":
            sharpInstance = sharpInstance.toColorspace("p3");
            break;
          case "srgb":
          default:
            sharpInstance = sharpInstance.toColorspace("srgb");
            break;
        }

        // Configure AVIF options
        const avifOptions = {
          quality: Math.max(1, Math.min(100, options.quality || 50)),
          lossless: options.lossless || false,
          effort: Math.max(0, Math.min(9, options.effort || 4)),
        };

        // Convert to AVIF and get buffer
        const avifBuffer = await sharpInstance
          .avif(avifOptions)
          .toBuffer({ resolveWithObject: true });

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        const result = {
          success: true,
          buffer: avifBuffer.data,
          metadata: {
            originalDimensions: {
              width: imageData.width,
              height: imageData.height,
            },
            outputDimensions: {
              width: avifBuffer.info.width,
              height: avifBuffer.info.height,
            },
            fileSize: {
              original: imageData.dataSize,
              compressed: avifBuffer.data.length,
              compressionRatio: (
                imageData.dataSize / avifBuffer.data.length
              ).toFixed(2),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
              throughputMBps: (
                imageData.dataSize /
                1024 /
                1024 /
                (processingTime / 1000)
              ).toFixed(2),
            },
            avifOptions: avifOptions,
          },
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`AVIF buffer creation failed: ${error.message}`));
      }
    });
  }

  /**
   * Create raw PPM buffer from processed image data
   * @returns {Promise<Object>} - PPM buffer with metadata
   */
  async createPPMBuffer() {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // Smart processing: only process if not already processed
        if (!this._isProcessed) {
          await this.processImage();
        }

        // Create processed image in memory (uses cache if available)
        const imageData = await this.createMemoryImage();

        if (!imageData || !imageData.data) {
          throw new Error("Failed to create memory image from RAW data");
        }

        // Create PPM header
        const header = `P6\n${imageData.width} ${imageData.height}\n255\n`;
        const headerBuffer = Buffer.from(header, "ascii");

        // Convert image data to 8-bit RGB if needed
        let rgbData;
        if (imageData.bits === 16) {
          // Convert 16-bit to 8-bit
          const pixels = imageData.width * imageData.height;
          const channels = imageData.colors;
          rgbData = Buffer.alloc(pixels * 3); // PPM is always RGB

          for (let i = 0; i < pixels; i++) {
            const srcOffset = i * channels * 2; // 16-bit data
            const dstOffset = i * 3;

            // Read 16-bit values and convert to 8-bit
            rgbData[dstOffset] = Math.min(
              255,
              Math.floor((imageData.data.readUInt16LE(srcOffset) / 65535) * 255)
            ); // R
            rgbData[dstOffset + 1] = Math.min(
              255,
              Math.floor(
                (imageData.data.readUInt16LE(srcOffset + 2) / 65535) * 255
              )
            ); // G
            rgbData[dstOffset + 2] = Math.min(
              255,
              Math.floor(
                (imageData.data.readUInt16LE(srcOffset + 4) / 65535) * 255
              )
            ); // B
          }
        } else {
          // Already 8-bit, just copy RGB channels
          const pixels = imageData.width * imageData.height;
          const channels = imageData.colors;
          rgbData = Buffer.alloc(pixels * 3);

          for (let i = 0; i < pixels; i++) {
            const srcOffset = i * channels;
            const dstOffset = i * 3;

            rgbData[dstOffset] = imageData.data[srcOffset]; // R
            rgbData[dstOffset + 1] = imageData.data[srcOffset + 1]; // G
            rgbData[dstOffset + 2] = imageData.data[srcOffset + 2]; // B
          }
        }

        // Combine header and data
        const ppmBuffer = Buffer.concat([headerBuffer, rgbData]);

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        const result = {
          success: true,
          buffer: ppmBuffer,
          metadata: {
            format: "PPM",
            dimensions: {
              width: imageData.width,
              height: imageData.height,
            },
            fileSize: {
              original: imageData.dataSize,
              compressed: ppmBuffer.length,
              compressionRatio: (imageData.dataSize / ppmBuffer.length).toFixed(
                2
              ),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
              throughputMBps: (
                imageData.dataSize /
                1024 /
                1024 /
                (processingTime / 1000)
              ).toFixed(2),
            },
          },
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`PPM buffer creation failed: ${error.message}`));
      }
    });
  }

  /**
   * Create thumbnail as JPEG buffer in memory
   * @param {Object} options - JPEG options for thumbnail
   * @param {number} [options.quality=85] - JPEG quality
   * @param {number} [options.maxSize] - Maximum dimension size
   * @returns {Promise<Object>} - Thumbnail JPEG buffer with metadata
   */
  async createThumbnailJPEGBuffer(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // Unpack thumbnail if needed
        await this.unpackThumbnail();

        // Create thumbnail in memory
        const thumbData = await this.createMemoryThumbnail();

        if (!thumbData || !thumbData.data) {
          throw new Error("Failed to create memory thumbnail");
        }

        let sharpInstance;

        // Check if thumbnail is already JPEG
        if (await this.isJPEGThumb()) {
          // Thumbnail is already JPEG, return directly or reprocess if options specified
          if (!options.quality && !options.maxSize) {
            const result = {
              success: true,
              buffer: thumbData.data,
              metadata: {
                format: "JPEG",
                dimensions: {
                  width: thumbData.width,
                  height: thumbData.height,
                },
                fileSize: {
                  compressed: thumbData.data.length,
                },
                processing: {
                  timeMs: "0.00",
                  fromCache: true,
                },
              },
            };
            resolve(result);
            return;
          } else {
            // Reprocess existing JPEG with new options
            sharpInstance = sharp(thumbData.data);
          }
        } else {
          // Convert RAW thumbnail data
          const sharpConfig = {
            raw: {
              width: thumbData.width,
              height: thumbData.height,
              channels: thumbData.colors || 3,
              premultiplied: false,
            },
          };

          if (thumbData.bits === 16) {
            sharpConfig.raw.depth = "ushort";
          }

          sharpInstance = sharp(thumbData.data, sharpConfig);
        }

        // Apply max size constraint if specified
        if (options.maxSize) {
          sharpInstance = sharpInstance.resize(
            options.maxSize,
            options.maxSize,
            {
              fit: "inside",
              withoutEnlargement: true,
            }
          );
        }

        // Configure JPEG options
        const jpegOptions = {
          quality: Math.max(1, Math.min(100, options.quality || 85)),
          progressive: false, // Thumbnails typically don't need progressive
          mozjpeg: false, // Keep simple for speed
        };

        // Convert to JPEG buffer
        const jpegBuffer = await sharpInstance
          .jpeg(jpegOptions)
          .toBuffer({ resolveWithObject: true });

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        const result = {
          success: true,
          buffer: jpegBuffer.data,
          metadata: {
            format: "JPEG",
            originalDimensions: {
              width: thumbData.width,
              height: thumbData.height,
            },
            outputDimensions: {
              width: jpegBuffer.info.width,
              height: jpegBuffer.info.height,
            },
            fileSize: {
              original: thumbData.dataSize || thumbData.data.length,
              compressed: jpegBuffer.data.length,
              compressionRatio: (
                (thumbData.dataSize || thumbData.data.length) /
                jpegBuffer.data.length
              ).toFixed(2),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
            },
            jpegOptions: jpegOptions,
          },
        };

        resolve(result);
      } catch (error) {
        reject(
          new Error(`Thumbnail JPEG buffer creation failed: ${error.message}`)
        );
      }
    });
  }

  // ============== JPEG CONVERSION (NEW FEATURE) ==============

  /**
   * Convert RAW to JPEG with advanced options
   * @param {string} outputPath - Output JPEG file path
   * @param {Object} options - JPEG conversion options
   * @param {number} [options.quality=85] - JPEG quality (1-100)
   * @param {number} [options.width] - Target width (maintains aspect ratio if height not specified)
   * @param {number} [options.height] - Target height (maintains aspect ratio if width not specified)
   * @param {boolean} [options.progressive=false] - Use progressive JPEG
   * @param {boolean} [options.mozjpeg=true] - Use mozjpeg encoder for better compression
   * @param {number} [options.chromaSubsampling='4:2:0'] - Chroma subsampling ('4:4:4', '4:2:2', '4:2:0')
   * @param {boolean} [options.trellisQuantisation=false] - Enable trellis quantisation
   * @param {boolean} [options.optimizeScans=false] - Optimize scan order
   * @param {number} [options.overshootDeringing=false] - Overshoot deringing
   * @param {boolean} [options.optimizeCoding=true] - Optimize Huffman coding
   * @param {string} [options.colorSpace='srgb'] - Output color space ('srgb', 'rec2020', 'p3', 'cmyk')
   * @returns {Promise<Object>} - Conversion result with metadata
   */
  async convertToJPEG(outputPath, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // Create JPEG buffer first
        const result = await this.createJPEGBuffer(options);

        // Write buffer to file
        const fs = require("fs");
        fs.writeFileSync(outputPath, result.buffer);

        // Get output file stats
        const stats = fs.statSync(outputPath);

        // Return result in the same format as before
        resolve({
          success: true,
          outputPath: outputPath,
          metadata: {
            ...result.metadata,
            fileSize: {
              ...result.metadata.fileSize,
              compressed: stats.size,
            },
          },
        });
      } catch (error) {
        reject(new Error(`JPEG conversion failed: ${error.message}`));
      }
    });
  }

  /**
   * Batch convert multiple RAW files to JPEG
   * @param {string[]} inputPaths - Array of input RAW file paths
   * @param {string} outputDir - Output directory for JPEG files
   * @param {Object} options - JPEG conversion options (same as convertToJPEG)
   * @returns {Promise<Object>} - Batch conversion results
   */
  async batchConvertToJPEG(inputPaths, outputDir, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const fs = require("fs");
        const path = require("path");

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const results = {
          successful: [],
          failed: [],
          summary: {
            total: inputPaths.length,
            processed: 0,
            errors: 0,
            totalProcessingTime: 0,
            averageCompressionRatio: 0,
            totalOriginalSize: 0,
            totalCompressedSize: 0,
          },
        };

        const startTime = process.hrtime.bigint();

        for (const inputPath of inputPaths) {
          try {
            // Generate output filename
            const baseName = path.basename(inputPath, path.extname(inputPath));
            const outputPath = path.join(outputDir, `${baseName}.jpg`);

            // Load the RAW file
            await this.close(); // Close any previous file
            await this.loadFile(inputPath);

            // Convert to JPEG
            const result = await this.convertToJPEG(outputPath, options);

            results.successful.push({
              input: inputPath,
              output: outputPath,
              result: result,
            });

            results.summary.processed++;
            results.summary.totalOriginalSize +=
              result.metadata.fileSize.original;
            results.summary.totalCompressedSize +=
              result.metadata.fileSize.compressed;
          } catch (error) {
            results.failed.push({
              input: inputPath,
              error: error.message,
            });
            results.summary.errors++;
          }
        }

        const endTime = process.hrtime.bigint();
        results.summary.totalProcessingTime =
          Number(endTime - startTime) / 1000000; // ms

        if (results.summary.totalOriginalSize > 0) {
          results.summary.averageCompressionRatio = (
            results.summary.totalOriginalSize /
            results.summary.totalCompressedSize
          ).toFixed(2);
        }

        results.summary.averageProcessingTimePerFile = (
          results.summary.totalProcessingTime / inputPaths.length
        ).toFixed(2);

        resolve(results);
      } catch (error) {
        reject(new Error(`Batch JPEG conversion failed: ${error.message}`));
      }
    });
  }

  /**
   * Get optimal JPEG conversion settings based on image analysis
   * @param {Object} analysisOptions - Options for image analysis
   * @returns {Promise<Object>} - Recommended JPEG settings
   */
  async getOptimalJPEGSettings(analysisOptions = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // Get image metadata and process for analysis
        const metadata = await this.getMetadata();
        const imageSize = await this.getImageSize();

        // Analyze image characteristics
        const imageArea = metadata.width * metadata.height;
        const isHighRes = imageArea > 6000 * 4000; // > 24MP
        const isMediumRes = imageArea > 3000 * 2000; // > 6MP

        // Default settings based on image characteristics
        let recommendedSettings = {
          quality: 85,
          progressive: false,
          mozjpeg: true,
          chromaSubsampling: "4:2:0",
          optimizeCoding: true,
          trellisQuantisation: false,
          optimizeScans: false,
          reasoning: [],
        };

        // Adjust settings based on image size
        if (isHighRes) {
          recommendedSettings.quality = 80; // Slightly lower quality for large images
          recommendedSettings.progressive = true; // Progressive loading for large images
          recommendedSettings.trellisQuantisation = true; // Better compression for large images
          recommendedSettings.reasoning.push(
            "High resolution image detected - optimizing for file size"
          );
        } else if (isMediumRes) {
          recommendedSettings.quality = 85;
          recommendedSettings.reasoning.push(
            "Medium resolution image - balanced quality/size"
          );
        } else {
          recommendedSettings.quality = 90; // Higher quality for smaller images
          recommendedSettings.chromaSubsampling = "4:4:4"; // Better chroma for small images (Sharp compatible)
          recommendedSettings.reasoning.push(
            "Lower resolution image - prioritizing quality"
          );
        }

        // Adjust for different use cases
        if (analysisOptions.usage === "web") {
          recommendedSettings.quality = Math.min(
            recommendedSettings.quality,
            80
          );
          recommendedSettings.progressive = true;
          recommendedSettings.optimizeScans = true;
          recommendedSettings.reasoning.push(
            "Web usage - optimized for loading speed"
          );
        } else if (analysisOptions.usage === "print") {
          recommendedSettings.quality = Math.max(
            recommendedSettings.quality,
            90
          );
          recommendedSettings.chromaSubsampling = "4:4:4"; // Use 4:4:4 instead of 4:2:2 for Sharp compatibility
          recommendedSettings.reasoning.push(
            "Print usage - optimized for quality"
          );
        } else if (analysisOptions.usage === "archive") {
          recommendedSettings.quality = 95;
          recommendedSettings.chromaSubsampling = "4:4:4";
          recommendedSettings.trellisQuantisation = true;
          recommendedSettings.reasoning.push(
            "Archive usage - maximum quality preservation"
          );
        }

        // Camera-specific optimizations
        if (metadata.make) {
          const make = metadata.make.toLowerCase();
          if (make.includes("canon") || make.includes("nikon")) {
            // Professional cameras often benefit from slightly different settings
            recommendedSettings.reasoning.push(
              `${metadata.make} camera detected - professional settings`
            );
          }
        }

        resolve({
          recommended: recommendedSettings,
          imageAnalysis: {
            dimensions: {
              width: metadata.width,
              height: metadata.height,
              area: imageArea,
            },
            category: isHighRes
              ? "high-resolution"
              : isMediumRes
              ? "medium-resolution"
              : "low-resolution",
            camera: {
              make: metadata.make,
              model: metadata.model,
            },
          },
        });
      } catch (error) {
        reject(
          new Error(
            `Failed to analyze image for optimal settings: ${error.message}`
          )
        );
      }
    });
  }

  // ============== CANCELLATION SUPPORT ==============

  /**
   * Set cancellation flag to stop processing
   * @returns {Promise<boolean>} - Success status
   */
  async setCancelFlag() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.setCancelFlag();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear cancellation flag
   * @returns {Promise<boolean>} - Success status
   */
  async clearCancelFlag() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.clearCancelFlag();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== VERSION INFORMATION (INSTANCE METHODS) ==============

  /**
   * Get LibRaw version string
   * @returns {string} - Version string
   */
  version() {
    return this._wrapper.version();
  }

  /**
   * Get LibRaw version as array [major, minor, patch]
   * @returns {number[]} - Version number array
   */
  versionNumber() {
    return this._wrapper.versionNumber();
  }

  // ============== STATIC METHODS ==============

  /**
   * Get LibRaw version
   * @returns {string} - Version string
   */
  static getVersion() {
    return librawAddon.LibRawWrapper.getVersion();
  }

  /**
   * Get LibRaw capabilities
   * @returns {number} - Capabilities flags
   */
  static getCapabilities() {
    return librawAddon.LibRawWrapper.getCapabilities();
  }

  /**
   * Get list of supported cameras
   * @returns {string[]} - Array of camera names
   */
  static getCameraList() {
    return librawAddon.LibRawWrapper.getCameraList();
  }

  /**
   * Get count of supported cameras
   * @returns {number} - Number of supported cameras
   */
  static getCameraCount() {
    return librawAddon.LibRawWrapper.getCameraCount();
  }

  /**
   * High-performance fast JPEG conversion with minimal processing
   * @param {string} outputPath - Output JPEG file path
   * @param {Object} options - Speed-optimized JPEG options
   * @returns {Promise<Object>} - Conversion result
   */
  async convertToJPEGFast(outputPath, options = {}) {
    return this.convertToJPEG(outputPath, {
      fastMode: true,
      effort: 1, // Fastest encoding
      progressive: false,
      trellisQuantisation: false,
      optimizeScans: false,
      mozjpeg: false,
      quality: options.quality || 80,
      ...options,
    });
  }

  /**
   * Create multiple JPEG sizes from single RAW (thumbnail, web, full)
   * @param {string} baseOutputPath - Base output path (without extension)
   * @param {Object} options - Multi-size options
   * @returns {Promise<Object>} - Multi-size conversion results
   */
  async convertToJPEGMultiSize(baseOutputPath, options = {}) {
    const sizes = options.sizes || [
      { name: "thumb", width: 400, quality: 85 },
      { name: "web", width: 1920, quality: 80 },
      { name: "full", quality: 85 },
    ];

    // Process the RAW once (uses smart caching)
    if (!this._isProcessed) {
      await this.processImage();
    }

    const results = {};
    const startTime = Date.now();

    // Create all sizes sequentially to reuse cached data
    for (const sizeConfig of sizes) {
      const outputPath = `${baseOutputPath}_${sizeConfig.name}.jpg`;
      const sizeStart = Date.now();

      const result = await this.convertToJPEG(outputPath, {
        fastMode: true,
        width: sizeConfig.width,
        height: sizeConfig.height,
        quality: sizeConfig.quality || 85,
        effort: sizeConfig.effort || 2,
        ...sizeConfig,
      });

      const sizeEnd = Date.now();

      results[sizeConfig.name] = {
        name: sizeConfig.name,
        outputPath,
        dimensions: result.metadata.outputDimensions,
        fileSize: result.metadata.fileSize.compressed,
        processingTime: sizeEnd - sizeStart,
        config: sizeConfig,
      };
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    return {
      success: true,
      sizes: results,
      originalDimensions: Object.values(results)[0]
        ? Object.values(results)[0].dimensions
        : { width: 0, height: 0 },
      totalProcessingTime: totalTime,
      averageTimePerSize: `${(totalTime / sizes.length).toFixed(2)}ms`,
    };
  }

  /**
   * High-level method to process RAW file thumbnail in one call
   * Optimized for worker threads - single serialization boundary
   * @param {Object} options - Processing options
   * @param {string} options.filePath - Path to RAW file
   * @param {string} options.format - Output format: 'jpeg', 'png', 'webp'
   * @param {number} options.maxSize - Maximum dimension size
   * @param {number} [options.quality] - Quality (1-100) for JPEG/WebP
   * @param {number} [options.compressionLevel] - Compression (0-9) for PNG
   * @param {boolean} [options.tryEmbedded=true] - Try embedded thumbnail first
   * @returns {Promise<Object>} - Result with buffer and metadata
   */
  async processRawThumbnail(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // Validate required options
        if (!options.filePath) {
          throw new Error("filePath is required");
        }
        if (!options.format) {
          throw new Error("format is required (jpeg, png, or webp)");
        }
        if (!options.maxSize) {
          throw new Error("maxSize is required");
        }

        const format = options.format.toLowerCase();
        if (!["jpeg", "png", "webp"].includes(format)) {
          throw new Error("format must be jpeg, png, or webp");
        }

        // Load the RAW file
        await this.loadFile(options.filePath);

        let result;
        let usedEmbedded = false;

        // Try embedded thumbnail if requested and format is JPEG
        if (options.tryEmbedded !== false && format === "jpeg") {
          try {
            result = await this.createThumbnailJPEGBuffer({
              maxSize: options.maxSize,
              quality: options.quality || 85,
            });
            usedEmbedded = true;
          } catch (err) {
            // Fallback to full processing
            usedEmbedded = false;
          }
        }

        // If not using embedded or fallback needed, process full image
        if (!usedEmbedded) {
          await this.processImage();

          switch (format) {
            case "jpeg":
              result = await this.createJPEGBuffer({
                quality: options.quality || 85,
                width: options.maxSize,
              });
              break;
            case "png":
              result = await this.createPNGBuffer({
                width: options.maxSize,
                compressionLevel:
                  options.compressionLevel !== undefined
                    ? options.compressionLevel
                    : 6,
              });
              break;
            case "webp":
              result = await this.createWebPBuffer({
                quality: options.quality || 85,
                width: options.maxSize,
              });
              break;
          }
        }

        // Clean up
        await this.close();

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        // Return serializable result
        resolve({
          success: result.success,
          buffer: result.buffer,
          format: format.toUpperCase(),
          dimensions:
            result.metadata.dimensions || result.metadata.originalDimensions,
          outputDimensions: result.metadata.outputDimensions,
          usedEmbedded,
          processingTimeMs: processingTime.toFixed(2),
          fileSize: result.buffer.length,
        });
      } catch (error) {
        // Ensure cleanup even on error
        try {
          await this.close();
        } catch (closeError) {
          // Ignore close errors
        }

        reject({
          success: false,
          error: {
            message: error.message,
            code: error.code || "PROCESSING_ERROR",
          },
        });
      }
    });
  }

  /**
   * High-performance parallel batch conversion using worker threads
   * @param {string[]} inputPaths - Array of RAW file paths
   * @param {string} outputDir - Output directory
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} - Batch conversion results
   */
  static async batchConvertToJPEGParallel(inputPaths, outputDir, options = {}) {
    const fs = require("fs");
    const path = require("path");
    const os = require("os");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const maxConcurrency =
      options.maxConcurrency || Math.min(os.cpus().length, 4);
    const results = [];
    const errors = [];
    const startTime = Date.now();

    // Process files in parallel batches
    for (let i = 0; i < inputPaths.length; i += maxConcurrency) {
      const batch = inputPaths.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (inputPath) => {
        try {
          const fileName = path.parse(inputPath).name;
          const outputPath = path.join(outputDir, `${fileName}.jpg`);

          const libraw = new LibRaw();
          await libraw.loadFile(inputPath);

          const result = await libraw.convertToJPEG(outputPath, {
            fastMode: true,
            effort: 1,
            quality: options.quality || 85,
            ...options,
          });

          await libraw.close();

          return {
            inputPath,
            outputPath,
            success: true,
            fileSize: result.metadata.fileSize.compressed,
            processingTime: result.metadata.processing.timeMs,
          };
        } catch (error) {
          errors.push({ inputPath, error: error.message });
          return {
            inputPath,
            success: false,
            error: error.message,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const endTime = Date.now();
    const successCount = results.filter((r) => r.success).length;

    return {
      totalFiles: inputPaths.length,
      successCount,
      errorCount: errors.length,
      results,
      errors,
      totalProcessingTime: endTime - startTime,
      averageTimePerFile:
        successCount > 0 ? (endTime - startTime) / successCount : 0,
    };
  }
}

module.exports = LibRaw;
