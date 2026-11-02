import { fileURLToPath } from "node:url";
import { defineConfig, type ViteUserConfig } from "vitest/config";

const deckshoes = fileURLToPath(new URL("src/index.ts", import.meta.url));

const config: ViteUserConfig = defineConfig({
  resolve: {
    alias: { deckshoes },
  },
  test: {
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.test-d.ts"],
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          typecheck: {
            enabled: true,
            include: ["src/**/*.test-d.ts"],
          },
        },
      },
      {
        extends: true,
        test: {
          name: "examples",
          include: [".doctest/**/*.test.ts"],
        },
      },
    ],
  },
});

export default config;
