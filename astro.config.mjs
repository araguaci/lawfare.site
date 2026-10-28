import { spawn } from 'node:child_process';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

function lawfareOg() {
  return {
    name: 'lawfare-og',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        if (process.env.LAWFARE_SKIP_OG === '1') {
          console.log('[og] geração ignorada (LAWFARE_SKIP_OG=1)');
          return;
        }
        const outDir = fileURLToPath(dir);
        const cwd = fileURLToPath(new URL('.', import.meta.url));
        await new Promise((resolve, reject) => {
          const child = spawn(process.execPath, ['scripts/generate-og.mjs', outDir], {
            cwd,
            stdio: 'inherit',
          });
          child.on('error', reject);
          child.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`[og] saiu com código ${code}`));
          });
        });
      },
    },
  };
}

export default defineConfig({
  site: 'https://www.lawfare.site',
  output: 'static',
  integrations: [lawfareOg()],
  build: {
    assets: '_assets',
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 1000,
    },
  },
});
