import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

// Zalo creates its own HTML; it needs the exact built CSS and JS filenames.
function miniAppManifest(): Plugin {
  return {
    name: 'vna-mini-app-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const config = JSON.parse(readFileSync(new URL('./app-config.json', import.meta.url), 'utf8'));
      const files = Object.values(bundle);
      config.listCSS = files.filter(file => file.type === 'asset' && file.fileName.endsWith('.css')).map(file => file.fileName);
      config.listSyncJS = files.filter(file => file.type === 'chunk' && file.isEntry).map(file => file.fileName);
      config.listAsyncJS = files.filter(file => file.type === 'chunk' && !file.isEntry).map(file => file.fileName);
      this.emitFile({ type: 'asset', fileName: 'app-config.json', source: JSON.stringify(config, null, 2) });
    },
  };
}

export default defineConfig({
  plugins: [react(), miniAppManifest()],
  base: './',
  server: { host: 'localhost', port: 5173, strictPort: true },
  preview: { host: 'localhost', port: 4173, strictPort: true },
  build: {
    target: 'es2018',
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].module.js',
        chunkFileNames: 'assets/[name].[hash].module.js',
      },
    },
  },
});
