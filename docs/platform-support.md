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

## Electron

Electron 36 is supported in Node-enabled main and utility processes on the
platforms above. CI installs the complete npm tarball with lifecycle scripts
disabled and loads its shipped Node-API prebuild in Electron 36.9.5 on Windows
x64, the environment originally reported in GitHub issue #2. The addon does not
need `@electron/rebuild` because it targets Node-API 8 instead of an
Electron-specific V8 ABI.

Packaged applications must keep `dist/` and the matching
`prebuilds/<platform>-<architecture>/lightdrift-libraw.node` file. Configure the
packager to unpack `.node` files from ASAR when it does not do so automatically.
Renderer processes without Node integration are not supported; expose the SDK
from a preload, main, or utility process through the application's IPC boundary.

On Windows, `openFile`, `loadFile`, `loadBayerData`, and all Sharp-based
convenience writers accept Unicode paths. LibRaw's direct native writer methods
(`dcrawPpmTiffWriter`, `dcrawThumbWriter`, `writePPM`, `writeTIFF`, and
`writeThumbnail`) and native profile-file parameters remain limited to paths
representable by the active Windows code page.

## Related

- [Source builds](source-build.md) - Fallback prerequisites.
- [1.0.0-rc.1 release notes](releases/1.0.0-rc.1.md) - Release target matrix and known limits.
- [Project README](../README.md) - Installation.
