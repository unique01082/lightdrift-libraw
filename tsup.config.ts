import { defineConfig } from "tsup";

const common = {
  bundle: true,
  clean: true,
  dts: true,
  platform: "node" as const,
  sourcemap: true,
  splitting: false,
  target: "node22",
  shims: true,
  external: ["sharp", "node-gyp-build"],
};

export default defineConfig([
  {
    ...common,
    entry: {
      index: "lib/stable/index.ts",
      legacy: "lib/stable/legacy.ts",
    },
    format: ["esm", "cjs"],
    outExtension({ format }) {
      return { js: format === "esm" ? ".mjs" : ".cjs" };
    },
  },
  {
    ...common,
    dts: false,
    entry: { "processor-worker": "lib/stable/processor-worker.ts" },
    format: ["cjs"],
    outExtension() {
      return { js: ".cjs" };
    },
  },
]);
