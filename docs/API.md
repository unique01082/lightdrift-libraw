# API Documentation

> **Historical beta reference.** This page documents the deprecated
> `lightdrift-libraw/legacy` surface. New applications should start with the
> [stable documentation hub](README.md) and [API mapping](api-mapping.md).

## LibRaw Class

The main class for processing RAW image files. It accepts complete file and
buffer inputs; it does not incrementally decode a Node.js stream.

### Constructor

```javascript
const LibRaw = require("lightdrift-libraw");
const processor = new LibRaw();
```

## File Operations

#### loadFile(filepath)

Loads a RAW image file for processing.

**Parameters:**

- `filepath` (string): Absolute path to the RAW image file

**Returns:** `Promise<void>`

**Throws:** Error if file cannot be loaded or is not supported

**Example:**

```javascript
await processor.loadFile("/path/to/image.nef");
```

#### loadBuffer(buffer)

Loads a RAW image from a memory buffer.

**Parameters:**

- `buffer` (Buffer): Buffer containing RAW image data

**Returns:** `Promise<void>`

**Example:**

```javascript
const rawData = fs.readFileSync("/path/to/image.nef");
await processor.loadBuffer(rawData);
```

#### close()

Closes the current image and frees resources.

**Returns:** `Promise<void>`

**Example:**

```javascript
await processor.close();
```

## Metadata Operations

#### getMetadata()

Extracts basic metadata from the loaded RAW image.

**Returns:** `Promise<LibRawMetadata>`

**Example:**

```javascript
const metadata = await processor.getMetadata();
console.log(`Camera: ${metadata.make} ${metadata.model}`);
console.log(
  `ISO: ${metadata.iso}, f/${metadata.aperture}, 1/${Math.round(
    1 / metadata.shutterSpeed
  )}s`
);
```

#### getImageSize()

Gets image dimensions and margin information.

**Returns:** `Promise<LibRawImageSize>`

#### getAdvancedMetadata()

Gets advanced metadata including color matrices and calibration data.

**Returns:** `Promise<LibRawAdvancedMetadata>`

#### getLensInfo()

Gets lens information from EXIF data.

**Returns:** `Promise<LibRawLensInfo>`

#### getColorInfo()

Gets color space and sensor information.

**Returns:** `Promise<LibRawColorInfo>`

## Image Processing

#### processImage()

Processes the RAW image with current settings.

**Returns:** `Promise<void>`

**Example:**

```javascript
await processor.processImage();
```

#### unpackThumbnail()

Unpacks thumbnail data from the RAW file.

**Returns:** `Promise<void>`

#### setOutputParams(params)

Sets output processing parameters.

**Parameters:**

- `params` (Object): Processing parameters

**Example:**

```javascript
await processor.setOutputParams({
  bright: 1.1,
  gamma: [2.2, 4.5],
  output_bps: 16,
  output_color: 1,
});
```

## Memory Operations

#### createMemoryImage()

Creates processed image in memory.

**Returns:** `Promise<LibRawImageData>`

#### createMemoryThumbnail()

Creates thumbnail image in memory.

**Returns:** `Promise<LibRawImageData>`

## Buffer/Stream Operations (NEW)

The buffer API provides modern, memory-based image processing perfect for web services, cloud applications, and real-time processing.

#### createJPEGBuffer(options)

Creates a JPEG buffer with advanced compression options.

**Parameters:**

- `options` (Object, optional): JPEG conversion options
  - `quality` (number): JPEG quality 1-100 (default: 85)
  - `width` (number): Target width (maintains aspect ratio)
  - `height` (number): Target height
  - `progressive` (boolean): Use progressive JPEG (default: false)
  - `mozjpeg` (boolean): Use mozjpeg encoder (default: true)
  - `chromaSubsampling` (string): '4:4:4', '4:2:2', or '4:2:0' (default: '4:2:0')
  - `colorSpace` (string): 'srgb', 'rec2020', 'p3', 'cmyk' (default: 'srgb')
  - `fastMode` (boolean): Optimize for speed (default: false)
  - `effort` (number): Encoding effort 1-9 (default: 4)

**Returns:** `Promise<LibRawBufferResult>`

**Example:**

```javascript
const result = await processor.createJPEGBuffer({
  quality: 85,
  width: 1920,
  progressive: true,
});

// Use the buffer directly
res.set("Content-Type", "image/jpeg");
res.send(result.buffer);
```

#### createPNGBuffer(options)

Creates a lossless PNG buffer.

**Parameters:**

- `options` (Object, optional): PNG conversion options
  - `width` (number): Target width
  - `height` (number): Target height
  - `compressionLevel` (number): Compression level 0-9 (default: 6)
  - `progressive` (boolean): Use progressive PNG (default: false)
  - `colorSpace` (string): Output color space (default: 'srgb')

**Returns:** `Promise<LibRawBufferResult>`

#### createWebPBuffer(options)

Creates a modern WebP buffer with excellent compression.

**Parameters:**

- `options` (Object, optional): WebP conversion options
  - `quality` (number): Quality 1-100 (default: 80)
  - `width` (number): Target width
  - `height` (number): Target height
  - `lossless` (boolean): Use lossless compression (default: false)
  - `effort` (number): Encoding effort 0-6 (default: 4)
  - `colorSpace` (string): Output color space (default: 'srgb')

**Returns:** `Promise<LibRawBufferResult>`

#### createAVIFBuffer(options)

Creates a next-generation AVIF buffer with superior compression.

**Parameters:**

- `options` (Object, optional): AVIF conversion options
  - `quality` (number): Quality 1-100 (default: 50)
  - `width` (number): Target width
  - `height` (number): Target height
  - `lossless` (boolean): Use lossless compression (default: false)
  - `effort` (number): Encoding effort 0-9 (default: 4)
  - `colorSpace` (string): Output color space (default: 'srgb')

**Returns:** `Promise<LibRawBufferResult>`

#### createTIFFBuffer(options)

Creates a high-quality TIFF buffer for professional workflows.

**Parameters:**

- `options` (Object, optional): TIFF conversion options
  - `width` (number): Target width
  - `height` (number): Target height
  - `compression` (string): 'none', 'lzw', 'jpeg', 'zip' (default: 'lzw')
  - `quality` (number): JPEG quality when using JPEG compression (default: 90)
  - `pyramid` (boolean): Create pyramidal TIFF (default: false)
  - `colorSpace` (string): Output color space (default: 'srgb')

**Returns:** `Promise<LibRawBufferResult>`

#### createPPMBuffer()

Creates a raw PPM buffer for further processing.

**Returns:** `Promise<LibRawBufferResult>`

#### createThumbnailJPEGBuffer(options)

Creates an optimized thumbnail JPEG buffer.

**Parameters:**

- `options` (Object, optional): Thumbnail options
  - `quality` (number): JPEG quality 1-100 (default: 85)
  - `maxSize` (number): Maximum dimension (width or height)

**Returns:** `Promise<LibRawBufferResult>`

## File Output Operations

#### writePPM(filename)

Writes processed image as PPM file.

**Parameters:**

- `filename` (string): Output file path

**Returns:** `Promise<void>`

#### writeTIFF(filename)

Writes processed image as TIFF file.

**Parameters:**

- `filename` (string): Output file path

**Returns:** `Promise<void>`

#### writeThumbnail(filename)

Writes thumbnail as JPEG file.

**Parameters:**

- `filename` (string): Output file path

**Returns:** `Promise<void>`

## JPEG Conversion

#### convertToJPEG(outputPath, options)

Converts RAW to JPEG file with advanced options.

**Parameters:**

- `outputPath` (string): Output file path
- `options` (Object, optional): Same as `createJPEGBuffer` options

**Returns:** `Promise<LibRawJPEGResult>`

**Example:**

```javascript
const result = await processor.convertToJPEG("./output.jpg", {
  quality: 90,
  width: 2400,
});
console.log(`Saved: ${result.outputPath}`);
```

## Utility Functions

#### isFloatingPoint()

Checks if image uses floating point data.

**Returns:** `Promise<boolean>`

#### isFujiRotated()

Checks if image is from Fuji camera and rotated.

**Returns:** `Promise<boolean>`

#### isSRAW()

Checks if image is sRAW format.

**Returns:** `Promise<boolean>`

#### isJPEGThumb()

Checks if file contains JPEG thumbnail.

**Returns:** `Promise<boolean>`

#### errorCount()

Gets current error count.

**Returns:** `Promise<number>`

## Static Methods

#### LibRaw.getVersion()

Gets LibRaw library version.

**Returns:** `string`

#### LibRaw.getCapabilities()

Gets LibRaw library capabilities bitmask.

**Returns:** `number`

#### LibRaw.getCameraList()

Gets list of supported camera models.

**Returns:** `string[]`

#### LibRaw.getCameraCount()

Gets count of supported camera models.

**Returns:** `number`

## Buffer Result Format

All buffer methods return a `LibRawBufferResult` object:

```javascript
{
    success: true,
    buffer: Buffer,         // The actual image data
    metadata: {
        originalDimensions: { width: 8192, height: 5464 },
        outputDimensions: { width: 1920, height: 1280 },
        fileSize: {
            original: 134217728,
            compressed: 1048576,
            compressionRatio: "128.0"
        },
        processing: {
            timeMs: "450.25",
            throughputMBps: "297.3"
        },
        jpegOptions: { /* applied options */ }
    }
}
```

## Usage Patterns

### Traditional File-based Processing

```javascript
const processor = new LibRaw();
await processor.loadFile("input.cr2");
await processor.processImage();
await processor.writeTIFF("output.tiff");
await processor.close();
```

### Modern Buffer-based Processing

```javascript
const processor = new LibRaw();
await processor.loadFile("input.cr2");

// Create multiple formats in parallel
const [jpeg, webp, thumbnail] = await Promise.all([
  processor.createJPEGBuffer({ quality: 85, width: 1920 }),
  processor.createWebPBuffer({ quality: 80, width: 1920 }),
  processor.createThumbnailJPEGBuffer({ maxSize: 300 }),
]);

// Use buffers directly (no file I/O)
await uploadToCloud("image.jpg", jpeg.buffer);
await uploadToCloud("image.webp", webp.buffer);
await uploadToCloud("thumb.jpg", thumbnail.buffer);

await processor.close();
```

### Web API Integration

```javascript
app.post("/convert", async (req, res) => {
  const processor = new LibRaw();

  try {
    await processor.loadBuffer(req.body);
    const result = await processor.createJPEGBuffer({
      quality: 85,
      width: 1920,
    });

    res.set("Content-Type", "image/jpeg");
    res.send(result.buffer);
  } finally {
    await processor.close();
  }
});
```

## Error Handling

Always wrap LibRaw operations in try/catch blocks and ensure proper cleanup:

```javascript
const processor = new LibRaw();

try {
  await processor.loadFile("input.cr2");
  const result = await processor.createJPEGBuffer({ quality: 85 });
  return result;
} catch (error) {
  console.error("Processing failed:", error.message);
  throw error;
} finally {
  await processor.close(); // Always cleanup
}
```

#### getImageSize()

Gets the dimensions of the loaded RAW image.

**Returns:** `Promise<LibRawImageSize>`

**Example:**

```javascript
const size = await processor.getImageSize();
console.log(`Resolution: ${size.width}x${size.height}`);
```

#### close()

Closes the processor and frees resources.

**Returns:** `Promise<void>`

**Example:**

```javascript
await processor.close();
```

## Interfaces

### LibRawMetadata

```typescript
interface LibRawMetadata {
  make: string; // Camera manufacturer
  model: string; // Camera model
  iso: number; // ISO sensitivity
  aperture: number; // Aperture f-number
  shutterSpeed: number; // Shutter speed in seconds
  focalLength: number; // Focal length in mm
  timestamp: number; // Unix timestamp
  colors: number; // Number of color channels
  filters: number; // Color filter pattern
  description?: string; // Camera description
  artist?: string; // Photographer name
  copyright?: string; // Copyright info
}
```

### LibRawImageSize

```typescript
interface LibRawImageSize {
  width: number; // Image width in pixels
  height: number; // Image height in pixels
}
```

## Supported Formats

| Format  | Extension | Manufacturer  | Description              |
| ------- | --------- | ------------- | ------------------------ |
| NEF     | .nef      | Nikon         | Nikon Electronic Format  |
| CR2/CR3 | .cr2/.cr3 | Canon         | Canon RAW version 2/3    |
| ARW     | .arw      | Sony          | Sony Alpha RAW           |
| RAF     | .raf      | Fujifilm      | Fuji RAW Format          |
| RW2     | .rw2      | Panasonic     | Panasonic RAW version 2  |
| DNG     | .dng      | Adobe/Various | Digital Negative (Adobe) |

## Error Handling

All methods return Promises and may throw errors. Always use try-catch or .catch():

```javascript
try {
  await processor.loadFile("image.nef");
  const metadata = await processor.getMetadata();
  console.log(metadata);
} catch (error) {
  console.error("Processing failed:", error.message);
} finally {
  await processor.close();
}
```

## Complete Example

```javascript
const LibRaw = require("lightdrift-libraw");

async function processRAWFile(filepath) {
  const processor = new LibRaw();

  try {
    // Load the RAW file
    await processor.loadFile(filepath);

    // Extract metadata
    const metadata = await processor.getMetadata();
    const size = await processor.getImageSize();

    // Display information
    console.log(`Camera: ${metadata.make} ${metadata.model}`);
    console.log(`Resolution: ${size.width}x${size.height}`);
    console.log(
      `Settings: ISO ${metadata.iso}, f/${metadata.aperture}, 1/${Math.round(
        1 / metadata.shutterSpeed
      )}s`
    );

    return { metadata, size };
  } catch (error) {
    console.error("Error processing file:", error.message);
    throw error;
  } finally {
    // Always cleanup
    await processor.close();
  }
}

// Usage
processRAWFile("/path/to/image.nef")
  .then((result) => console.log("Processing complete"))
  .catch((error) => console.error("Failed:", error));
```
