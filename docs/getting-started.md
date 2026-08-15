# Getting started

`lightdrift-libraw` decodes camera RAW data locally inside Node.js. Supported
systems install a prebuilt native addon, so the first decode does not require a
compiler or a separate LibRaw installation.

## Prerequisites

- Node.js 22 or 24.
- Linux glibc x64/arm64, macOS x64/arm64, or Windows x64.
- A complete RAW file or buffer. The stable API is not an incremental stream
  decoder.

If a prebuilt binary is unavailable, follow the documented
[source-build fallback](source-build.md).

## Install

Install the current release candidate from the `next` dist-tag:

```bash
npm install lightdrift-libraw@next
```

Confirm that the JavaScript package and native addon load:

```bash
node -e "const { LibRaw } = require('lightdrift-libraw'); console.log(LibRaw.version())"
```

Expected output:

```text
0.22.2
```

## Decode a file with ESM

This example decodes a RAW file, resizes it inside the output bounds, encodes a
JPEG, and writes the copied result buffer to disk.

```js
import { writeFile } from "node:fs/promises";
import { LibRaw, LibRawError } from "lightdrift-libraw";

const raw = new LibRaw();

try {
  await raw.loadFile("photo.nef");
  const image = await raw.createJPEGBuffer({
    width: 1920,
    height: 1920,
    quality: 85,
    progressive: true,
  });

  await writeFile("photo.jpg", image.data);
  console.log(`${image.width}x${image.height} · ${image.size} bytes`);
} catch (error) {
  if (error instanceof LibRawError) {
    console.error(error.code, error.operation, error.state);
  }
  throw error;
} finally {
  await raw.close();
}
```

`loadFile()` performs recycle → open → unpack. Use `openFile()` followed by an
explicit `unpack()` only when you need upstream LibRaw lifecycle semantics.

## Decode a file with CommonJS

```js
const { writeFile } = require("node:fs/promises");
const { LibRaw, LibRawError } = require("lightdrift-libraw");

async function convert(input, output) {
  const raw = new LibRaw();

  try {
    await raw.loadFile(input);
    const image = await raw.createWebPBuffer({ width: 1600, quality: 82 });
    await writeFile(output, image.data);
    return image;
  } catch (error) {
    if (error instanceof LibRawError) {
      console.error(error.code, error.operation, error.state);
    }
    throw error;
  } finally {
    await raw.close();
  }
}

convert("photo.arw", "photo.webp");
```

## Decode an owned buffer

`loadBuffer()` copies the input into worker-owned memory. The input remains
valid for native operations until `recycle()` or `close()` releases it.

```js
import { readFile } from "node:fs/promises";
import { LibRaw } from "lightdrift-libraw";

const bytes = await readFile("photo.dng");
const raw = new LibRaw();

try {
  await raw.loadBuffer(bytes);
  const metadata = await raw.getMetadata();
  const thumbnail = await raw.createThumbnailJPEGBuffer({
    width: 480,
    height: 480,
    quality: 80,
  });

  console.log(metadata.make, metadata.model, thumbnail.size);
} finally {
  await raw.close();
}
```

## Understand encoded results

All stable encoders return the same result shape:

```ts
interface EncodedImageResult {
  data: Buffer;
  format: "jpeg" | "png" | "tiff" | "webp" | "avif" | "ppm";
  width: number;
  height: number;
  channels: number;
  size: number;
  processingTimeMs: number;
  source: "processed" | "embedded-thumbnail";
}
```

`data` is owned by JavaScript. `source` tells you whether the result came from
the processed RAW image or an embedded camera thumbnail.

## Cancel work

Stateful operations accept an `AbortSignal`:

```js
import { LibRaw, LibRawError } from "lightdrift-libraw";

const raw = new LibRaw();
const controller = new AbortController();
const decoding = raw.loadFile("large.raw", { signal: controller.signal });

controller.abort("no longer needed");

try {
  await decoding;
} catch (error) {
  if (!(error instanceof LibRawError) || error.code !== "ABORT_ERR") throw error;
} finally {
  await raw.close();
}
```

An aborted operation rejects with `LibRawError` and `code === "ABORT_ERR"`.
Read [Lifecycle, events, and cancellation](lifecycle.md) for queued and active
cancellation semantics.

## Next steps

- Browse [formats and cameras](FORMATS.md).
- Learn [lifecycle and concurrency](lifecycle.md).
- Review the [safe LibRaw API mapping](api-mapping.md).
- Convert a beta application with the [v1 migration guide](migration-v1.md).

## Related

- [Project README](../README.md) — Capabilities and common workflows.
- [Platform support](platform-support.md) — Prebuild matrix and exclusions.
- [Source builds](source-build.md) — Compiler-based fallback.
