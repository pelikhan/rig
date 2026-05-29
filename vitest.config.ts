import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^rig$/, replacement: resolve(__dirname, "src/rig.ts") },
      { find: /^rig\/(.*)$/, replacement: resolve(__dirname, "src/$1") },
    ],
  },
});
