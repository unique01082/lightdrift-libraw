# LightDrift LibRaw Stable v1 Design

## Scope

`lightdrift-libraw` becomes a standalone Node.js SDK. Version 1 does not change
any other baole.space repository.

## Contract

- Node.js 22 and 24, through Node-API 8.
- ESM and CommonJS entry points, plus `lightdrift-libraw/legacy`.
- `LibRaw` extends `EventEmitter`; stateful operations return promises and are
  serialized per instance.
- `close()` drains the queue and permanently closes an instance. `recycle()`
  resets it for reuse.
- Native errors are normalized to `LibRawError`; returned native memory is
  copied into JavaScript-owned `Buffer` objects.
- LibRaw callbacks are emitted as `progress`, `dataError`, `exifTag`, and
  `makerNote` events.

The authoritative upstream-to-JavaScript mapping is
[`api/libraw-0.22.2.json`](../../api/libraw-0.22.2.json). Pointer-oriented APIs
are excluded there with explicit ownership reasons.

## Native ownership

Each JavaScript instance owns one native processor and one FIFO operation
queue. Jobs retain the native owner until completion. Buffer input is copied
and retained until recycle or close. Cancellation can reject a queued job
without running it and signals LibRaw for an active job.

## Build profile

The package builds the vendored LibRaw 0.22.2 and zlib 1.3.2 as static
libraries. DNG SDK, RawSpeed, Jasper, LCMS, OpenMP, and system LibRaw are not
used. Sharp provides encoded output codecs.

## Compatibility

The root entry point exposes the stable contract. The `/legacy` entry adapter
loads the frozen beta runtime rather than changing its synchronous helpers or
result/error shapes. This preserves the complete beta surface and nesting
through v1 while emitting one deprecation warning per process. It is removed
in v2.

## Related

- [Implementation plan](2026-08-15-lightdrift-libraw-stable-v1-implementation.md)
- [Implementation audit](2026-08-15-lightdrift-libraw-stable-v1-audit.md)
- [Documentation index](../README.md)
