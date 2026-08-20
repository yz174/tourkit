import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.dom.tsx", "src/**/*.dom.ts"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
