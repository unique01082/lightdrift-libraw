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

  let insideFence = false;
  for (const line of markdown.split("\n")) {
    const fence = line.match(/^```(.*)$/);
    if (!fence) continue;
    if (!insideFence && !fence[1].trim()) {
      errors.push(`${relativeFile}: fenced code block needs a language`);
    }
    insideFence = !insideFence;
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
  if (readme.includes(stale)) {
    errors.push(`README.md: stale or unsupported claim: ${stale}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Documentation check passed (${markdownFiles.length} Markdown files).`);
