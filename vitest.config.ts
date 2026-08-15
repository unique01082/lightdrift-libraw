import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/stable/**/*.test.{ts,mts,js,mjs}"],
    testTimeout: Number(process.env.VITEST_TEST_TIMEOUT ?? 120_000),
  },
});
