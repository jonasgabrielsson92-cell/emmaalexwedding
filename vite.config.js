import { readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Finder skapar .DS_Store i public/ så fort mappen öppnas – rensa bort dem ur bygget så de aldrig publiceras.
const removeDsStore = () => {
  let outDir;
  return {
    name: 'remove-ds-store',
    apply: 'build',
    configResolved: (config) => { outDir = resolve(config.root, config.build.outDir); },
    closeBundle: () => {
      for (const entry of readdirSync(outDir, { recursive: true })) {
        if (entry.split(/[\\/]/).pop() === '.DS_Store') rmSync(join(outDir, entry));
      }
    },
  };
};

export default defineConfig({ plugins: [react(), removeDsStore()] });
