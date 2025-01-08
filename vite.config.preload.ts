import { resolve } from 'path';

import { type UserConfigFn } from 'vite';

import { folders, title, version } from './config/index.js';

const config: UserConfigFn = async ({ mode }) => {
  const { defineConfig } = await import('vite');
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  const { default: target } = await import('vite-plugin-target');

  return defineConfig({
    mode,
    cacheDir: resolve(folders.cache, 'vite-preload'),
    define: {
      'process.env.PRODUCT_NAME': JSON.stringify(title),
      'process.env.VERSION': JSON.stringify(version),
      'process.env.BUILD_SOURCE': JSON.stringify(process.env.BUILD_SOURCE),
      'process.env.LOGGER': JSON.stringify(process.env.LOGGER),
    },
    build: {
      outDir: folders.devBuild,
      emptyOutDir: false,
      lib: {
        entry: folders.entrypoint.bridge,
        fileName: () => 'preload.cjs',
        formats: ['cjs'],
      },
      rollupOptions: {
        output: {
          globals: {
            process: 'process',
          },
        },
      },
    },
    plugins: [target({ 'electron-preload': {} }), tsconfigPaths()],
  });
};

export default config;
