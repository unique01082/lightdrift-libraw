# Migrating from beta to v1

The root entry point is the stable contract. Beta behavior remains available
through v1 at `lightdrift-libraw/legacy` and emits one deprecation warning per
process.

```js
const LegacyLibRaw = require("lightdrift-libraw/legacy");
```

The legacy entry point intentionally delegates to the frozen beta runtime so
its synchronous helpers, nested results, and error behavior remain exact. The
stable root and its worker-owned queue are separate; migration happens by
changing imports and adopting the stable result/error contract.

Key changes:

- Stable results use `{ data, format, width, height, channels, size,
  processingTimeMs, source }` instead of nested beta metadata.
- Stable failures reject `LibRawError`; they never reject plain objects.
- `openFile()` opens only. Use `loadFile()` for recycle → open → unpack.
- `close()` permanently closes an instance; use `recycle()` when reusing it.
- Canonical names follow upstream camelCase, such as `isSraw` and `thumbOk`.
- `getOptimalJPEGSettings()` is a deterministic heuristic, not an AI feature.
- Stream support is not advertised because v1 operates on complete buffers.

The `/legacy` entry point is removed in v2.

## Related

- [Getting started](getting-started.md) - Stable examples.
- [1.0.0-rc.1 release notes](releases/1.0.0-rc.1.md) - Breaking changes and promotion gates.
- [Documentation index](README.md) - Complete v1 reference.
