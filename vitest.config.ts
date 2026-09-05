import { defineConfig } from "vitest/config";

// Separate from vite.config.ts on purpose: that file switches `root` to
// `demo/` in dev-server mode, which would make vitest (which also boots a
// Vite instance) look for tests under demo/ instead of the repo root.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
});
