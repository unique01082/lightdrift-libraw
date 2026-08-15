const { readdirSync } = require("node:fs");
const { join, relative } = require("node:path");

const root = join(__dirname, "..", "vendor", "libraw-0.22.2", "src");

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.isFile() &&
      entry.name.endsWith(".cpp") &&
      !entry.name.endsWith("_ph.cpp")
      ? [absolute]
      : [];
  });
}

process.stdout.write(
  walk(root)
    .sort()
    .map((file) =>
      relative(join(__dirname, ".."), file).replaceAll("\\", "/"),
    )
    .join(" ")
);
