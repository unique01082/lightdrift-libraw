# Formats and cameras

`lightdrift-libraw` uses the vendored LibRaw 0.22.2 core to identify and decode
camera RAW files. Support is determined by the exact camera model, compression,
and encoding—not only by the filename extension—so the table below is a useful
starting point rather than a promise for every file carrying that suffix.

## Representative RAW families

| Manufacturer | Common extensions | Notes |
| --- | --- | --- |
| Canon | `.CR2`, `.CR3`, `.CRW` | DSLR, mirrorless, and older Canon RAW families |
| Nikon | `.NEF`, `.NRW` | Standard Nikon RAW variants; camera-specific compression may vary |
| Sony | `.ARW`, `.SRF`, `.SR2` | Alpha and older Sony RAW families |
| Fujifilm | `.RAF` | Bayer and X-Trans camera families |
| Panasonic / Lumix | `.RW2` | Lumix still-camera RAW files |
| Olympus / OM System | `.ORF` | Olympus and OM System still-camera RAW files |
| Pentax | `.PEF` | Pentax proprietary RAW files |
| Leica | `.DNG`, `.RWL` | Leica DNG and proprietary RAW files |
| Adobe Digital Negative | `.DNG` | DNG containers from supported cameras and converters |

Consult the [LibRaw 0.22 supported-camera list](https://www.libraw.org/supported-cameras)
for model-level upstream information. That upstream list covers builds with all
optional features; this SDK intentionally uses the LibRaw core profile without
DNG SDK, RawSpeed, Jasper, LCMS, or OpenMP.

## Release fixture matrix

The v1 release gates keep redistributable fixtures in Git and exercise these
families through open, unpack, metadata snapshot, embedded thumbnail, and Sharp
render workflows:

| Family | Fixture coverage |
| --- | --- |
| Canon | CR2 |
| Nikon | NEF |
| Sony | ARW |
| Olympus | ORF |
| Adobe / camera DNG | DNG |
| Fujifilm | RAF |
| Panasonic | RW2 |
| Synthetic input | Bayer data |

Passing a family fixture proves the release pipeline for that sample; it does
not replace camera-model testing for an application's own archive.

## Output formats

The stable convenience API renders complete buffers through one processing
pipeline:

| Format | Method | Notes |
| --- | --- | --- |
| JPEG | `createJPEGBuffer()` | Quality, resize, progressive, and MozJPEG options |
| PNG | `createPNGBuffer()` | Resize and compression-level options |
| TIFF | `createTIFFBuffer()` | Sharp-encoded TIFF buffer |
| WebP | `createWebPBuffer()` | Quality and resize options |
| AVIF | `createAVIFBuffer()` | Quality, effort, and resize options |
| PPM | `createPPMBuffer()` | Standards-compliant 8-bit or 16-bit PPM |
| Embedded JPEG | `createThumbnailJPEGBuffer()` | Camera thumbnail decoded and optionally resized |

Native LibRaw writers are also mirrored for callers that need upstream writer
semantics. See [API mapping](api-mapping.md).

## Compatibility boundaries

- Node.js 22 and 24 only.
- Linux prebuilds target glibc, not Alpine/musl.
- Browser and WASM runtimes are not supported.
- The SDK does not load a system LibRaw installation.
- Input is a complete file or buffer; incremental streaming is not advertised.
- Resource limits remain LibRaw defaults, so applications should apply their
  own upload, memory, and timeout policies where needed.

## Testing an application-specific camera

Before committing to a camera workflow, test representative files from the
actual camera and firmware versions your application will accept:

1. Call `loadFile()` or `loadBuffer()`.
2. Inspect `getMetadata()` and `getDecoderInfo()`.
3. Exercise both embedded-thumbnail and processed-image output.
4. Keep a legally redistributable sample in the application's integration
   suite when possible.

## Related

- [Getting started](getting-started.md) — First file and buffer workflows.
- [Platform support](platform-support.md) — Runtime and prebuild matrix.
- [API mapping](api-mapping.md) — LibRaw parity and exclusions.
