# Worker Thread Support

## Overview

As of version 1.0.0-beta.1, **lightdrift-libraw** is fully compatible with Node.js worker threads, enabling true parallel processing of RAW images across multiple CPU cores.

## Key Features

✅ **Thread-Safe Native Bindings** - Context-aware N-API initialization  
✅ **Isolated Instances** - Each worker gets its own LibRaw instance  
✅ **Structured Clone Support** - All return values are serializable  
✅ **Memory Safe** - Proper cleanup prevents memory leaks  
✅ **High-Level API** - Single-call `processRawThumbnail()` method

## Why Worker Threads?

Processing RAW images is CPU-intensive. Worker threads allow you to:

- **Parallel Processing** - Process multiple images simultaneously
- **Non-Blocking** - Keep your main thread responsive
- **Scalable** - Utilize all CPU cores efficiently
- **Isolated** - Each worker has independent memory and state

## Quick Start

### Basic Worker Example

```javascript
// worker.js
const { parentPort, workerData } = require("worker_threads");
const LibRaw = require("lightdrift-libraw");

async function processImage() {
  const processor = new LibRaw();

  try {
    await processor.loadFile(workerData.filePath);
    await processor.processImage();

    const result = await processor.createJPEGBuffer({
      quality: 85,
      width: 800,
    });

    await processor.close();

    parentPort.postMessage({
      success: true,
      buffer: result.buffer,
      dimensions: result.metadata.dimensions,
    });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message,
    });
  }
}

processImage();
```

```javascript
// main.js
const { Worker } = require("worker_threads");

const worker = new Worker("./worker.js", {
  workerData: { filePath: "./image.cr2" },
});

worker.on("message", (result) => {
  if (result.success) {
    console.log("Processed:", result.dimensions);
    // result.buffer contains the JPEG
  }
});
```

## High-Level API (Recommended)

The `processRawThumbnail()` method is optimized for worker threads with a single serialization boundary:

### Worker Implementation

```javascript
// thumbnail-worker.js
const { parentPort, workerData } = require("worker_threads");
const LibRaw = require("lightdrift-libraw");

async function processThumbnail() {
  const processor = new LibRaw();

  try {
    const result = await processor.processRawThumbnail({
      filePath: workerData.filePath,
      format: workerData.format || "jpeg",
      maxSize: workerData.maxSize || 800,
      quality: workerData.quality || 85,
      tryEmbedded: true, // Use embedded thumbnail if available
    });

    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: {
        message: error.message,
        code: error.code || "PROCESSING_ERROR",
      },
    });
  }
}

processThumbnail();
```

### Main Thread Usage

```javascript
// main.js
const { Worker } = require("worker_threads");
const path = require("path");

function processInWorker(filePath, options = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./thumbnail-worker.js", {
      workerData: {
        filePath,
        format: options.format || "jpeg",
        maxSize: options.maxSize || 800,
        quality: options.quality || 85,
      },
    });

    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}

// Use it
async function main() {
  const result = await processInWorker("./photos/IMG_1234.CR2", {
    format: "jpeg",
    maxSize: 1200,
    quality: 90,
  });

  if (result.success) {
    console.log(`Processed: ${result.format}`);
    console.log(`Size: ${result.fileSize} bytes`);
    console.log(
      `Dimensions: ${result.dimensions.width}x${result.dimensions.height}`
    );
    console.log(`Used embedded: ${result.usedEmbedded}`);
    console.log(`Time: ${result.processingTimeMs} ms`);

    // result.buffer is your image
  }
}
```

## Worker Pool Pattern

For batch processing, use a worker pool:

```javascript
const { Worker } = require("worker_threads");
const os = require("os");

class WorkerPool {
  constructor(workerScript, poolSize = os.cpus().length) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.queue = [];
    this.activeWorkers = 0;
  }

  async execute(workerData) {
    return new Promise((resolve, reject) => {
      const task = { workerData, resolve, reject };

      if (this.activeWorkers < this.poolSize) {
        this._runTask(task);
      } else {
        this.queue.push(task);
      }
    });
  }

  _runTask(task) {
    this.activeWorkers++;

    const worker = new Worker(this.workerScript, {
      workerData: task.workerData,
    });

    worker.on("message", (result) => {
      task.resolve(result);
      this._onWorkerDone();
    });

    worker.on("error", (error) => {
      task.reject(error);
      this._onWorkerDone();
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        task.reject(new Error(`Worker exited with code ${code}`));
      }
      this._onWorkerDone();
    });
  }

  _onWorkerDone() {
    this.activeWorkers--;

    if (this.queue.length > 0) {
      const nextTask = this.queue.shift();
      this._runTask(nextTask);
    }
  }

  async close() {
    // Wait for all active tasks to complete
    while (this.activeWorkers > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// Usage
async function processBatch(filePaths) {
  const pool = new WorkerPool("./thumbnail-worker.js", 8);

  const results = await Promise.all(
    filePaths.map((filePath) =>
      pool.execute({
        filePath,
        format: "jpeg",
        maxSize: 800,
        quality: 85,
      })
    )
  );

  await pool.close();
  return results;
}
```

## API Methods (All Worker-Safe)

All existing methods work in worker threads:

### File Loading

```javascript
await processor.loadFile(filePath);
await processor.loadBuffer(buffer);
```

### Processing

```javascript
await processor.processImage();
await processor.unpackThumbnail();
```

### Buffer Creation

```javascript
await processor.createJPEGBuffer({ quality: 90, width: 800 });
await processor.createPNGBuffer({ width: 800, compressionLevel: 6 });
await processor.createWebPBuffer({ quality: 85, width: 800 });
await processor.createThumbnailJPEGBuffer({ maxSize: 400, quality: 85 });
```

### Metadata

```javascript
const metadata = await processor.getMetadata();
```

### Cleanup

```javascript
await processor.close(); // Always call this!
```

## Memory Management

### Memory Usage Per Worker

- **Peak memory**: 50-200 MB (depends on RAW file size)
- **Duration**: ~500-2000ms per request
- **Recommendation**: Don't cache LibRaw instances between calls

### Best Practices

```javascript
// ✅ Good - Create new instance per task
async function processImage(filePath) {
  const processor = new LibRaw();
  try {
    await processor.loadFile(filePath);
    const result = await processor.processImage();
    return result;
  } finally {
    await processor.close(); // Always cleanup
  }
}

// ❌ Bad - Reusing instance can leak memory
const processor = new LibRaw(); // DON'T DO THIS
async function processImage(filePath) {
  await processor.loadFile(filePath);
  return await processor.processImage();
}
```

### Memory Leak Prevention

```javascript
// Use try-finally to ensure cleanup
async function safeProcess(filePath) {
  const processor = new LibRaw();

  try {
    await processor.loadFile(filePath);
    return await processor.createJPEGBuffer({ quality: 85, width: 800 });
  } catch (error) {
    console.error("Processing failed:", error);
    throw error;
  } finally {
    // This runs even if error is thrown
    await processor.close();
  }
}
```

## Error Handling

All errors are serializable (plain Error objects):

```javascript
// In worker
try {
  await processor.loadFile(invalidPath);
} catch (error) {
  // Error is serializable
  parentPort.postMessage({
    success: false,
    error: {
      message: error.message,
      code: "LOAD_FAILED",
    },
  });
}
```

## Performance Tips

1. **Use `tryEmbedded: true`** for thumbnails - 10-50x faster
2. **Batch processing** - Use worker pools for multiple files
3. **Limit concurrency** - Don't spawn more workers than CPU cores
4. **Reuse worker scripts** - Worker creation has overhead
5. **Profile memory** - Monitor RSS if processing large files

## Testing

Run the worker thread test suite:

```bash
npm run test:workers
```

Run memory leak tests:

```bash
npm run test:worker-memory
```

## Troubleshooting

### "Cannot find module" in worker

Make sure you're using absolute paths or proper module resolution:

```javascript
const LibRaw = require("lightdrift-libraw"); // ✅ Works
const LibRaw = require("../lib/index.js"); // ✅ Works with absolute path
```

### Memory keeps growing

Ensure you're calling `close()` on every instance:

```javascript
// Add this to verify cleanup
process.on("exit", () => {
  console.log("Final memory:", process.memoryUsage());
});
```

### Worker exits unexpectedly

Check for unhandled promise rejections:

```javascript
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  process.exit(1);
});
```

## Thread Safety Guarantees

- ✅ Each worker gets its own LibRaw instance
- ✅ No shared global state between instances
- ✅ Context-aware N-API initialization
- ✅ All return values support structured cloning
- ✅ Memory is properly released on `close()`

## Limitations

- Workers cannot share LibRaw instances
- File I/O is still synchronous within LibRaw C++ library
- Worker creation has ~50ms overhead

## Examples

See the `/examples` directory for complete examples:

- `examples/worker-thumbnail.js` - Basic worker implementation
- `examples/worker-pool.js` - Production-ready worker pool
- `examples/batch-parallel.js` - Parallel batch processing

## Migration Guide

### Before (Single Thread)

```javascript
for (const file of files) {
  const processor = new LibRaw();
  await processor.loadFile(file);
  await processor.processImage();
  const result = await processor.createJPEGBuffer({ quality: 85 });
  await processor.close();
}
```

### After (Worker Threads)

```javascript
const pool = new WorkerPool("./worker.js", 8);

const results = await Promise.all(
  files.map((file) => pool.execute({ filePath: file }))
);

await pool.close();
```

**Result**: 8x faster on 8-core CPU! 🚀

## Support

- GitHub Issues: https://github.com/unique01082/lightdrift-libraw/issues
- Discussions: https://github.com/unique01082/lightdrift-libraw/discussions

---

**Version**: 1.0.0-beta.1  
**Last Updated**: January 2026
