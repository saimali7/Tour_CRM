import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Enable global test APIs without imports
    globals: true,
    // Environment for tests
    environment: "node",
    // Include patterns
    include: ["**/*.{test,spec}.{ts,tsx}"],
    // Exclude patterns
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "node_modules/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/dist/**",
        "**/.next/**",
      ],
    },
    // Setup files
    setupFiles: [],
    // Timeout for tests
    testTimeout: 10000,
  },
});
