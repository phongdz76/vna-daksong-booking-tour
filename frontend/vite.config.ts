import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import zaloMiniApp from 'zmp-vite-plugin';

export default defineConfig({
  // The Zalo extension builds directly with Vite and expects the plugin's www output.
  // npm run build supplies --outDir dist for the web/Vercel build.
  plugins: [react(), zaloMiniApp()],
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
