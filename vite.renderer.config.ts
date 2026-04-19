import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main_window: resolve(__dirname, 'index.html'),
        floating_window: resolve(__dirname, 'floating.html'),
        settings: resolve(__dirname, 'settings.html'),
      },
    },
  },
  // Externalize native modules for renderer builds
  external: ['@xitanggg/node-insert-text'],
});
