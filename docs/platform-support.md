# Platform support

Stable v1 supports Node.js 22 and 24 with Node-API 8.

| Platform | Architecture | Prebuilt |
| --- | --- | --- |
| Linux glibc | x64 | Yes |
| Linux glibc | arm64 | Yes |
| macOS | x64 | Yes |
| macOS | arm64 | Yes |
| Windows | x64 | Yes |

Linux prebuilds are compiled in a `node:24-bullseye` (Debian 11, glibc 2.31)
container and require glibc 2.31 or newer, which covers Amazon Linux 2023
(glibc 2.34, the Node.js 22/24 Lambda runtime), Ubuntu 20.04+, and Debian 11+.
CI asserts this floor automatically (`scripts/check-glibc-floor.js`) and
installs the packaged tarball with lifecycle scripts disabled inside the
official `public.ecr.aws/lambda/nodejs:22` and `:24` images on both x64 and
arm64 as a regression check for
[issue #8](https://github.com/unique01082/lightdrift-libraw/issues/8).

## AWS Lambda

Use version 1.0.1 or newer for Lambda Node.js 22/24 on Amazon Linux 2023.
Install the package for the same architecture as the deployed function:

```bash
npm install lightdrift-libraw@^1.0.1
```

For an arm64 container deployment, build the application image with
`--platform linux/arm64`; use `linux/amd64` for x64. Install dependencies
inside that target image so npm selects the matching Sharp dependencies as
well as the SDK prebuild. Copying an x64 or macOS `node_modules` directory to
an arm64 Lambda function will not work. No compiler or system LibRaw is
required for supported prebuilds. See the
[AWS container deployment guide](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html).

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
- [1.0.1 release notes](releases/1.0.1.md) - Lambda compatibility fix.
- [1.0.0-rc.1 release notes](releases/1.0.0-rc.1.md) - Release target matrix and known limits.
- [Project README](../README.md) - Installation.
