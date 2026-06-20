import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Integration tests touch a single shared DB — run serially.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
