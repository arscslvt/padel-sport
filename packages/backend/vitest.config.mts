import { defineConfig } from "vitest/config";

// I test girano contro un backend Convex simulato in memoria (convex-test),
// nello stesso runtime delle funzioni vere.
export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
  },
});
