# LightDrift LibRaw 1.0.0-rc.2 Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `lightdrift-libraw@1.0.0-rc.2` with an approachable, accurate README and a coherent documentation journey for first-time RAW-processing users.

**Architecture:** Keep `README.md` as the outcome-focused landing page and `docs/README.md` as the reference hub. Add a deterministic documentation validator, reuse existing stable-v1 reference documents as single sources of truth, and make release metadata consistent across package, lockfile, changelog, release notes, GitHub, and npm.

**Tech Stack:** Markdown, Node.js 22/24, TypeScript, Vitest, pnpm, npm, GitHub Actions, prebuildify, node-gyp-build, npm OIDC trusted publishing.

## Global Constraints

- Release version is exactly `1.0.0-rc.2` and publishes under npm dist-tag `next`.
- Do not change the stable v1 API or native implementation unless verification finds a release-blocking defect.
- Support remains Node.js `^22.0.0 || ^24.0.0` on Linux glibc x64/arm64, macOS x64/arm64, and Windows x64.
- Do not claim Node 20, Alpine/musl, browser/WASM, streaming, system LibRaw, AI-powered settings, or unverified performance/coverage.
- Keep LibRaw 0.22.2 and zlib 1.3.2 vendored; supported targets use prebuilt binaries with a documented source fallback.
- Keep the package root as the stable API and `lightdrift-libraw/legacy` as the deprecated beta compatibility API.
- Preserve `latest` and `beta`; only update `next` to `1.0.0-rc.2`.
- Use relative links for repository documents and HTTPS for every external link.

---

## File map

- Create `scripts/check-docs.js`: deterministic validation for internal links, external-link schemes, stale RC status, required README sections, and fenced-code languages.
- Modify `package.json`: version `1.0.0-rc.2`, add `docs:check`, and include it in `publish:check`.
- Modify `pnpm-lock.yaml`: keep importer version synchronized with `package.json`.
- Modify `README.md`: first-impression landing page with badges, representative formats, quick start, common workflows, reliability summary, platforms, migration, and task-oriented documentation links.
- Modify `docs/README.md`: current documentation hub organized by user journey; distinguish current v1 docs from historical beta references.
- Modify `docs/getting-started.md`: beginner-oriented install/verify/file/buffer examples and CJS parity.
- Create `docs/releases/1.0.0-rc.2.md`: highlights, compatibility, known limits, verification gates, and promotion guidance.
- Modify `CHANGELOG.md`: add RC.2 entry without rewriting earlier history.
- Modify `.github/workflows/ci.yml`: run `pnpm run docs:check` in the primary Node matrix.
- Modify `.github/workflows/release.yml`: run `pnpm run docs:check` before packaging.

---

### Task 1: Add deterministic documentation validation

**Files:**
- Create: `scripts/check-docs.js`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: repository Markdown files under `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `THIRD_PARTY_NOTICES.md`, and `docs/**/*.md`.
- Produces: `pnpm run docs:check`, exiting `0` only when documentation structure and links satisfy the RC.2 contract.

- [ ] **Step 1: Create the failing documentation validator contract**

Add `scripts/check-docs.js` with these exact checks:

```js
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const markdownFiles = [
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "THIRD_PARTY_NOTICES.md",
  ...fs
    .readdirSync(path.join(root, "docs"), { recursive: true })
    .filter((name) => name.endsWith(".md"))
    .map((name) => path.join("docs", name)),
];

const errors = [];
for (const relativeFile of markdownFiles) {
  const filename = path.join(root, relativeFile);
  const markdown = fs.readFileSync(filename, "utf8");

  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].trim();
    if (/^(mailto:|#)/.test(href)) continue;
    if (/^http:\/\//.test(href)) {
      errors.push(`${relativeFile}: external link must use HTTPS: ${href}`);
      continue;
    }
    if (/^https:\/\//.test(href)) continue;

    const target = href.split("#", 1)[0];
    if (!target) continue;
    const resolved = path.resolve(path.dirname(filename), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) {
      errors.push(`${relativeFile}: missing internal link target: ${href}`);
    }
  }

  for (const match of markdown.matchAll(/^```([^\n]*)$/gm)) {
    if (!match[1].trim()) errors.push(`${relativeFile}: fenced code block needs a language`);
  }
}

const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
for (const heading of [
  "## Why lightdrift-libraw?",
  "## Supported cameras and formats",
  "## Quick start",
  "## Common workflows",
  "## Reliability by default",
  "## Platform support",
  "## Documentation",
]) {
  if (!readme.includes(heading)) errors.push(`README.md: missing heading ${heading}`);
}

for (const stale of [
  "has not yet been published to npm",
  "After `1.0.0-rc.1` is published",
  "AI-Powered Settings",
  "Stream-based Processing",
]) {
  if (readme.includes(stale)) errors.push(`README.md: stale or unsupported claim: ${stale}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Documentation check passed (${markdownFiles.length} Markdown files).`);
```

- [ ] **Step 2: Register and run the validator to prove current docs fail**

Add to `package.json` scripts:

```json
"docs:check": "node scripts/check-docs.js"
```

Run:

```bash
pnpm run docs:check
```

Expected: non-zero exit because the current README lacks the new landing-page headings and contains stale RC.1 publication text.

- [ ] **Step 3: Add the validator to release gates**

In `.github/workflows/ci.yml`, add after JavaScript build in the Node matrix:

```yaml
- run: pnpm run docs:check
```

In `.github/workflows/release.yml`, add before `npm pack --ignore-scripts` in the package job:

```yaml
- run: pnpm run docs:check
```

Update `publish:check` in `package.json` to:

```json
"publish:check": "pnpm audit --prod --audit-level high && pnpm exec tsc --noEmit && pnpm run docs:check && pnpm run test && pnpm run package:check && pnpm run test:package"
```

- [ ] **Step 4: Commit the red test and gate wiring**

```bash
git add scripts/check-docs.js package.json .github/workflows/ci.yml .github/workflows/release.yml
git commit -m "test: validate release documentation"
```

---

### Task 2: Rewrite the first-time user journey

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/getting-started.md`

**Interfaces:**
- Consumes: stable exports `LibRaw`, `LibRawError`, `LibRaw.batchConvertToJPEGParallel`, `loadFile`, `loadBuffer`, `getMetadata`, `createJPEGBuffer`, `createThumbnailJPEGBuffer`, and `close`.
- Produces: a landing page and getting-started path whose snippets use only published stable APIs.

- [ ] **Step 1: Replace the README hero and capability scan**

Use this opening copy and live badges:

```markdown
# lightdrift-libraw

Decode camera RAW files, inspect photographic metadata, extract thumbnails,
and render web-ready images from Node.js—without installing LibRaw yourself.

[![npm version](https://img.shields.io/npm/v/lightdrift-libraw?label=npm)](https://www.npmjs.com/package/lightdrift-libraw)
[![release](https://img.shields.io/npm/v/lightdrift-libraw/next?label=next)](https://www.npmjs.com/package/lightdrift-libraw/v/1.0.0-rc.2)
[![CI](https://github.com/unique01082/lightdrift-libraw/actions/workflows/ci.yml/badge.svg)](https://github.com/unique01082/lightdrift-libraw/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22%20%7C%2024-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![platforms](https://img.shields.io/badge/platforms-Linux%20%7C%20macOS%20%7C%20Windows-blue)](docs/platform-support.md)
[![license](https://img.shields.io/badge/license-MIT-yellow)](LICENSE)

`lightdrift-libraw` combines vendored LibRaw 0.22.2 with Sharp behind a typed,
Promise-based API. Supported systems download a Node-API prebuilt binary; the
package also includes a reproducible source-build fallback.
```

Follow it with `## Why lightdrift-libraw?` and a six-row table: RAW decode,
metadata, thumbnails, web formats, batch workflows, and safe LibRaw control.
Each row must state an outcome and name representative APIs without promising
streaming or AI.

- [ ] **Step 2: Restore a truthful representative-format table**

Add `## Supported cameras and formats` with Canon CR2/CR3/CRW, Nikon NEF/NRW,
Sony ARW/SRF/SR2, Fujifilm RAF, Panasonic RW2, Olympus ORF, Pentax PEF, Leica
DNG/RWL, and Adobe DNG. Introduce it as representative rather than exhaustive,
then link to `docs/FORMATS.md` and LibRaw's HTTPS camera list.

- [ ] **Step 3: Add a copy-paste quick start**

Use this install command and complete ESM flow:

```bash
npm install lightdrift-libraw@next
```

```js
import { writeFile } from "node:fs/promises";
import { LibRaw } from "lightdrift-libraw";

const raw = new LibRaw();

try {
  await raw.loadFile("photo.cr2");
  const image = await raw.createJPEGBuffer({ width: 1920, quality: 85 });
  await writeFile("photo.jpg", image.data);

  console.log(`${image.width}x${image.height} · ${image.size} bytes`);
} finally {
  await raw.close();
}
```

Include the CommonJS import only, then link to `docs/getting-started.md` for the
expanded CommonJS workflow so the landing page stays compact.

- [ ] **Step 4: Add three focused workflows**

Under `## Common workflows`, provide executable snippets for:

```js
await raw.loadFile("photo.nef");
const metadata = await raw.getMetadata();
console.log(metadata.make, metadata.model, metadata.iso);
```

```js
await raw.loadFile("photo.raf");
const thumbnail = await raw.createThumbnailJPEGBuffer({ maxSize: 512 });
await writeFile("thumbnail.jpg", thumbnail.data);
```

```js
const results = await LibRaw.batchConvertToJPEGParallel(
  ["one.arw", "two.rw2"],
  "output",
  { width: 2048, quality: 85, maxConcurrency: 2 },
);
```

- [ ] **Step 5: Add reliability, platform, migration, and documentation maps**

Write compact sections using current contracts:

- `## Reliability by default`: FIFO per instance, independent instances,
  `AbortSignal`, copied buffers, `LibRawError`, `recycle()`, idempotent `close()`.
- `## Platform support`: the five supported prebuild targets plus source
  fallback, followed by explicit non-support statements.
- `## Migrating from beta`: the `/legacy` CommonJS line and v2 removal warning.
- `## Documentation`: group links under Start, Build workflows, Understand the
  API, and Maintain/contribute.

- [ ] **Step 6: Rework the documentation hub and getting-started guide**

Make `docs/README.md` a hub with these headings:

```markdown
# lightdrift-libraw documentation
## Start here
## Build with the SDK
## Understand the stable contract
## Migrate an existing beta application
## Build, test, and release the SDK
## Historical beta references
## Related
```

Make `docs/getting-started.md` begin with prerequisites and prebuilt install,
then include complete ESM and CommonJS file workflows, a buffer workflow using
`readFile` + `loadBuffer`, result-field explanations, typed error handling, and
links to lifecycle/platform docs. Do not put compiler setup here; link to
`source-build.md` instead.

- [ ] **Step 7: Run documentation validation and inspect rendered structure**

Run:

```bash
pnpm run docs:check
```

Expected: `Documentation check passed` with exit code `0`.

Also run:

```bash
rg -n '^#{1,3} ' README.md docs/README.md docs/getting-started.md
```

Expected: headings follow the progressive-disclosure order defined in the
design and contain no duplicate full API reference.

- [ ] **Step 8: Commit the user journey**

```bash
git add README.md docs/README.md docs/getting-started.md
git commit -m "docs: make raw workflows approachable"
```

---

### Task 3: Prepare RC.2 release metadata

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `CHANGELOG.md`
- Create: `docs/releases/1.0.0-rc.2.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: release tag convention `v${package.version}` and workflow dist-tag selection for prereleases.
- Produces: one internally consistent `1.0.0-rc.2` release identity.

- [ ] **Step 1: Bump package and lockfile without creating a tag**

Run:

```bash
npm version 1.0.0-rc.2 --no-git-tag-version
```

Expected: both `package.json` and `pnpm-lock.yaml` report `1.0.0-rc.2`.

- [ ] **Step 2: Add the changelog entry**

At the top of `CHANGELOG.md`, add:

```markdown
## [1.0.0-rc.2] - 2026-08-15

### Documentation

- Rebuilt the README as a beginner-friendly landing page with representative
  camera formats, a copy-paste decode flow, common workflows, and clear support
  boundaries.
- Reorganized the documentation hub and getting-started guide around user tasks.
- Added automated validation for internal links, HTTPS external links, fenced
  code languages, required landing sections, and stale release claims.

### Release engineering

- Kept the stable v1 API and native contract unchanged from RC.1.
- Added documentation validation to CI and release packaging gates.
```

- [ ] **Step 3: Write RC.2 release notes**

Create `docs/releases/1.0.0-rc.2.md` with sections Summary, Highlights,
Compatibility, Install, Verification, Known limits, Promotion to 1.0.0, and
Related. State that RC.2 changes documentation/release presentation and retains
the RC.1 stable API. Include `npm install lightdrift-libraw@next`, the five
prebuild targets, source fallback, Node 22/24, legacy availability, and the
explicit unsupported targets.

- [ ] **Step 4: Remove stale RC.1-current wording**

Run:

```bash
rg -n 'current repository candidate|has not yet been published|After `1\.0\.0-rc\.1`|1\.0\.0-rc\.1 is the current' README.md docs package.json CHANGELOG.md
```

Expected: no current-status claim points at RC.1. Historical RC.1 release notes
and changelog entries may retain their version number.

- [ ] **Step 5: Validate release identity**

Run:

```bash
node -e "const p=require('./package.json'); if(p.version!=='1.0.0-rc.2') process.exit(1)"
pnpm run docs:check
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit release metadata**

```bash
git add package.json pnpm-lock.yaml CHANGELOG.md README.md docs/releases/1.0.0-rc.2.md
git commit -m "chore: prepare 1.0.0-rc.2"
```

---

### Task 4: Verify the local release candidate

**Files:**
- Modify only when a verification failure proves a release blocker.

**Interfaces:**
- Consumes: the complete RC.2 worktree.
- Produces: evidence that documentation, package content, stable/legacy APIs,
  source package, and local consumers satisfy release gates.

- [ ] **Step 1: Run static and documentation checks**

```bash
pnpm exec tsc --noEmit
pnpm run docs:check
git diff --check
```

Expected: all exit `0`.

- [ ] **Step 2: Run focused public-contract tests**

```bash
pnpm run test:stable
pnpm run test:legacy
pnpm run test:formats
pnpm run test:queue
```

Expected: all Vitest suites pass with no unhandled rejection or worker leak.

- [ ] **Step 3: Validate production dependencies and package contents**

```bash
pnpm audit --prod --audit-level high
pnpm run package:check
pnpm run test:package
```

Expected: no high/critical production advisory; package and CJS/ESM consumer
checks pass.

- [ ] **Step 4: Run the full publish gate and dry run**

```bash
pnpm run publish:check
pnpm run publish:dry
```

Expected: both exit `0`; dry-run package is `lightdrift-libraw@1.0.0-rc.2`,
contains all five prebuilds, README/docs/licenses, and excludes fixtures/tests.

- [ ] **Step 5: Record verification in the RC.2 release notes**

Update the Verification section with the exact commands above and state only
results observed in this worktree. Do not claim cross-platform success until
GitHub Actions completes.

- [ ] **Step 6: Commit verification-only release note changes**

```bash
git add docs/releases/1.0.0-rc.2.md
git commit -m "docs: record rc2 release verification"
```

---

### Task 5: Review, integrate, and publish RC.2

**Files:**
- No source file changes unless CI reveals a reproducible release blocker.

**Interfaces:**
- Consumes: reviewed branch with green local gates and npm trusted publisher for `unique01082/lightdrift-libraw`, `release.yml`, environment `npm`.
- Produces: merged commit, annotated tag `v1.0.0-rc.2`, GitHub prerelease with tarball/SBOM, and npm `next` release with provenance.

- [ ] **Step 1: Review branch scope and push**

```bash
git status --short --branch
git diff --stat origin/master...HEAD
git log --oneline origin/master..HEAD
git push -u origin codex/lightdrift-rc2-docs
```

Expected: only RC.2 documentation, validation, workflow, and release metadata
changes; push succeeds.

- [ ] **Step 2: Open and merge a reviewed pull request**

```bash
gh pr create --base master --head codex/lightdrift-rc2-docs \
  --title "docs: prepare lightdrift-libraw 1.0.0-rc.2" \
  --body-file docs/releases/1.0.0-rc.2.md
gh pr checks --watch
gh pr merge --merge --delete-branch
```

Expected: every required PR check succeeds before merge.

- [ ] **Step 3: Verify the exact merge commit before tagging**

```bash
git fetch origin master
git show origin/master:package.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{if(JSON.parse(s).version!=='1.0.0-rc.2')process.exit(1)})"
gh run list --branch master --limit 5
```

Expected: origin/master contains RC.2 and its merge-commit CI succeeds.

- [ ] **Step 4: Create and push the annotated tag**

```bash
git tag -a v1.0.0-rc.2 origin/master -m "Release v1.0.0-rc.2"
git push origin v1.0.0-rc.2
```

Expected: the release workflow starts from the verified merge commit.

- [ ] **Step 5: Watch the release workflow through publish**

```bash
gh run list --workflow release.yml --limit 1
gh run watch --exit-status
```

Expected: five prebuilds, source fallback, sanitizer, package/SBOM, Node 22/24
consumers, production audit, and npm publish all succeed.

- [ ] **Step 6: Create the GitHub prerelease with artifacts**

Download the `npm-package` artifact from the successful release run, then run:

```bash
gh release create v1.0.0-rc.2 \
  lightdrift-libraw-1.0.0-rc.2.tgz \
  lightdrift-libraw-sbom.json \
  --title "lightdrift-libraw 1.0.0-rc.2" \
  --notes-file docs/releases/1.0.0-rc.2.md \
  --prerelease
```

Expected: both artifacts appear on the GitHub Release and the release targets
the annotated tag.

- [ ] **Step 7: Verify npm metadata, provenance, and dist-tags**

```bash
npm view lightdrift-libraw@1.0.0-rc.2 \
  version dist.integrity dist.shasum dist.tarball dist.attestations --json
npm view lightdrift-libraw dist-tags --json
```

Expected: RC.2 exists, has SLSA provenance, `next` is `1.0.0-rc.2`, and
`latest`/`beta` are unchanged.

- [ ] **Step 8: Smoke-test the public registry package**

In a fresh temporary directory with a task-specific npm cache:

```bash
npm init -y
npm install --ignore-scripts --no-audit --no-fund lightdrift-libraw@1.0.0-rc.2
node -e "const {LibRaw}=require('lightdrift-libraw'); if(LibRaw.version()!=='0.22.2')process.exit(1)"
node --input-type=module -e "import {LibRaw} from 'lightdrift-libraw'; if(LibRaw.version()!=='0.22.2')process.exit(1)"
npm audit signatures --omit=dev
```

Expected: CJS and ESM load the bundled prebuild, LibRaw reports `0.22.2`, and
registry signature/attestation audit succeeds.

---

## Plan self-review

- Every design-spec section maps to at least one task: landing structure and
  docs architecture to Task 2, release identity to Task 3, acceptance gates to
  Tasks 1/4/5, and out-of-scope boundaries to Global Constraints.
- No new runtime API or native feature is introduced.
- The validator fails before the README rewrite and passes afterward.
- Release actions occur only after local, PR, and master gates succeed.
- npm publication uses the existing OIDC trusted publisher and preserves
  `latest` and `beta`.
