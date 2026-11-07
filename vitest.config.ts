import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type ViteUserConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));
const readme = path.join(root, "README.md");

/** Whether a changed file can contain examples that scripts/doctest.ts reads. */
function hasExamples(file: string): boolean {
  if (file === readme) return true;
  const relative = path.relative(root, file);
  return (
    relative.startsWith(`src${path.sep}`) &&
    relative.endsWith(".ts") &&
    !/\.(?:test|test-d|bench)\.ts$/u.test(relative)
  );
}

const config: ViteUserConfig = defineConfig({
  plugins: [
    {
      // In watch mode, regenerate .doctest/ when an example changes; Vitest
      // then reruns the affected doctests.
      configureServer(server) {
        server.watcher.add(readme);
        server.watcher.on("all", (_event, file) => {
          if (!hasExamples(file)) return;
          const result = spawnSync(process.execPath, ["scripts/doctest.ts"], {
            cwd: root,
            encoding: "utf8",
          });
          if (result.status !== 0) console.error(result.stderr);
        });
      },
      name: "deckshoes:regenerate-doctests",
    },
  ],
  resolve: {
    // Exact matches: a string alias would also catch "deckshoes/presets" as
    // "deckshoes" followed by a subpath.
    alias: [
      { find: /^deckshoes$/u, replacement: path.join(root, "src", "index.ts") },
      {
        find: /^deckshoes\/presets$/u,
        replacement: path.join(root, "src", "presets", "index.ts"),
      },
    ],
  },
  test: {
    // Only the bench project has benchmarks; `vitest bench` adds a benchmark
    // run for every project.
    benchmark: { include: [] },
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.test-d.ts", "src/**/*.bench.ts"],
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
          include: ["src/**/*.test.ts", "test/**/*.test.ts"],
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
      {
        extends: true,
        test: {
          name: "bench",
          // No tests: `pnpm bench` (`vitest bench`) runs its benchmarks.
          include: [],
          benchmark: { include: ["src/**/*.bench.ts"] },
          // Node runs the source natively. Vite's module runner turns every
          // import into a getter, and calls inside the library, such as
          // shuffle to randomIndex, would time those getters too.
          experimental: { viteModuleRunner: false },
        },
      },
    ],
  },
});

export default config;
