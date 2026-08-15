# lightdrift-libraw

Decode camera RAW files, inspect photographic metadata, extract thumbnails,
and render web-ready images from Node.js—without installing LibRaw yourself.

[![npm version](https://img.shields.io/npm/v/lightdrift-libraw?label=npm)](https://www.npmjs.com/package/lightdrift-libraw)
[![GitHub release](https://img.shields.io/github/v/release/unique01082/lightdrift-libraw?label=release)](https://github.com/unique01082/lightdrift-libraw/releases/tag/v1.0.0)
[![CI](https://github.com/unique01082/lightdrift-libraw/actions/workflows/ci.yml/badge.svg)](https://github.com/unique01082/lightdrift-libraw/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22%20%7C%2024-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![platforms](https://img.shields.io/badge/platforms-Linux%20%7C%20macOS%20%7C%20Windows-blue)](docs/platform-support.md)
[![license](https://img.shields.io/badge/license-MIT-yellow)](LICENSE)

`lightdrift-libraw` combines vendored LibRaw 0.22.2 with Sharp behind a typed,
Promise-based API. Supported systems download a Node-API prebuilt binary; the
package also includes a reproducible source-build fallback.

## Why lightdrift-libraw?

| Need | What the SDK provides |
| --- | --- |
| Decode camera originals | Load RAW files, owned buffers, or synthetic Bayer data with `loadFile()`, `loadBuffer()`, and `openBayer()` |
| Read photographic metadata | Camera, exposure, dimensions, lens, color, decoder, and processing snapshots |
| Extract previews quickly | Decode embedded thumbnails and return a consistent typed result |
| Create application-ready images | Render JPEG, PNG, TIFF, WebP, AVIF, or standards-compliant PPM through Sharp |
| Process a collection | Ordered batch conversion with bounded `maxConcurrency` and one processor per active input |
| Reach LibRaw when needed | A camelCase mirror of the complete safe LibRaw 0.22.2 public surface, with explicit exclusions documented |

The high-level workflows are designed for everyday application code. The
low-level mirror remains available when you need precise LibRaw lifecycle,
decoder, color, Bayer, or output-parameter control.

## Supported cameras and formats

LibRaw supports a broad camera database. These are representative RAW families
handled by the SDK, not an exhaustive compatibility guarantee for every camera
or encoding variant.

| Manufacturer | Representative formats |
| --- | --- |
| Canon | `.CR2`, `.CR3`, `.CRW` |
| Nikon | `.NEF`, `.NRW` |
| Sony | `.ARW`, `.SRF`, `.SR2` |
| Fujifilm | `.RAF` |
| Panasonic / Lumix | `.RW2` |
| Olympus / OM System | `.ORF` |
| Pentax | `.PEF` |
| Leica | `.DNG`, `.RWL` |
| Adobe Digital Negative | `.DNG` |

The release fixture matrix exercises Canon CR2, Nikon NEF, Sony ARW, Olympus
ORF, DNG, Fujifilm RAF, and Panasonic RW2 through open, unpack, metadata,
thumbnail, and render workflows. See [format support](docs/FORMATS.md) and the
[LibRaw 0.22 camera list](https://www.libraw.org/supported-cameras) for details.

## Quick start

### Install the stable release

```bash
npm install lightdrift-libraw
```

Use Node.js 22 or 24. No account, authentication, system LibRaw installation,
or post-install configuration is required on a supported prebuilt target.

### Decode a RAW file to JPEG

```js
import { writeFile } from "node:fs/promises";
import { LibRaw } from "lightdrift-libraw";

const raw = new LibRaw();

try {
  await raw.loadFile("photo.cr2");
  const image = await raw.createJPEGBuffer({ width: 1920, quality: 85 });
  await writeFile("photo.jpg", image.data);

  console.log(`${image.width}x${image.height} · ${image.size} bytes`);
} finally {
  await raw.close();
}
```

Every stable encoder returns the same shape: encoded `data`, `format`, output
dimensions, channel count, byte `size`, `processingTimeMs`, and the image
`source` (`processed` or `embedded-thumbnail`).

CommonJS uses the same class and methods:

```js
const { LibRaw, LibRawError } = require("lightdrift-libraw");
```

See [Getting started](docs/getting-started.md) for complete ESM, CommonJS, file,
and buffer examples.

## Common workflows

Each snippet below assumes an open `LibRaw` instance named `raw`. Keep instance
ownership local and call `close()` in `finally`, as shown in the quick start.

### Inspect camera metadata

```js
await raw.loadFile("photo.nef");
const metadata = await raw.getMetadata();

console.log({
  camera: [metadata.make, metadata.model].filter(Boolean).join(" "),
  dimensions: `${metadata.width}x${metadata.height}`,
  iso: metadata.iso,
  aperture: metadata.aperture,
  focalLength: metadata.focalLength,
});
```

### Extract an embedded thumbnail

```js
import { writeFile } from "node:fs/promises";

await raw.loadFile("photo.raf");
const thumbnail = await raw.createThumbnailJPEGBuffer({
  width: 512,
  height: 512,
  quality: 82,
});

await writeFile("thumbnail.jpg", thumbnail.data);
```

### Convert a batch while preserving input order

```js
const results = await LibRaw.batchConvertToJPEGParallel(
  ["one.arw", "two.rw2"],
  "output",
  { width: 2048, quality: 85, maxConcurrency: 2 },
);

console.log(results.map(({ width, height, size }) => ({ width, height, size })));
```

The batch helper creates and closes separate processors, limits active work,
writes `<input-name>.jpg` into the output directory, and returns results in the
same order as the input paths.

## Reliability by default

- **Non-blocking native work:** every processor owns a worker, so RAW decoding
  does not run on the calling JavaScript thread.
- **Predictable ordering:** native operations are FIFO on one instance;
  different instances may run concurrently.
- **Owned memory:** input buffers stay alive until `recycle()` or `close()`, and
  pixel buffers returned to JavaScript are copies rather than LibRaw pointers.
- **Cancellation:** stateful operations accept `{ signal }`; aborted work
  rejects with a typed `LibRawError` whose `code` is `ABORT_ERR`.
- **Structured failures:** `LibRawError` always exposes `code`, `operation`,
  `librawCode`, `state`, and `cause`.
- **Explicit lifecycle:** use `recycle()` to reuse a processor. `close()` waits
  for queued work, is idempotent, and permanently closes the instance.

Native callback records are emitted as `progress`, `dataError`, `exifTag`, and
`makerNote` events after the operation returns. They are ordered processing
records, not live progress-bar updates. Read the full
[lifecycle, events, and cancellation contract](docs/lifecycle.md).

`getOptimalJPEGSettings()` is a deterministic heuristic based on metadata. It
does not call an AI service or send image data anywhere.

## Platform support

| Operating system | Architecture | Delivery |
| --- | --- | --- |
| Linux glibc | x64 | Prebuilt + source fallback |
| Linux glibc | arm64 | Prebuilt + source fallback |
| macOS | x64 | Prebuilt + source fallback |
| macOS | arm64 | Prebuilt + source fallback |
| Windows | x64 | Prebuilt + source fallback |

Stable v1 supports Node.js 22 and 24 with both ESM and CommonJS exports. It does
not support Node.js 20, Alpine/musl, browsers, WASM, or a system LibRaw. See the
[complete platform matrix](docs/platform-support.md) and
[source-build prerequisites](docs/source-build.md).

Inputs are complete files or buffers. The SDK does not claim streaming support;
wrapping a completed buffer in a Node.js stream is not incremental RAW decoding.

## Migrating from beta

The package root is the stable contract. Existing beta applications can use
the deprecated compatibility entry point throughout v1:

```js
const LegacyLibRaw = require("lightdrift-libraw/legacy");
```

`/legacy` preserves the frozen beta surface and emits one deprecation warning
per process. It will be removed in v2. Follow the
[migration guide](docs/migration-v1.md) to adopt stable results, errors, and
lifecycle behavior.

## Documentation

### Start

- [Getting started](docs/getting-started.md) — Install, verify, and decode from
  files or buffers with ESM and CommonJS.
- [Formats and cameras](docs/FORMATS.md) — Representative RAW families,
  validated fixtures, and compatibility boundaries.
- [Platform support](docs/platform-support.md) — Node, OS, architecture, and
  prebuilt availability.

### Build workflows

- [Examples](docs/EXAMPLES.md) — Additional application workflows; beta-shaped
  examples are labeled in the documentation hub.
- [Lifecycle, events, and cancellation](docs/lifecycle.md) — Ownership, queue,
  state transitions, cancellation, recycle, and close.

### Understand the API

- [API mapping](docs/api-mapping.md) — LibRaw parity, exclusions, output
  parameters, and low-level behavior.
- [Migration to v1](docs/migration-v1.md) — Stable versus beta contracts and
  the `/legacy` adapter.

### Maintain or contribute

- [Documentation index](docs/README.md) — Complete current and historical
  documentation map.
- [Source builds](docs/source-build.md) — Vendored dependency build fallback.
- [Contributing](CONTRIBUTING.md) — Local development and pull requests.

## License

The JavaScript and addon integration are MIT licensed. Vendored LibRaw and zlib
retain their upstream licenses; see [Third-party notices](THIRD_PARTY_NOTICES.md).

## Related

- [Documentation index](docs/README.md) — Complete user and developer documentation.
- [npm package](https://www.npmjs.com/package/lightdrift-libraw) — Published versions and provenance.
- [GitHub releases](https://github.com/unique01082/lightdrift-libraw/releases) — Release notes, tarballs, and SBOMs.
