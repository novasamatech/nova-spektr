/// <reference types="vitest/config" />

import { resolve } from 'node:path';

import { type UserConfigFn } from 'vite';

import { folders, renderer, title, version } from './config';

const config: UserConfigFn = async ({ mode }) => {
  const { defineConfig } = await import('vite');
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  const { default: svgr } = await import('vite-plugin-svgr');
  const { default: favicons } = await import('@peterek/vite-plugin-favicons');
  const { default: react } = await import('@vitejs/plugin-react-swc');
  const { default: mkcert } = await import('vite-plugin-mkcert');
  const { compression } = await import('vite-plugin-compression2');
  const { nodePolyfills } = await import('vite-plugin-node-polyfills');

  const isDev = mode === 'development';
  const isStage = mode === 'staging';

  const commonPlugins = [
    tsconfigPaths(),
    nodePolyfills({
      include: ['buffer', 'events', 'crypto', 'stream'],
    }),
  ];

  return defineConfig({
    mode: isStage ? 'production' : mode,
    cacheDir: resolve(folders.cache, 'vite-renderer'),
    root: resolve(folders.rendererRoot, 'app'),
    define: {
      'process.env.PRODUCT_NAME': JSON.stringify(title),
      'process.env.VERSION': JSON.stringify(version),
      'process.env.BUILD_SOURCE': JSON.stringify(process.env.BUILD_SOURCE),
      'process.env.CHAINS_FILE': JSON.stringify(process.env.CHAINS_FILE ?? 'chains'),
      'process.env.TOKENS_FILE': JSON.stringify(process.env.TOKENS_FILE ?? 'tokens'),
      'process.env.LOGGER': JSON.stringify(process.env.LOGGER),
    },
    worker: {
      format: 'es',
      plugins: () => commonPlugins,
    },
    build: {
      sourcemap: isStage || undefined,
      minify: !isDev,
      outDir: folders.devBuild,
      emptyOutDir: false,
      target: 'es2021',
      rollupOptions: {
        treeshake: 'smallest',
      },
    },
    server: {
      // host: renderer.server.host,
      port: renderer.server.port,
    },
    plugins: [
      ...commonPlugins,

      mkcert(),

      react({
        plugins: isDev ? [['@effector/swc-plugin', {}]] : [],
      }),
      svgr({
        include: '**/*.svg?jsx',
        esbuildOptions: { jsx: 'automatic' },
        svgrOptions: {
          plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
          memo: true,
          ref: true,
          jsxRuntime: 'automatic',
          svgo: true,
          svgoConfig: {
            plugins: [
              {
                name: 'preset-default',
                params: { overrides: { removeViewBox: false, cleanupIds: false } },
              },
            ],
          },
        },
      }),
      favicons(
        mode === 'development'
          ? resolve(folders.rendererRoot, 'app/favicon.dev.png')
          : resolve(folders.rendererRoot, 'app/favicon.png'),
        {
          appName: 'Nova Spektr',
          appShortName: 'Spektr',
          appDescription:
            'Enterprise desktop wallet for Polkadot supporting multisigs, staking, light clients and more',
          icons: {
            android: true,
            appleIcon: true,
            appleStartup: true,
            favicons: true,
            windows: true,
            yandex: true,
          },
        },
      ),

      compression({
        algorithm: 'gzip',
        include: /.+/,
        skipIfLargerOrEqual: true,
        threshold: 0,
        compressionOptions: {
          level: 9,
        },
      }),
    ],
  });
};

export default config;
