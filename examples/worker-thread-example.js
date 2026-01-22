/**
 * Example: Worker Thread Processing
 * Demonstrates parallel RAW image processing using worker threads
 */

// worker.js - Save this as a separate file
const workerCode = `
const { parentPort, workerData } = require('worker_threads');
const path = require('path');
const LibRaw = require(path.join(__dirname, '..', 'lib', 'index.js'));

async function process() {
  const processor = new LibRaw();
  
  try {
    const result = await processor.processRawThumbnail({
      filePath: workerData.filePath,
      format: workerData.format || 'jpeg',
      maxSize: workerData.maxSize || 800,
      quality: workerData.quality || 85,
      tryEmbedded: true
    });
    
    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: {
        message: error.message,
        code: error.code || 'PROCESSING_ERROR'
      }
    });
  }
}

process();
`;

// Save worker code to file
const fs = require("fs");
const path = require("path");
const { Worker } = require("worker_threads");

const WORKER_FILE = path.join(__dirname, "thumbnail-worker-temp.js");
fs.writeFileSync(WORKER_FILE, workerCode);

// Simple worker pool implementation
class WorkerPool {
  constructor(workerScript, poolSize = 4) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
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
    while (this.activeWorkers > 0 || this.queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// Example usage
async function main() {
  console.log("Worker Thread Example - Parallel RAW Processing");
  console.log("=".repeat(70));

  // Example files (replace with your actual RAW files)
  const testFiles = [
    path.join(__dirname, "../sample-images/DSC_0006.NEF"),
    // Add more files to see parallel processing benefits
  ];

  if (!fs.existsSync(testFiles[0])) {
    console.error("Error: Test file not found:", testFiles[0]);
    console.log("Please provide valid RAW file paths");
    return;
  }

  // Test 1: Single worker
  console.log("\n[Test 1] Single Worker Processing");
  console.log("-".repeat(70));

  const startSingle = Date.now();

  const singleResult = await new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_FILE, {
      workerData: {
        filePath: testFiles[0],
        format: "jpeg",
        maxSize: 800,
        quality: 85,
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

  const endSingle = Date.now();

  if (singleResult.success) {
    console.log("✓ Processing completed");
    console.log(`  Format: ${singleResult.format}`);
    console.log(`  Size: ${(singleResult.fileSize / 1024).toFixed(2)} KB`);
    console.log(
      `  Dimensions: ${singleResult.dimensions.width}x${singleResult.dimensions.height}`
    );
    console.log(`  Used embedded: ${singleResult.usedEmbedded}`);
    console.log(`  Worker time: ${endSingle - startSingle} ms`);
    console.log(`  Internal time: ${singleResult.processingTimeMs} ms`);
  } else {
    console.error("✗ Processing failed:", singleResult.error.message);
  }

  // Test 2: Worker pool with multiple formats
  console.log("\n[Test 2] Worker Pool - Multiple Formats");
  console.log("-".repeat(70));

  const pool = new WorkerPool(WORKER_FILE, 4);
  const formats = ["jpeg", "png", "webp"];

  const startPool = Date.now();

  const poolResults = await Promise.all(
    formats.map((format) =>
      pool.execute({
        filePath: testFiles[0],
        format,
        maxSize: 800,
        quality: format !== "png" ? 85 : undefined,
        compressionLevel: format === "png" ? 6 : undefined,
      })
    )
  );

  await pool.close();

  const endPool = Date.now();

  console.log(`✓ Processed ${formats.length} formats in parallel`);
  poolResults.forEach((result, index) => {
    if (result.success) {
      console.log(
        `  ${formats[index].toUpperCase()}: ${(result.fileSize / 1024).toFixed(
          2
        )} KB (${result.processingTimeMs} ms)`
      );
    }
  });
  console.log(`Total time: ${endPool - startPool} ms`);

  // Cleanup
  try {
    fs.unlinkSync(WORKER_FILE);
  } catch (err) {
    // Ignore cleanup errors
  }

  console.log("\n" + "=".repeat(70));
  console.log("Example completed successfully!");
  console.log("\nKey Benefits:");
  console.log("  • Non-blocking main thread");
  console.log("  • Parallel processing of multiple files");
  console.log("  • Scalable to any number of CPU cores");
  console.log("  • Memory-efficient with proper cleanup");
  console.log("\nSee docs/WORKER_THREADS.md for more examples");
  console.log("=".repeat(70));
}

// Run example
main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
