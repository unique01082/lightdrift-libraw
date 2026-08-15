# lightdrift-libraw

A typed Node.js SDK for decoding camera RAW files with vendored LibRaw 0.22.2
and encoding them with Sharp.

`1.0.0-rc.1` provides ESM and CommonJS exports, Node-API prebuilds, a
per-instance asynchronous queue, cancellation, typed events, copied pixel
memory, and the complete safe LibRaw public surface.

> **Release status:** `1.0.0-rc.1` is the current repository candidate. It has
> not yet been published to npm. The release workflow will publish it under
> the `next` dist-tag after every target-platform gate passes. The public
> `beta` package still exposes the older beta contract.

## Quick start

### 1. Choose a supported runtime

Use Node.js 22 or 24 on Linux glibc, macOS, or Windows. Both ESM and CommonJS
consumers are supported.

### 2. Install the release candidate

After `1.0.0-rc.1` is published:

```bash
npm install lightdrift-libraw@next
```

Supported targets download a Node-API prebuilt binary. The npm package also
contains LibRaw and zlib source for the documented native-build fallback; it
never uses a system LibRaw installation.

### 3. Import the SDK

ESM:

```js
import { LibRaw, LibRawError } from "lightdrift-libraw";
```

CommonJS:

```js
const { LibRaw, LibRawError } = require("lightdrift-libraw");
```

No account, authentication, or external service configuration is required.

### 4. Decode and encode a RAW file

```js
const raw = new LibRaw();

try {
  await raw.loadFile("photo.cr2");
  const image = await raw.createJPEGBuffer({
    width: 1920,
    quality: 85,
  });

  console.log({
    format: image.format,
    width: image.width,
    height: image.height,
    bytes: image.size,
    source: image.source,
  });
} catch (error) {
  if (error instanceof LibRawError) {
    console.error(error.code, error.operation, error.state);
  }
  throw error;
} finally {
  await raw.close();
}
```

Every stable encoder returns the same result shape:

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

## Capabilities

| Area | Stable v1 behavior |
| --- | --- |
| **RAW lifecycle** | Open files, owned buffers, and synthetic Bayer data; unpack, recycle, and close safely |
| **LibRaw mirror** | Complete safe LibRaw 0.22.2 surface: 65 supported manifest entries with camelCase names and six explicit exclusions |
| **Processing** | Raw-to-image, dcraw processing, embedded thumbnails, native writers, color and decoder helpers |
| **Metadata** | Typed snapshots and copied raw/processed pixel buffers |
| **Encoding** | JPEG, PNG, TIFF, WebP, AVIF, and standards-compliant 8/16-bit PPM through one render pipeline |
| **Concurrency** | FIFO execution per instance; separate instances run independently |
| **Control** | `AbortSignal`, typed `LibRawError`, and progress/data/EXIF/maker-note events |
| **Compatibility** | Frozen beta API at `lightdrift-libraw/legacy` throughout v1 |

`getOptimalJPEGSettings()` is a deterministic heuristic based on image
metadata and requested usage. It does not use AI.

The SDK does not claim streaming support. Stable v1 operates on complete files
or buffers and returns complete output buffers.

## Lifecycle and concurrency

`openFile()` preserves upstream LibRaw semantics and only opens the input.
Call `unpack()` explicitly afterward. The convenience methods `loadFile()` and
`loadBuffer()` perform recycle → open → unpack.

Each `LibRaw` instance owns a worker and FIFO queue. Native operations on one
instance never overlap, while separate instances may decode concurrently
without blocking the calling event loop.

Use `recycle()` to reset an instance for reuse. `close()` waits for queued work,
is idempotent, releases native resources, and permanently closes the instance.
See [lifecycle, events, and cancellation](docs/lifecycle.md) for the complete
state contract.

## Cancellation and events

```js
const controller = new AbortController();
const decoding = raw.loadFile("large.arw", { signal: controller.signal });

controller.abort();
try {
  await decoding;
} catch (error) {
  if (!(error instanceof LibRawError) || error.code !== "ABORT_ERR") throw error;
}
```

```js
raw.on("progress", ({ stage, iteration, expected }) => {});
raw.on("dataError", ({ offset, file }) => {});
raw.on("exifTag", ({ tag, type, length, order }) => {});
raw.on("makerNote", ({ tag, type, length, order }) => {});
```

Callback events are emitted in order after the current native operation
returns. They are processing records, not live progress-bar updates.

## Platform support

| Operating system | Architecture | Delivery |
| --- | --- | --- |
| **Linux glibc** | x64, arm64 | Prebuilt + source fallback |
| **macOS** | x64, arm64 | Prebuilt + source fallback |
| **Windows** | x64 | Prebuilt + source fallback |

Stable v1 does not support Node.js 20, Alpine/musl, browsers, WASM, or system
LibRaw. See [platform support](docs/platform-support.md) for the complete matrix
and Windows path limitations.

## Migrating from beta

The package root is the stable contract. Existing beta applications can use
the deprecated compatibility entry point throughout v1:

```js
const LegacyLibRaw = require("lightdrift-libraw/legacy");
```

The legacy entry point preserves beta method names, synchronous helpers,
nested results, declarations, and error behavior. It emits one deprecation
warning per process and will be removed in v2. See the
[migration guide](docs/migration-v1.md) before moving an existing application
to the stable root API.

## Documentation

### Using the SDK

- [Getting started](docs/getting-started.md) - Files, buffers, ESM, and CommonJS.
- [Lifecycle, events, and cancellation](docs/lifecycle.md) - Queue, ownership,
  state, events, cancellation, recycle, and close.
- [API mapping](docs/api-mapping.md) - LibRaw parity, exclusions, parameters,
  and 16-bit behavior.
- [Platform support](docs/platform-support.md) - Runtime and prebuild matrix.
- [Migration to v1](docs/migration-v1.md) - Stable and beta contracts.

### Building and release status

- [Source builds](docs/source-build.md) - Vendored dependencies and fallback
  prerequisites.
- [1.0.0-rc.1 release notes](docs/releases/1.0.0-rc.1.md) - Highlights,
  compatibility, known limits, and promotion gates.
- [Stable v1 implementation audit](docs/superpowers/2026-08-15-lightdrift-libraw-stable-v1-audit.md) - Requirement coverage and remaining external gates.
- [Documentation index](docs/README.md) - Complete navigation.

## License

The JavaScript and addon integration are MIT licensed. Vendored LibRaw and zlib
retain their upstream licenses; see [third-party notices](THIRD_PARTY_NOTICES.md).

## Related

- [Documentation index](docs/README.md) - Complete user and developer documentation.
- [Third-party notices](THIRD_PARTY_NOTICES.md) - Vendored dependency licenses.
