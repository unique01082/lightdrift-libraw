# Worker Threads Quick Reference

## Installation
```bash
npm install lightdrift-libraw@1.0.0-beta.1
```

## Minimal Worker Example

### worker.js
```javascript
const { parentPort, workerData } = require('worker_threads');
const LibRaw = require('lightdrift-libraw');

async function process() {
  const processor = new LibRaw();
  const result = await processor.processRawThumbnail(workerData);
  parentPort.postMessage(result);
}
process();
```

### main.js
```javascript
const { Worker } = require('worker_threads');

const worker = new Worker('./worker.js', {
  workerData: {
    filePath: './photo.cr2',
    format: 'jpeg',
    maxSize: 800,
    quality: 85
  }
});

worker.on('message', (result) => {
  if (result.success) {
    console.log(`✓ ${result.fileSize} bytes`);
    // Use result.buffer
  }
});
```

## processRawThumbnail() Options

```typescript
{
  filePath: string;           // Required: Path to RAW file
  format: 'jpeg'|'png'|'webp'; // Required: Output format
  maxSize: number;            // Required: Max dimension
  quality?: number;           // JPEG/WebP: 1-100 (default: 85)
  compressionLevel?: number;  // PNG: 0-9 (default: 6)
  tryEmbedded?: boolean;      // Try embedded thumb first (default: true)
}
```

## Result Object

```typescript
{
  success: boolean;
  buffer: Buffer;              // Image data
  format: string;              // 'JPEG', 'PNG', 'WEBP'
  dimensions: { width, height };
  outputDimensions?: { width, height };
  usedEmbedded?: boolean;      // true if used embedded thumbnail
  processingTimeMs: string;
  fileSize: number;
}
```

## Worker Pool Pattern

```javascript
class WorkerPool {
  constructor(script, size = 4) {
    this.script = script;
    this.size = size;
    this.queue = [];
    this.active = 0;
  }

  async execute(data) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };
      
      if (this.active < this.size) {
        this._run(task);
      } else {
        this.queue.push(task);
      }
    });
  }

  _run(task) {
    this.active++;
    const worker = new Worker(this.script, { workerData: task.data });
    
    worker.on('message', (result) => {
      task.resolve(result);
      this._done();
    });
    
    worker.on('error', (err) => {
      task.reject(err);
      this._done();
    });
  }

  _done() {
    this.active--;
    if (this.queue.length > 0) {
      this._run(this.queue.shift());
    }
  }

  async close() {
    while (this.active > 0) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
}
```

## Usage with Pool

```javascript
const pool = new WorkerPool('./worker.js', 8);

const results = await Promise.all(
  files.map(file => pool.execute({
    filePath: file,
    format: 'jpeg',
    maxSize: 800,
    quality: 85
  }))
);

await pool.close();
```

## Memory Best Practices

✅ **DO:**
```javascript
async function process(file) {
  const processor = new LibRaw();
  try {
    return await processor.processRawThumbnail({ ... });
  } finally {
    await processor.close(); // Always cleanup
  }
}
```

❌ **DON'T:**
```javascript
const processor = new LibRaw(); // Don't reuse instances

async function process(file) {
  return await processor.processRawThumbnail({ ... });
  // Missing close() - memory leak!
}
```

## Performance Tips

1. **Use embedded thumbnails** - Set `tryEmbedded: true` (10-50x faster)
2. **Match pool size to cores** - `os.cpus().length`
3. **Batch in groups** - Don't spawn 1000 workers at once
4. **Monitor memory** - 50-200MB per worker
5. **Reuse worker scripts** - Worker creation has overhead

## Error Handling

```javascript
async function safeProcess(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', { workerData });
    
    worker.on('message', (result) => {
      if (result.success) {
        resolve(result);
      } else {
        reject(new Error(result.error.message));
      }
    });
    
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exit ${code}`));
      }
    });
  });
}
```

## Testing

```bash
# Run worker thread tests
npm run test:workers

# Run memory leak tests
npm run test:worker-memory

# Run example
node examples/worker-thread-example.js
```

## Documentation

- **Full Guide**: `docs/WORKER_THREADS.md`
- **API Reference**: `README.md#api-reference`
- **Examples**: `examples/worker-thread-example.js`

## Common Issues

**"Cannot find module"**
```javascript
// Use absolute paths or proper module resolution
const LibRaw = require('lightdrift-libraw'); // ✓
```

**Memory keeps growing**
```javascript
// Always call close()
try {
  // ... processing
} finally {
  await processor.close(); // ✓
}
```

**Worker exits unexpectedly**
```javascript
// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled:', error);
  process.exit(1);
});
```

## Benchmark Results

**Single Thread**: 1 file in 500ms  
**8 Workers**: 8 files in 550ms (8x faster!)  
**Embedded Thumbnail**: 1 file in 15ms (33x faster!)

---

**Version**: 1.0.0-beta.1  
**Full Docs**: https://github.com/unique01082/lightdrift-libraw
