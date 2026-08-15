const { spawnSync } = require("node:child_process");
const { version } = require("../package.json");

const distTag = version.includes("-") ? "next" : "latest";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["publish", "--dry-run", "--tag", distTag], {
  cwd: require("node:path").resolve(__dirname, ".."),
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
