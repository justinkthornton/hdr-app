import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    globals: false
  },
  resolve: {
    alias: {
      "@structure-locked-hdr/core/hdr": fileURLToPath(
        new URL("./packages/core/src/hdr/index.ts", import.meta.url)
      ),
      "@structure-locked-hdr/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url)
      ),
      "@structure-locked-hdr/core/": fileURLToPath(new URL("./packages/core/src/", import.meta.url))
    }
  }
});
