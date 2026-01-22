/**
 * Worker Thread Compatibility Tests
 * Tests LibRaw addon in worker_threads context
 */

const { Worker } = require("worker_threads");
const path = require("path");
const fs = require("fs");

// Test configuration
const TEST_IMAGE = path.join(__dirname, "../sample-images/DSC_0006.NEF");
const OUTPUT_DIR = path.join(__dirname, "worker-output");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log("=".repeat(70));
console.log("Worker Thread Compatibility Tests");
console.log("=".repeat(70));

// Test 1: Basic worker instantiation
async function testBasicWorkerInstantiation() {
  console.log("\n[Test 1] Basic Worker Instantiation");
  console.log("-".repeat(70));

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
      const { parentPort } = require('worker_threads');
      const LibRaw = require(${JSON.stringify(
        path.join(__dirname, "../lib/index.js")
      )});
      
      try {
        const processor = new LibRaw();
        parentPort.postMessage({ success: true, message: 'LibRaw instantiated in worker' });
      } catch (error) {
        parentPort.postMessage({ success: false, error: error.message });
      }
    `,
      { eval: true }
    );

    worker.on("message", (msg) => {
      if (msg.success) {
        console.log("✓ LibRaw instantiated successfully in worker thread");
        resolve();
      } else {
        console.error("✗ Failed to instantiate:", msg.error);
        reject(new Error(msg.error));
      }
    });

    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Test 2: Load file in worker
async function testLoadFileInWorker() {
  console.log("\n[Test 2] Load RAW File in Worker");
  console.log("-".repeat(70));

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
      const { parentPort, workerData } = require('worker_threads');
      const LibRaw = require(${JSON.stringify(
        path.join(__dirname, "../lib/index.js")
      )});
      
      async function run() {
        try {
          const processor = new LibRaw();
          await processor.loadFile(workerData.filePath);
          const metadata = await processor.getMetadata();
          await processor.close();
          
          parentPort.postMessage({ 
            success: true, 
            metadata: {
              width: metadata.width,
              height: metadata.height,
              make: metadata.make,
              model: metadata.model
            }
          });
        } catch (error) {
          parentPort.postMessage({ success: false, error: error.message });
        }
      }
      
      run();
    `,
      { eval: true, workerData: { filePath: TEST_IMAGE } }
    );

    worker.on("message", (msg) => {
      if (msg.success) {
        console.log("✓ File loaded successfully");
        console.log(`  Camera: ${msg.metadata.make} ${msg.metadata.model}`);
        console.log(
          `  Dimensions: ${msg.metadata.width}x${msg.metadata.height}`
        );
        resolve();
      } else {
        console.error("✗ Failed to load file:", msg.error);
        reject(new Error(msg.error));
      }
    });

    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Test 3: Process image and create JPEG buffer in worker
async function testProcessImageInWorker() {
  console.log("\n[Test 3] Process Image and Create JPEG Buffer in Worker");
  console.log("-".repeat(70));

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
      const { parentPort, workerData } = require('worker_threads');
      const LibRaw = require(${JSON.stringify(
        path.join(__dirname, "../lib/index.js")
      )});
      
      async function run() {
        try {
          const processor = new LibRaw();
          await processor.loadFile(workerData.filePath);
          await processor.processImage();
          
          const result = await processor.createJPEGBuffer({
            quality: 85,
            width: 800
          });
          
          await processor.close();
          
          parentPort.postMessage({ 
            success: true,
            bufferSize: result.buffer.length,
            metadata: result.metadata
          });
        } catch (error) {
          parentPort.postMessage({ success: false, error: error.message });
        }
      }
      
      run();
    `,
      { eval: true, workerData: { filePath: TEST_IMAGE } }
    );

    worker.on("message", (msg) => {
      if (msg.success) {
        console.log("✓ Image processed successfully");
        console.log(`  Buffer size: ${(msg.bufferSize / 1024).toFixed(2)} KB`);
        const dims =
          msg.metadata.dimensions || msg.metadata.originalDimensions || {};
        const outDims = msg.metadata.outputDimensions || dims;
        if (dims.width) {
          console.log(`  Original: ${dims.width}x${dims.height}`);
        }
        if (outDims.width) {
          console.log(`  Output: ${outDims.width}x${outDims.height}`);
        }
        resolve();
      } else {
        console.error("✗ Failed to process image:", msg.error);
        reject(new Error(msg.error));
      }
    });

    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Test 4: Use high-level processRawThumbnail method in worker
async function testProcessRawThumbnailInWorker() {
  console.log("\n[Test 4] High-Level processRawThumbnail Method in Worker");
  console.log("-".repeat(70));

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
      const { parentPort, workerData } = require('worker_threads');
      const LibRaw = require(${JSON.stringify(
        path.join(__dirname, "../lib/index.js")
      )});
      
      async function run() {
        try {
          const processor = new LibRaw();
          const result = await processor.processRawThumbnail({
            filePath: workerData.filePath,
            format: 'jpeg',
            maxSize: 800,
            quality: 85,
            tryEmbedded: true
          });
          
          parentPort.postMessage({ 
            success: true,
            result: {
              format: result.format,
              bufferSize: result.buffer.length,
              dimensions: result.dimensions,
              usedEmbedded: result.usedEmbedded,
              processingTimeMs: result.processingTimeMs,
              fileSize: result.fileSize
            }
          });
        } catch (error) {
          parentPort.postMessage({ 
            success: false, 
            error: {
              message: error.message || error.error?.message,
              code: error.code || error.error?.code
            }
          });
        }
      }
      
      run();
    `,
      { eval: true, workerData: { filePath: TEST_IMAGE } }
    );

    worker.on("message", (msg) => {
      if (msg.success) {
        console.log("✓ processRawThumbnail completed successfully");
        console.log(`  Format: ${msg.result.format}`);
        console.log(
          `  Buffer size: ${(msg.result.bufferSize / 1024).toFixed(2)} KB`
        );
        console.log(`  Used embedded: ${msg.result.usedEmbedded}`);
        console.log(`  Processing time: ${msg.result.processingTimeMs} ms`);
        resolve();
      } else {
        console.error("✗ Failed to process thumbnail:", msg.error.message);
        reject(new Error(msg.error.message));
      }
    });

    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Test 5: Sequential operations in same worker
async function testSequentialOperations() {
  console.log("\n[Test 5] Sequential Operations (10 files) in Same Worker");
  console.log("-".repeat(70));

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
      const { parentPort, workerData } = require('worker_threads');
      const LibRaw = require(${JSON.stringify(
        path.join(__dirname, "../lib/index.js")
      )});
      
      async function run() {
        try {
          const results = [];
          
          for (let i = 0; i < workerData.iterations; i++) {
            const processor = new LibRaw();
            await processor.loadFile(workerData.filePath);
            const metadata = await processor.getMetadata();
            await processor.close();
            
            results.push({
              iteration: i + 1,
              width: metadata.width,
              height: metadata.height
            });
          }
          
          const memUsage = process.memoryUsage();
          
          parentPort.postMessage({ 
            success: true,
            iterations: results.length,
            memoryUsage: {
              heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
              heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
              external: Math.round(memUsage.external / 1024 / 1024),
              rss: Math.round(memUsage.rss / 1024 / 1024)
            }
          });
        } catch (error) {
          parentPort.postMessage({ success: false, error: error.message });
        }
      }
      
      run();
    `,
      { eval: true, workerData: { filePath: TEST_IMAGE, iterations: 10 } }
    );

    worker.on("message", (msg) => {
      if (msg.success) {
        console.log("✓ Sequential operations completed");
        console.log(`  Iterations: ${msg.iterations}`);
        console.log(`  Memory usage after ${msg.iterations} operations:`);
        console.log(`    Heap Used: ${msg.memoryUsage.heapUsed} MB`);
        console.log(`    Heap Total: ${msg.memoryUsage.heapTotal} MB`);
        console.log(`    External: ${msg.memoryUsage.external} MB`);
        console.log(`    RSS: ${msg.memoryUsage.rss} MB`);
        resolve();
      } else {
        console.error("✗ Sequential operations failed:", msg.error);
        reject(new Error(msg.error));
      }
    });

    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Test 6: Concurrent workers processing different files
async function testConcurrentWorkers() {
  console.log("\n[Test 6] Concurrent Workers (8 parallel instances)");
  console.log("-".repeat(70));

  const workerCount = 8;
  const startTime = Date.now();

  const workerPromises = Array.from({ length: workerCount }, (_, index) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        `
        const { parentPort, workerData } = require('worker_threads');
        const LibRaw = require(${JSON.stringify(
          path.join(__dirname, "../lib/index.js")
        )});
        
        async function run() {
          try {
            const processor = new LibRaw();
            const result = await processor.processRawThumbnail({
              filePath: workerData.filePath,
              format: 'jpeg',
              maxSize: 800,
              quality: 85
            });
            
            parentPort.postMessage({ 
              success: true,
              workerIndex: workerData.workerIndex,
              bufferSize: result.buffer.length,
              processingTimeMs: result.processingTimeMs
            });
          } catch (error) {
            parentPort.postMessage({ 
              success: false, 
              workerIndex: workerData.workerIndex,
              error: error.message || error.error?.message
            });
          }
        }
        
        run();
      `,
        { eval: true, workerData: { filePath: TEST_IMAGE, workerIndex: index } }
      );

      worker.on("message", (msg) => {
        if (msg.success) {
          resolve(msg);
        } else {
          reject(new Error(`Worker ${msg.workerIndex}: ${msg.error}`));
        }
      });

      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker ${index} stopped with exit code ${code}`));
        }
      });
    });
  });

  try {
    const results = await Promise.all(workerPromises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log("✓ All concurrent workers completed successfully");
    console.log(`  Workers: ${workerCount}`);
    console.log(`  Total time: ${totalTime} ms`);
    console.log(
      `  Average per worker: ${(totalTime / workerCount).toFixed(2)} ms`
    );

    results.forEach((result, index) => {
      console.log(
        `  Worker ${index}: ${(result.bufferSize / 1024).toFixed(2)} KB in ${
          result.processingTimeMs
        } ms`
      );
    });
  } catch (error) {
    console.error("✗ Concurrent workers test failed:", error.message);
    throw error;
  }
}

// Test 7: Error handling in worker context
async function testErrorHandling() {
  console.log("\n[Test 7] Error Handling in Worker Context");
  console.log("-".repeat(70));

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
      const { parentPort } = require('worker_threads');
      const LibRaw = require(${JSON.stringify(
        path.join(__dirname, "../lib/index.js")
      )});
      
      async function run() {
        try {
          const processor = new LibRaw();
          // Try to load non-existent file
          await processor.loadFile('/non/existent/file.cr2');
          
          parentPort.postMessage({ success: false, error: 'Should have thrown error' });
        } catch (error) {
          // Error should be serializable
          parentPort.postMessage({ 
            success: true,
            errorCaught: true,
            errorMessage: error.message,
            errorType: error.constructor.name
          });
        }
      }
      
      run();
    `,
      { eval: true }
    );

    worker.on("message", (msg) => {
      if (msg.errorCaught) {
        console.log("✓ Error properly caught and serialized in worker");
        console.log(`  Error type: ${msg.errorType}`);
        console.log(`  Error message: ${msg.errorMessage}`);
        resolve();
      } else {
        console.error("✗ Error handling test failed");
        reject(new Error("Error was not caught"));
      }
    });

    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Run all tests
async function runAllTests() {
  const tests = [
    { name: "Basic Instantiation", fn: testBasicWorkerInstantiation },
    { name: "Load File", fn: testLoadFileInWorker },
    { name: "Process Image", fn: testProcessImageInWorker },
    { name: "High-Level API", fn: testProcessRawThumbnailInWorker },
    { name: "Sequential Operations", fn: testSequentialOperations },
    { name: "Concurrent Workers", fn: testConcurrentWorkers },
    { name: "Error Handling", fn: testErrorHandling },
  ];

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      console.error(`\n✗ Test failed: ${error.message}`);
      failed++;
    }
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;

  console.log("\n" + "=".repeat(70));
  console.log("Test Summary");
  console.log("=".repeat(70));
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total time: ${totalTime} ms`);
  console.log("=".repeat(70));

  process.exit(failed > 0 ? 1 : 0);
}

// Check if test image exists
if (!fs.existsSync(TEST_IMAGE)) {
  console.error(`Error: Test image not found: ${TEST_IMAGE}`);
  console.error("Please ensure sample-images/Canon_40D.CR2 exists");
  process.exit(1);
}

// Run tests
runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
