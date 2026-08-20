import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/unstyled.tsx"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  target: "es2022",
});
