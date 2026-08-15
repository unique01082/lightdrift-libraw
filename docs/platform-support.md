# Platform support

Stable v1 supports Node.js 22 and 24 with Node-API 8.

| Platform | Architecture | Prebuilt |
| --- | --- | --- |
| Linux glibc | x64 | Yes |
| Linux glibc | arm64 | Yes |
| macOS | x64 | Yes |
| macOS | arm64 | Yes |
| Windows | x64 | Yes |

CI runtime-tests prebuilds, source fallback, real RAW fixtures, queue behavior,
cancellation, malformed inputs, and ESM/CommonJS tarball consumers. Linux
native jobs additionally run ASan and UBSan.

Node.js 20, Alpine/musl, browsers, WASM, and system LibRaw are not supported in
v1. LibRaw's default resource limits remain unchanged.

On Windows, `openFile`, `loadFile`, `loadBayerData`, and all Sharp-based
convenience writers accept Unicode paths. LibRaw's direct native writer methods
(`dcrawPpmTiffWriter`, `dcrawThumbWriter`, `writePPM`, `writeTIFF`, and
`writeThumbnail`) and native profile-file parameters remain limited to paths
representable by the active Windows code page.

## Related

- [Source builds](source-build.md) - Fallback prerequisites.
- [1.0.0-rc.1 release notes](releases/1.0.0-rc.1.md) - Release target matrix and known limits.
- [Project README](../README.md) - Installation.
