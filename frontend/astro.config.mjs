// @ts-check

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import sentry from "@sentry/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
// site will be overridden by --site flag in CI for staging/production
export default defineConfig({
  site: "https://www.alexandermcintosh.com",
  integrations: [react(), sitemap(), sentry()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("@livekit/protocol")) {
                return "vendor-livekit-protocol";
              }
              if (id.includes("livekit-client")) {
                return "vendor-livekit-client";
              }
              if (
                id.includes("@livekit/components-react") ||
                id.includes("@livekit/components-core")
              ) {
                return "vendor-livekit-components";
              }
              if (
                id.includes("framer-motion") ||
                id.includes("motion-dom") ||
                id.includes("motion-utils")
              ) {
                return "vendor-motion";
              }
              if (id.includes("lucide-react")) {
                return "vendor-lucide";
              }
            }
          },
        },
      },
    },
  },
});
