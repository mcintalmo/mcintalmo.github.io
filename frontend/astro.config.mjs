// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import sentry from '@sentry/astro';

// https://astro.build/config
// site will be overridden by --site flag in CI for staging/production
export default defineConfig({
  site: 'https://www.alexandermcintosh.com',
  integrations: [react(), sitemap(), sentry()],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["@copilotkit/react-core", "@copilotkit/react-ui", "@copilotkit/shared", "@copilotkitnext/react", "@copilotkitnext/core", "@ag-ui/client"],
    },
  }
});