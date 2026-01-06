/**
 * Memory Leak Test for Worker Threads
 * Tests memory management across 100+ sequential operations
 */

const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

const TEST_IMAGE = path.join(__dirname, '../sample-images/DSC_0006.NEF');
const ITERATIONS = 100;

console.log('='.repeat(70));
console.log('Memory Leak Test for Worker Threads');
console.log('='.repeat(70));
console.log(`Testing ${ITERATIONS} sequential operations in worker thread`);
console.log('This may take a few minutes...\n');

if (!fs.existsSync(TEST_IMAGE)) {
  console.error(`Error: Test image not found: ${TEST_IMAGE}`);
  process.exit(1);
}

function runMemoryTest() {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort, workerData } = require('worker_threads');
      const LibRaw = require(${JSON.stringify(path.join(__dirname, '../lib/index.js'))});
      
      async function run() {
        try {
          const memSnapshots = [];
          const iterations = workerData.iterations;
          const reportInterval = Math.floor(iterations / 10); // Report every 10%
          
          for (let i = 0; i < iterations; i++) {
            // Create new processor instance
            const processor = new LibRaw();
            
            // Load and process
            await processor.loadFile(workerData.filePath);
            await processor.processImage();
            
            // Create buffer
            const result = await processor.createJPEGBuffer({
              quality: 85,
              width: 800
            });
            
            // Explicitly close
            await processor.close();
            
            // Force garbage collection if available
            if (global.gc) {
              global.gc();
            }
            
            // Take memory snapshot at intervals
            if ((i + 1) % reportInterval === 0 || i === 0 || i === iterations - 1) {
              const mem = process.memoryUsage();
              memSnapshots.push({
                iteration: i + 1,
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
                external: Math.round(mem.external / 1024 / 1024),
                rss: Math.round(mem.rss / 1024 / 1024)
              });
              
              parentPort.postMessage({
                type: 'progress',
                iteration: i + 1,
                total: iterations,
                percentage: Math.round(((i + 1) / iterations) * 100),
                memory: memSnapshots[memSnapshots.length - 1]
              });
            }
          }
          
          parentPort.postMessage({
            type: 'complete',
            success: true,
            iterations,
            memSnapshots
          });
          
        } catch (error) {
          parentPort.postMessage({
            type: 'error',
            success: false,
            error: error.message,
            stack: error.stack
          });
        }
      }
      
      run();
    `, { 
      eval: true, 
      workerData: { 
        filePath: TEST_IMAGE, 
        iterations: ITERATIONS 
      },
      // Enable --expose-gc for manual GC
      execArgv: ['--expose-gc']
    });

    const progressBar = (current, total, memory) => {
      const barLength = 40;
      const progress = current / total;
      const filled = Math.round(barLength * progress);
      const empty = barLength - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      
      process.stdout.write(
        `\r[${bar}] ${current}/${total} (${Math.round(progress * 100)}%) | ` +
        `Heap: ${memory.heapUsed}MB | RSS: ${memory.rss}MB`
      );
    };

    worker.on('message', (msg) => {
      if (msg.type === 'progress') {
        progressBar(msg.iteration, msg.total, msg.memory);
      } else if (msg.type === 'complete') {
        console.log('\n'); // New line after progress bar
        resolve(msg);
      } else if (msg.type === 'error') {
        console.log('\n'); // New line after progress bar
        reject(new Error(msg.error));
      }
    });

    worker.on('error', (error) => {
      console.log('\n');
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.log('\n');
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

async function analyzeMemoryLeaks(snapshots) {
  console.log('\n' + '='.repeat(70));
  console.log('Memory Analysis');
  console.log('='.repeat(70));
  
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  
  console.log('\nMemory at Start (Iteration 1):');
  console.log(`  Heap Used:  ${first.heapUsed} MB`);
  console.log(`  Heap Total: ${first.heapTotal} MB`);
  console.log(`  External:   ${first.external} MB`);
  console.log(`  RSS:        ${first.rss} MB`);
  
  console.log(`\nMemory at End (Iteration ${last.iteration}):`);
  console.log(`  Heap Used:  ${last.heapUsed} MB`);
  console.log(`  Heap Total: ${last.heapTotal} MB`);
  console.log(`  External:   ${last.external} MB`);
  console.log(`  RSS:        ${last.rss} MB`);
  
  console.log('\nMemory Growth:');
  const heapGrowth = last.heapUsed - first.heapUsed;
  const externalGrowth = last.external - first.external;
  const rssGrowth = last.rss - first.rss;
  
  console.log(`  Heap Used:  ${heapGrowth > 0 ? '+' : ''}${heapGrowth} MB`);
  console.log(`  External:   ${externalGrowth > 0 ? '+' : ''}${externalGrowth} MB`);
  console.log(`  RSS:        ${rssGrowth > 0 ? '+' : ''}${rssGrowth} MB`);
  
  // Calculate per-iteration growth
  const perIterationGrowth = heapGrowth / last.iteration;
  console.log(`\nPer-iteration heap growth: ${perIterationGrowth.toFixed(3)} MB`);
  
  // Detailed snapshots
  console.log('\nDetailed Memory Snapshots:');
  console.log('-'.repeat(70));
  console.log('Iter | Heap Used | Heap Total | External | RSS');
  console.log('-'.repeat(70));
  snapshots.forEach(snap => {
    console.log(
      `${String(snap.iteration).padStart(4)} | ` +
      `${String(snap.heapUsed).padStart(9)} | ` +
      `${String(snap.heapTotal).padStart(10)} | ` +
      `${String(snap.external).padStart(8)} | ` +
      `${String(snap.rss).padStart(3)}`
    );
  });
  
  // Memory leak detection
  console.log('\n' + '='.repeat(70));
  console.log('Leak Detection Analysis');
  console.log('='.repeat(70));
  
  // Check if memory keeps growing linearly
  const midpoint = snapshots[Math.floor(snapshots.length / 2)];
  const firstHalfGrowth = midpoint.heapUsed - first.heapUsed;
  const secondHalfGrowth = last.heapUsed - midpoint.heapUsed;
  
  console.log(`\nFirst half growth (1-${midpoint.iteration}): ${firstHalfGrowth} MB`);
  console.log(`Second half growth (${midpoint.iteration}-${last.iteration}): ${secondHalfGrowth} MB`);
  
  // Threshold for acceptable growth (considering JIT compilation, etc.)
  const ACCEPTABLE_GROWTH_MB = 50;
  const LEAK_THRESHOLD_MB = 100;
  
  let status = 'PASS';
  let message = 'No significant memory leak detected';
  
  if (heapGrowth > LEAK_THRESHOLD_MB) {
    status = 'FAIL';
    message = `Significant memory leak detected: ${heapGrowth} MB growth over ${last.iteration} iterations`;
  } else if (heapGrowth > ACCEPTABLE_GROWTH_MB) {
    status = 'WARNING';
    message = `Moderate memory growth: ${heapGrowth} MB. This may be acceptable depending on usage patterns.`;
  }
  
  console.log(`\nStatus: ${status}`);
  console.log(`Result: ${message}`);
  
  // Check for consistent growth pattern (indicator of leak)
  if (secondHalfGrowth > firstHalfGrowth * 0.8) {
    console.log('\nWarning: Memory growth pattern suggests potential leak');
    console.log('Memory continues to grow in second half of test');
  } else {
    console.log('\nMemory growth stabilized in second half - likely no leak');
  }
  
  console.log('='.repeat(70));
  
  return {
    passed: status === 'PASS',
    status,
    message,
    heapGrowth,
    perIterationGrowth
  };
}

async function main() {
  const startTime = Date.now();
  
  try {
    const result = await runMemoryTest();
    
    if (!result.success) {
      console.error('Test failed:', result.error);
      process.exit(1);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`\nCompleted ${result.iterations} iterations in ${(totalTime / 1000).toFixed(2)} seconds`);
    console.log(`Average time per iteration: ${(totalTime / result.iterations).toFixed(2)} ms`);
    
    const analysis = await analyzeMemoryLeaks(result.memSnapshots);
    
    console.log(`\nOverall: ${analysis.status}`);
    process.exit(analysis.passed ? 0 : 1);
    
  } catch (error) {
    console.error('\nTest error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
