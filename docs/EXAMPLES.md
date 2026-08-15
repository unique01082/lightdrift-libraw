# Usage Examples

> **Compatibility note:** This document was written for the deprecated beta
> API and is retained for `lightdrift-libraw/legacy` users. New applications
> should start with the [stable getting-started guide](getting-started.md) and
> use the named `LibRaw` export from the package root.

## Basic RAW File Processing

```javascript
const LibRaw = require("lightdrift-libraw");

async function basicExample() {
  const processor = new LibRaw();

  try {
    await processor.loadFile("photo.nef");
    const metadata = await processor.getMetadata();
    const size = await processor.getImageSize();

    console.log(`📷 ${metadata.make} ${metadata.model}`);
    console.log(`📐 ${size.width}x${size.height} pixels`);
    console.log(`⚙️  ISO ${metadata.iso}, f/${metadata.aperture}`);
  } finally {
    await processor.close();
  }
}
```

## Batch Processing Multiple Files

```javascript
const fs = require("fs");
const path = require("path");

async function batchProcess(directory) {
  const files = fs
    .readdirSync(directory)
    .filter((file) =>
      [".nef", ".cr3", ".arw"].includes(path.extname(file).toLowerCase())
    );

  const results = [];

  for (const file of files) {
    const processor = new LibRaw();
    try {
      await processor.loadFile(path.join(directory, file));
      const metadata = await processor.getMetadata();
      const size = await processor.getImageSize();

      results.push({
        filename: file,
        camera: `${metadata.make} ${metadata.model}`,
        megapixels: ((size.width * size.height) / 1000000).toFixed(1),
        iso: metadata.iso,
        captureDate: new Date(metadata.timestamp * 1000),
      });
    } catch (error) {
      console.error(`Failed to process ${file}: ${error.message}`);
    } finally {
      await processor.close();
    }
  }

  return results;
}
```

## Photo Gallery Metadata Extraction

```javascript
async function extractGalleryMetadata(photoPath) {
  const processor = new LibRaw();

  try {
    await processor.loadFile(photoPath);
    const metadata = await processor.getMetadata();
    const size = await processor.getImageSize();

    return {
      // Basic info
      camera: {
        make: metadata.make,
        model: metadata.model,
      },

      // Technical settings
      settings: {
        iso: metadata.iso,
        aperture: metadata.aperture,
        shutterSpeed: metadata.shutterSpeed,
        focalLength: metadata.focalLength,
      },

      // Image specs
      image: {
        width: size.width,
        height: size.height,
        megapixels: Number(((size.width * size.height) / 1000000).toFixed(1)),
        aspectRatio: (size.width / size.height).toFixed(2),
      },

      // Capture info
      capture: {
        timestamp: metadata.timestamp,
        date: new Date(metadata.timestamp * 1000).toISOString(),
        artist: metadata.artist,
        copyright: metadata.copyright,
      },
    };
  } finally {
    await processor.close();
  }
}
```

## Performance Monitoring

```javascript
async function monitoredProcessing(filepath) {
  const processor = new LibRaw();
  const startTime = Date.now();

  try {
    console.time("Total Processing");

    console.time("File Loading");
    await processor.loadFile(filepath);
    console.timeEnd("File Loading");

    console.time("Metadata Extraction");
    const metadata = await processor.getMetadata();
    console.timeEnd("Metadata Extraction");

    console.time("Size Detection");
    const size = await processor.getImageSize();
    console.timeEnd("Size Detection");

    console.timeEnd("Total Processing");

    const fileStats = require("fs").statSync(filepath);
    const throughput =
      ((fileStats.size / (Date.now() - startTime)) * 1000) / 1024 / 1024;

    console.log(`📊 Throughput: ${throughput.toFixed(2)} MB/s`);

    return { metadata, size };
  } finally {
    await processor.close();
  }
}
```

## Error Handling Best Practices

```javascript
async function robustProcessing(filepath) {
  const processor = new LibRaw();

  try {
    // Validate file exists
    if (!require("fs").existsSync(filepath)) {
      throw new Error(`File not found: ${filepath}`);
    }

    // Check file extension
    const ext = require("path").extname(filepath).toLowerCase();
    const supported = [".nef", ".cr2", ".cr3", ".arw", ".raf", ".rw2", ".dng"];
    if (!supported.includes(ext)) {
      throw new Error(`Unsupported format: ${ext}`);
    }

    await processor.loadFile(filepath);

    // Extract with timeout
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Processing timeout")), 30000)
    );

    const processing = Promise.all([
      processor.getMetadata(),
      processor.getImageSize(),
    ]);

    const [metadata, size] = await Promise.race([processing, timeout]);

    return { metadata, size, success: true };
  } catch (error) {
    console.error(`Processing error for ${filepath}:`, error.message);
    return { error: error.message, success: false };
  } finally {
    try {
      await processor.close();
    } catch (closeError) {
      console.warn("Warning: Failed to close processor:", closeError.message);
    }
  }
}
```

## Integration with Express.js

```javascript
const express = require("express");
const multer = require("multer");
const LibRaw = require("lightdrift-libraw");

const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/analyze-raw", upload.single("rawFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const processor = new LibRaw();

  try {
    await processor.loadFile(req.file.path);
    const metadata = await processor.getMetadata();
    const size = await processor.getImageSize();

    res.json({
      success: true,
      data: {
        camera: `${metadata.make} ${metadata.model}`,
        resolution: `${size.width}x${size.height}`,
        settings: {
          iso: metadata.iso,
          aperture: metadata.aperture,
          shutterSpeed: metadata.shutterSpeed,
          focalLength: metadata.focalLength,
        },
        captureDate: new Date(metadata.timestamp * 1000).toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    await processor.close();
    // Clean up uploaded file
    require("fs").unlinkSync(req.file.path);
  }
});
```
