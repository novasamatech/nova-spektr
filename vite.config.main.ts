import { type UserConfigFn } from 'vite';

import { folders, title, version } from './config';

const config: UserConfigFn = async ({ mode }) => {
  const { defineConfig } = await import('vite');
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  const { default: target } = await import('vite-plugin-target');

  return defineConfig({
    mode,
    // root: folders.mainRoot,
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
