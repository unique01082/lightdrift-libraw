# LightDrift LibRaw Stable v1 Implementation Plan

1. Record the beta surface and LibRaw 0.22.2 parity manifest; replace
   console-only tests with assertion-based tests.
2. Vendor LibRaw 0.22.2 and zlib 1.3.2 and build both as static gyp targets.
3. Introduce native async jobs, processor ownership, cancellation, snapshots,
   and thread-safe event bridges.
4. Build the typed stable facade and dual ESM/CommonJS exports, followed by the
   beta compatibility adapter.
5. Route all Sharp conversions through one render pipeline and make batch
   processing ordered, bounded, and leak-safe.
6. Add package-content, consumer, fixture, sanitizer, source-build, and
   platform prebuild workflows; document migration and release gates.

The release candidate is `1.0.0-rc.1`. Promotion to `1.0.0` is version-only
after all five platform/architecture prebuilds plus the source-fallback gate
pass in CI.

## Related

- [Stable v1 design](2026-08-15-lightdrift-libraw-stable-v1-design.md)
- [Stable v1 audit](2026-08-15-lightdrift-libraw-stable-v1-audit.md)
- [Documentation index](../README.md)
