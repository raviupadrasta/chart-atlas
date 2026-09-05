import { defineConfig } from "vite";
import { resolve } from "node:path";

// Two modes from one config:
//  - `vite`        (dev)   serves demo/index.html against source directly
//  - `vite build`  (build) bundles src/index.ts as a library (ESM + CJS)
export default defineConfig(({ command }) => {
  if (command === "serve") {
    return {
      root: "demo",
    };
  }
  return {
    build: {
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        name: "ChartAtlas",
        fileName: (format) => (format === "es" ? "chart-atlas.js" : "chart-atlas.cjs"),
        formats: ["es", "cjs"],
      },
      sourcemap: true,
    },
  };
});
