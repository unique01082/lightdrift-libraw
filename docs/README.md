# lightdrift-libraw documentation

Use this page to move from your first RAW decode to lower-level LibRaw control
and SDK development. The package root exports the stable v1 API; documents
marked as historical describe the deprecated beta surface.

## Start here

- [Project README](../README.md) — What the SDK does, supported platforms, and
  the shortest working example.
- [Getting started](getting-started.md) — Install, verify, and decode from files
  or buffers with ESM and CommonJS.
- [Formats and cameras](FORMATS.md) — Representative RAW families and the
  formats exercised by the release fixtures.
- [Platform support](platform-support.md) — Node versions, operating systems,
  architectures, prebuilds, and exclusions.

## Build with the SDK

- [Lifecycle, events, and cancellation](lifecycle.md) — Processor state,
  worker ownership, FIFO execution, cancellation, recycle, and close.
- [Examples](EXAMPLES.md) — Additional workflows. Check the compatibility note
  at the top before copying an example written for the beta API.

## Understand the stable contract

- [API mapping](api-mapping.md) — Safe LibRaw 0.22.2 parity, camelCase names,
  explicit exclusions, output parameters, and 16-bit behavior.
- [Stable v1 design](superpowers/2026-08-15-lightdrift-libraw-stable-v1-design.md)
  — Public contract and architectural decisions.
- [Stable v1 implementation audit](superpowers/2026-08-15-lightdrift-libraw-stable-v1-audit.md)
  — Requirement-by-requirement verification.

## Migrate an existing beta application

- [Migration to v1](migration-v1.md) — Stable result and error shapes,
  lifecycle changes, and the `lightdrift-libraw/legacy` compatibility entry.
- The legacy entry point remains available throughout v1, emits one
  deprecation warning per process, and will be removed in v2.

## Build, test, and release the SDK

- [Source builds](source-build.md) — Compiler prerequisites and the vendored
  LibRaw/zlib build fallback.
- [Contributing](../CONTRIBUTING.md) — Local development and pull requests.
- [Testing reference](TESTING.md) — Historical suites plus the current test
  commands listed in `package.json`.
- [1.0.0-rc.2 release notes](releases/1.0.0-rc.2.md) — Documentation changes,
  compatibility, known limits, and release gates.
- [Stable v1 implementation plan](superpowers/2026-08-15-lightdrift-libraw-stable-v1-implementation.md)
- [RC.2 documentation design](superpowers/specs/2026-08-15-lightdrift-libraw-rc2-documentation-design.md)
- [RC.2 implementation plan](superpowers/plans/2026-08-15-lightdrift-libraw-rc2-documentation.md)
- [Third-party notices](../THIRD_PARTY_NOTICES.md)

## Historical beta references

The following documents are retained for applications using
`lightdrift-libraw/legacy`. Their result shapes, examples, performance claims,
and setup instructions do not define the stable package-root contract:

- [Beta API reference](API.md)
- [Beta buffer API](BUFFER_API.md)
- [Beta examples](EXAMPLES.md)
- [Beta worker-thread guide](WORKER_THREADS.md)
- [Beta worker quick reference](WORKER_QUICK_REF.md)

Use the [migration guide](migration-v1.md) before adapting these examples to
the stable API.

## Related

- [Project README](../README.md) — Installation and first workflow.
- [Getting started](getting-started.md) — Expanded beginner guide.
- [Migration to v1](migration-v1.md) — Beta compatibility policy.
