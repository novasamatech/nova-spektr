import { resolve } from 'path';

import { type UserConfigFn } from 'vite';

import { folders, title, version } from './config/index.js';

const config: UserConfigFn = async ({ mode }) => {
  const { defineConfig } = await import('vite');
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  const { default: target } = await import('vite-plugin-target');

  const isDev = mode === 'development';

  const rendererSource = process.env.RENDERER_SOURCE || (isDev ? 'localhost' : 'filesystem');

  return defineConfig({
    mode,
    cacheDir: resolve(folders.cache, 'vite-main'),
    define: {
      'process.env.PRODUCT_NAME': JSON.stringify(title),
      'process.env.VERSION': JSON.stringify(version),
      'process.env.BUILD_SOURCE': JSON.stringify(process.env.BUILD_SOURCE),
      'process.env.RENDERER_SOURCE': JSON.stringify(rendererSource),
      'process.env.LOGGER': JSON.stringify(process.env.LOGGER),
    },
    build: {
      outDir: folders.devBuild,
      emptyOutDir: false,
      lib: {
        entry: folders.entrypoint.main,
        fileName: () => 'main.cjs',
        formats: ['cjs'],
      },
      rollupOptions: {
        output: {
          // entryFileNames: `[name].js`,
          // chunkFileNames: `[name].js`,
          globals: {
            process: 'process',
          },
        },
      },
    },
    plugins: [target({ 'electron-main': {} }), tsconfigPaths()],
  });
};

export default config;
