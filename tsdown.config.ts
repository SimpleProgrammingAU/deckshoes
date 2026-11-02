import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: { index: "src/index.ts" },
  format: "esm",
  platform: "neutral",
  target: "es2023",
  dts: true,
  sourcemap: true,
  clean: true,
});

export default config;
