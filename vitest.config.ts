import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/stable/**/*.test.{ts,mts,js,mjs}"],
    testTimeout: 30_000,
  },
});
