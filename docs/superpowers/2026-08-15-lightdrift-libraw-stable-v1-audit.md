# LightDrift LibRaw Stable v1 audit

This audit maps the Stable v1 implementation to the approved plan. A local
pass means the gate was executed on macOS arm64 in the current worktree. A CI
gate is not considered passed until GitHub Actions executes it on the target
runner.

## Implementation status

| Area | Status | Evidence |
| --- | --- | --- |
| Contract baseline | Complete | `api/libraw-0.22.2.json` records all 71 vendored public entries: 65 supported and 6 explicitly excluded. `api/beta-contract.json` records 60 beta instance methods and 5 static methods. Header-to-manifest, runtime, and generated declaration parity are assertion-tested. |
| Vendored build | Complete locally | LibRaw 0.22.2 and zlib 1.3.2 build as static gyp targets with Node-API 8. The macOS arm64 addon links only to libc++ and libSystem. |
| Async processor | Complete locally | One worker/FIFO per instance, distinct workers across instances, owned input buffers, execution-time render state, cancellation, close draining, forced-GC lifetime, worker teardown, event-loop responsiveness, and buffered callback delivery are covered by lifecycle and queue tests. |
| Stable TypeScript API | Complete locally | ESM, CommonJS, declarations, root export, and `/legacy` export build successfully. Lifecycle, metadata, events, mirror forwarding, and workflow helpers are split into focused modules. Concrete `DecoderInfo` and `MemoryImageFormat` types replace opaque records. `tsc --noEmit` passes. |
| Sharp workflows | Complete locally | Encoders share one render path. JPEG, PNG, TIFF, WebP, AVIF, 8/16-bit PPM, file writers, multi-size, batch, embedded/fallback thumbnails, and all heuristic modes are runtime-tested. Workflows and batch normalize failures to `LibRawError`; batch concurrency is bounded and result ordering is preserved. |
| Legacy compatibility | Behavior complete; implementation deviation documented | CJS and ESM entry points preserve the complete beta runtime/type surface and emit one process-wide deprecation warning. Instead of translating through the async stable facade, `/legacy` loads the frozen beta runtime so synchronous helpers, nested results, and beta error behavior remain exact. This is isolated to the deprecated v1-only subpath. |
| Fixtures and native safety | Complete locally | Canon, Nikon, Sony, Olympus, DNG, RAF, RW2, and synthetic Bayer tests pass. Every distributable RAW fixture is provenance-documented and SHA-256 pinned. Invalid native copy sizes, Phase One input, malformed RAW data, and invalid output bit depth are rejected without process termination. |
| Package and docs | Complete locally | Package-content, migration consumers, source-build instructions, API mapping, lifecycle, platform matrix, licenses, and third-party notices are present. Fixtures and test artifacts are excluded from npm. |
| Release automation | Configured, awaiting CI | CI defines all five enumerated prebuild targets, Node 22/24, Linux source fallback, full stable-suite ASan/UBSan execution, production dependency audit, package consumers, all-prebuild enforcement, provenance, SBOM, and dist-tag selection. |

## Executable coverage map

| Plan requirement | Executable evidence |
| --- | --- |
| Full safe LibRaw 0.22.2 mirror and callbacks | `mirror-operations.test.ts` invokes every one of the 65 supported manifest entries and fails if the executed and supported sets differ. `api-parity.test.mjs` separately checks the vendored header, runtime and generated declarations. |
| Beta compatibility through `/legacy` | `legacy-contract.test.ts`, `legacy-types.test.mjs`, and installed CJS/ESM tarball consumers check the frozen beta method surface, declarations, nested result shape, version tuple, and one process-wide warning. |
| State, ownership, queue, cancellation and teardown | `lifecycle.test.ts` and `queue-cancellation.test.ts` cover file/buffer/Bayer transitions, copied input/pixel memory, same-instance FIFO, independent workers, active/queued cancellation, close races, forced GC, consumer-worker teardown, and unexpected worker exit. |
| Fixture and decoder families | `fixture-matrix.test.ts` runs open, unpack, typed snapshot, embedded thumbnail and Sharp render for Canon, Nikon, Sony, Olympus, DNG, RAF and RW2; lifecycle tests add synthetic Bayer. `fixture-provenance.test.ts` pins provenance and SHA-256. |
| Sharp and convenience workflows | `render.test.ts`, `workflow-matrix.test.ts`, and `batch.test.ts` cover every advertised encoding/writer/thumbnail/batch/heuristic path, unified result fields, 16-bit handling, concurrency bounds, ordering, cleanup and normalized failures. |
| Native safety | Lifecycle child-process regressions cover invalid copy size, invalid Phase One buffers, invalid output bit depth and malformed input. CI runs the entire stable suite plus malformed-input child process under ASan/UBSan. |
| Build, package, docs and release | `plan-contract.test.mjs` asserts version pins, NAPI 8/static profile, exports, Node matrix, five prebuild targets, source fallback, sanitizer, consumer, package-content, provenance, SBOM, dist-tag and documentation contracts. `check-package.js` validates the actual npm file list and required licenses/docs. |

## Corrections made during audit

- Normalized Sharp, filesystem, multi-size, thumbnail, and batch failures to
  `LibRawError` with operation, state, native code, and cause fields.
- Corrected state transitions after `freeImage()` and `setOutputParams()`
  invalidate an already processed image.
- Made rejected `setOutputParams()` updates atomic by validating
  range-constrained bit depth before any native field mutation.
- Added generated `.d.ts` parity coverage, active worker teardown coverage,
  distinct-worker overlap evidence, exact migration-example tarball consumers,
  and a complete prebuild-set package gate.
- Added header-to-manifest parity so every public member in the vendored
  `LibRaw` class, including its constructor, must be explicitly supported or
  excluded.
- Replaced opaque decoder/memory-format records with exported concrete types,
  split the facade into lifecycle/metadata/events/mirror/workflow modules, and
  compile-tested those types from an installed tarball.
- Pinned fixture bytes to their documented provenance with SHA-256 assertions.
- Replaced exposed console-style npm test commands with Vitest suites that
  return non-zero on assertion failure. Beta diagnostic files remain archived
  but are not release gates.
- Documented that Sharp codecs normalize 16-bit samples to 8-bit, while copied
  native buffers and PPM preserve 16-bit precision.
- Added an exact supported-operation runtime smoke: all 65 safe manifest
  entries, including all four callback event types, must execute.
- Added the complete convenience-format/workflow matrix and exact unified
  result-shape assertions.
- Expanded sanitizer jobs from one lifecycle file to the complete stable suite.
- Made package-content validation require the public docs, root license,
  third-party notices, and both LibRaw licenses.
- Renamed the prebuildify command from the reserved npm lifecycle name
  `prebuild` to `build:prebuild`; this prevents ordinary/source-only builds
  from silently creating a prebuilt binary before the source-fallback gate.
- Upgraded Sharp to 0.35.3 after the production audit identified high-severity
  issues in the older libvips dependency chain. Added mandatory production
  audit jobs to both CI and the tagged release workflow.
- Added RC release notes and made `publish:check` run the dependency audit,
  typecheck, complete stable suite, package-content check, and installed
  tarball consumers as one local release gate.
- Pinned Windows x64 CI and release prebuilds to `windows-2022` after the
  `windows-2025` image moved to Visual Studio 2026, which Node-gyp 11 cannot
  currently discover.
- Raised the native-workflow test timeout to cover slower hosted runners and
  limited branch-push CI to `master` so pull requests do not launch duplicate
  full native matrices.
- Normalized dynamically discovered LibRaw source paths to forward slashes so
  the gyp list expansion remains valid on Windows/MSBuild.
- Removed the uncontracted native RawSpeed camera-file wrapper. RawSpeed is
  disabled by the v1 profile, and retaining the call left an unresolved symbol
  in the Windows static addon link.
- Made the package-content checker invoke npm through the Windows command shell
  so the `.cmd` shim resolves on hosted runners, with explicit launch-error
  reporting instead of writing an undefined stream chunk.
- Applied the cross-platform npm launcher to the CJS, ESM, and TypeScript
  installed-tarball consumer gate as well.
- Corrected the advanced metadata color-matrix transpose after UBSan detected
  an out-of-bounds fourth-row read, and set a sanitizer-only five-minute test
  timeout for RAW operations slowed substantially by instrumentation.

## Local verification

- Native source build and macOS arm64 Node-API prebuild: pass.
- TypeScript bundle and `tsc --noEmit`: pass.
- Vitest on Node 22.23.2 and Node 24.19.0: 13 files, 74 tests on each: pass.
- Malformed-input child process: pass.
- Npm package check: 183 files, one local target prebuild: pass.
- Installed tarball on Node 22.23.2 and Node 24.19.0 without install scripts:
  CJS, ESM, migration workflows, legacy runtime, and legacy declarations pass.
- Installed a tarball containing no prebuild on Node 22.23.2 with forced native
  source compilation: pass.
- Production dependency audit at high severity: no known vulnerabilities.
- CycloneDX 1.6 SBOM generation and validation: pass (6 required production
  components).
- First-party `git diff --check` (excluding byte-preserved vendored upstream
  sources): pass.

## Gates still requiring external execution

The implementation is ready for CI, but these results cannot be produced by a
single macOS arm64 machine:

- Linux glibc x64 and arm64, macOS x64, and Windows x64 prebuild/runtime jobs.
- Linux forced source-only tarball installation.
- Linux ASan/UBSan execution.
- Final package assembly containing all five prebuilds.
- Trusted npm publication of `1.0.0-rc.1` to `next`, followed by version-only
  promotion of `1.0.0` to `latest` after every gate passes.

## Related

- [Stable v1 implementation plan](2026-08-15-lightdrift-libraw-stable-v1-implementation.md)
- [Stable v1 design](2026-08-15-lightdrift-libraw-stable-v1-design.md)
- [1.0.0-rc.1 release notes](../releases/1.0.0-rc.1.md)
- [Documentation index](../README.md)
