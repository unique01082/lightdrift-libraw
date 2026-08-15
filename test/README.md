# Test suite

The Stable v1 release gate is an assertion-based Vitest suite. Any failed
assertion exits with a non-zero status.

```bash
pnpm run build
pnpm run test:stable
pnpm run test:package
```

Focused suites are available through `test:legacy`, `test:formats`, and
`test:queue`. The package-consumer gate packs the real npm tarball, installs it
without lifecycle scripts, runs the documented CommonJS and ESM migration
examples, and type-checks both legacy module forms.

Files directly under `test/` are retained beta-era diagnostic programs. They
are not Stable v1 release gates and are not exposed as npm test scripts. New
coverage belongs in `test/stable/` and must use Vitest assertions.

## Related

- [Documentation index](../docs/README.md) - SDK and development documentation.
- [Migration guide](../docs/migration-v1.md) - Stable and legacy contracts.
