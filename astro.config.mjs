// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
// site will be overridden by --site flag in CI for staging/production
export default defineConfig({
  site: 'https://mcintalmo.github.io',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()]
  }
});
