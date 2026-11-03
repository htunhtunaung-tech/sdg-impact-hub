import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/setup-server-only.ts") } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
