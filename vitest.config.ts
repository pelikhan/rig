import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      rig: resolve(__dirname, "src/rig.ts"),
    },
  },
});
