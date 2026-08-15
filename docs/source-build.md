# Source builds

Prebuilt binaries are the normal installation path. To develop or force the
fallback, install Node.js 22 or 24, Python, a C/C++17 toolchain, and platform
build tools, then run:

```bash
pnpm install --frozen-lockfile --ignore-scripts
npm_config_build_from_source=true pnpm run build
pnpm run test:stable
```

No Brew/APT LibRaw package is needed. The build compiles
`vendor/libraw-0.22.2` and `vendor/zlib-1.3.2` as static libraries. The common
profile enables LibRaw core and zlib and disables DNG SDK, RawSpeed, Jasper,
LCMS, OpenMP, and system LibRaw. Sharp owns encoded output codecs.

Use `pnpm run build:prebuild` to create a Node-API prebuild for the current platform.
Use `pnpm run package:check` to verify tarball contents.

## Related

- [Platform support](platform-support.md) - Published matrix.
- [Third-party notices](../THIRD_PARTY_NOTICES.md) - Vendored licenses.
