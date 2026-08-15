# LightDrift LibRaw 1.0.0-rc.2 Documentation and Release Design

## Objective

Release `lightdrift-libraw@1.0.0-rc.2` as a polished release candidate whose
documentation lets a Node.js developer understand the SDK, install it, and
complete a useful RAW workflow within a few minutes.

The release keeps the stable v1 API and native implementation unchanged unless
verification identifies a release-blocking defect. Its primary product change
is a clearer documentation journey and an accurate public release presentation.

## Audience and first impression

The primary reader is a Node.js developer who has camera RAW files but may not
already know LibRaw. The README must answer, in this order:

1. What problem does this package solve?
2. Which cameras, runtimes, and operating systems can I use?
3. How do I install it?
4. What does the first successful decode look like?
5. Where do I go for metadata, thumbnails, batch processing, or lower-level
   LibRaw control?

The opening should feel capable and trustworthy without repeating historical
beta claims that are inaccurate for stable v1, such as AI-powered settings,
streaming support, system LibRaw dependencies, unsupported Node versions, or
unverified performance and coverage percentages.

## README structure

Use progressive disclosure, combining the approachable scanning structure of
the former alpha/beta README with the correctness of the stable v1 README.

1. **Hero and trust signals**
   - Package name and one-sentence outcome-focused description.
   - Live badges for npm version, CI, Node 22/24, supported platforms, and MIT.
   - A short statement that LibRaw and zlib are vendored and supported targets
     receive prebuilt binaries.
2. **Why lightdrift-libraw**
   - A compact capability grid covering decode, metadata, thumbnails, encoding,
     batch workflows, and safe access to LibRaw.
3. **Supported cameras and formats**
   - Restore the easy-to-scan manufacturer/extension table from the older
     README, worded as representative formats rather than an exhaustive list.
   - Link to LibRaw's camera list and the local format documentation.
4. **Quick start**
   - Install from the `next` dist-tag.
   - Lead with ESM and include a compact CommonJS equivalent.
   - Show one complete file-to-JPEG workflow with `try/finally`, a typed result,
     and no unnecessary processing step.
5. **Common workflows**
   - Metadata inspection.
   - Embedded-thumbnail extraction.
   - Ordered batch conversion with bounded concurrency.
6. **Reliability contract**
   - Explain per-instance FIFO execution, independent-instance concurrency,
     cancellation, copied buffers, typed errors, `recycle()`, and `close()`.
   - State that callback events are delivered after native operations and are
     processing records rather than live progress updates.
7. **Compatibility and platforms**
   - Compact Node/OS/architecture table.
   - Explicit exclusions: Node 20, Alpine/musl, browser/WASM, system LibRaw.
   - Link legacy users to `lightdrift-libraw/legacy` and the migration guide.
8. **Documentation map**
   - Organize links by task rather than internal implementation area.
   - Keep full API mapping, source builds, lifecycle details, and release
     engineering in `docs/` instead of duplicating them in the README.
9. **License and related links**
   - Link vendored dependency notices and the documentation hub.

## Documentation architecture

`README.md` is the landing page. `docs/README.md` is the navigation hub.
Detailed concepts stay in their current dedicated documents:

- `docs/getting-started.md` owns expanded installation, file, buffer, ESM, and
  CommonJS instructions.
- `docs/lifecycle.md` owns state, ownership, queue, event, and cancellation
  contracts.
- `docs/api-mapping.md` owns LibRaw parity, exclusions, output parameters, and
  low-level behavior.
- `docs/platform-support.md` owns the full support matrix and path limitations.
- `docs/migration-v1.md` owns beta-to-stable migration.
- `docs/source-build.md` owns compiler prerequisites and source fallback.
- `docs/releases/1.0.0-rc.2.md` owns RC.2 highlights, known limits, and
  promotion criteria.

Outdated standalone documents remain available when still correct, but the hub
must clearly distinguish current stable-v1 documentation from historical beta
material. Cross-links must be relative, resolve on GitHub and npm, and end with
a useful Related section where appropriate.

## Version and release presentation

- Change the package version from `1.0.0-rc.1` to `1.0.0-rc.2` only; do not
  change the stable API contract.
- Update changelog, release notes, README, package metadata, and lockfile so no
  user-facing text claims the RC is unpublished or points to RC.1 as current.
- Publish RC.2 under `next`; keep `latest` and `beta` unchanged.
- Create an annotated `v1.0.0-rc.2` tag and a prerelease GitHub Release.
- Attach the generated npm tarball and CycloneDX SBOM.
- Publish through the configured GitHub Actions OIDC trusted publisher with
  npm provenance.

## Verification and acceptance

Documentation acceptance:

- A new reader can find installation and a working example without traversing
  another page.
- README examples type-check against the stable API and execute in the packaged
  ESM and CommonJS consumers.
- Every internal Markdown link resolves and every external link uses HTTPS.
- Claims match the support matrix, parity manifest, package exports, and actual
  release status.
- The npm tarball contains the updated README, docs, licenses, prebuilds, and no
  fixtures or test artifacts.

Release acceptance:

- TypeScript, stable tests, legacy contract, fixture families, queue and
  cancellation, package consumers, package-content checks, and production audit
  pass.
- Five prebuild targets, Linux source fallback, sanitizer jobs, and Node 22/24
  tarball consumers pass in GitHub Actions.
- npm reports `next` as `1.0.0-rc.2`, exposes the expected integrity and SLSA
  provenance, and a clean registry install passes ESM and CommonJS smoke tests.
- The GitHub tag and release point at the exact commit that passed the release
  workflow.

## Out of scope

- Stable `1.0.0` promotion.
- New native operations or convenience APIs.
- Browser, WASM, musl, Node 20, or additional prebuild targets.
- Marketing benchmarks that are not produced by a reproducible benchmark suite.
- Reintroducing deprecated beta claims or duplicating the full API reference in
  the README.

## Related

- [Stable v1 design](../2026-08-15-lightdrift-libraw-stable-v1-design.md)
- [Stable v1 implementation plan](../2026-08-15-lightdrift-libraw-stable-v1-implementation.md)
- [Documentation index](../../README.md)
