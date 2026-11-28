import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: {
    index: "src/index.ts",
    blackjack: "src/blackjack/index.ts",
    presets: "src/presets/index.ts",
  },
  tsconfig: "tsconfig.lib.json",
  format: "esm",
  // Code that two or more entry points use goes in one shared chunk. Left to
  // itself, the bundler makes a chunk for each set of entry points that share
  // code, so every new entry point would split the root's shared code
  // differently. Its code would be the same, but in another order, and its
  // measured size would change with how well that order compresses. The
  // declarations (`.d.ts`) are left to split as they do by default: grouped
  // too, they'd take the same file name as the code's chunk.
  outputOptions: {
    codeSplitting: {
      groups: [
        {
          minShareCount: 2,
          name: "shared",
          test: (id) => !id.endsWith(".d.ts"),
        },
      ],
    },
  },
  platform: "neutral",
  target: "es2023",
  dts: true,
  sourcemap: true,
  clean: true,
});

export default config;
