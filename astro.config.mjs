import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lawfare-timeline.vercel.app',
  output: 'static',
  build: {
    assets: '_assets',
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 1000,
    },
  },
});
