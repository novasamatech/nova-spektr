import { resolve } from 'path';

import { type UserConfigFn } from 'vite';

import { folders, title, version } from './config/index.js';

const config: UserConfigFn = async ({ mode }) => {
  const { defineConfig } = await import('vite');
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
        entry: folders.entrypoint.preload,
        fileName: () => 'preload.cjs',
        formats: ['cjs'],
      },
      rolldownOptions: {
        output: {
          globals: {
            process: 'process',
          },
        },
      },
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [target({ 'electron-preload': {} })],
  });
};

export default config;
