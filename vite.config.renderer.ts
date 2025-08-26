/// <reference types="vitest/config" />

import { cpus } from 'node:os';
import { resolve } from 'node:path';

import { type Plugin, type UserConfigFn } from 'vite';

import { folders, renderer, title, version } from './config/index.js';

function skipSourcemaps(paths: string[]): Plugin {
  return {
    name: 'skip-sourcemaps',
    transform(code, id) {
      if (paths.some((pkg) => id.includes(pkg))) {
        return {
          code: code,
          // https://github.com/rollup/rollup/blob/master/docs/plugin-development/index.md#source-code-transformations
          map: { mappings: '' },
        };
      }
    },
  };
}

const config: UserConfigFn = async ({ mode, command }) => {
  const { defineConfig } = await import('vite');
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  const { default: svgr } = await import('vite-plugin-svgr');
  const { default: favicons } = await import('@peterek/vite-plugin-favicons');
  const { default: react } = await import('@vitejs/plugin-react-swc');
  const { default: mkcert } = await import('vite-plugin-mkcert');
  const { compression, defineAlgorithm } = await import('vite-plugin-compression2');
  const { nodePolyfills } = await import('vite-plugin-node-polyfills');
  // @ts-expect-error unresolved import type
  const { default: tailwindcss } = await import('@tailwindcss/vite');

  const isDev = mode === 'development';
  const isProd = mode === 'production';
  const isStage = mode === 'staging';

  const commonPlugins = [
    skipSourcemaps(['node_modules']),
    tsconfigPaths(),
    nodePolyfills({
      include: ['buffer', 'events', 'crypto', 'stream'],
    }),
  ];

  return defineConfig({
    mode: isStage ? 'production' : mode,
    cacheDir: resolve(folders.cache, 'vite-renderer'),
    base: '',
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
        treeshake: 'recommended',
        maxParallelFileOps: Math.max(1, cpus().length - 1),
        onLog(level, log, handler) {
          if (log.cause) {
            const cause = log.cause as Record<string, string>;

            if (cause.message === `Can't resolve original location of error.`) {
              return;
            }
          }

          handler(level, log);
        },
      },
    },
    assetsInclude: ['**/*.wasm'],
    server: {
      // host: renderer.server.host,
      port: renderer.server.port,
    },
    plugins: [
      ...commonPlugins,

      command === 'serve' && mkcert(),

      tailwindcss(),

      react({
        plugins:
          command === 'serve'
            ? [['@effector/swc-plugin', { addNames: true, addLoc: true, factories: ['@/shared/di'] }]]
            : [],
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

      isProd &&
        command === 'build' &&
        compression({
          algorithms: [defineAlgorithm('gzip', { level: 9 })],
          include: /.+/,
          skipIfLargerOrEqual: true,
          threshold: 0,
        }),
    ],

    optimizeDeps: {
      // .wasm module inside library get incorrect path when optimized by vite.
      exclude: ['raptorq'],
    },
  });
};

export default config;
