/// <reference types="vitest/config" />

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

/**
 * Strict CSP meta in index.html blocks Vite's inline HMR/React Refresh scripts;
 * strip only for dev server.
 */
function stripCspMetaInDev(): Plugin {
  return {
    name: 'strip-csp-meta-dev',
    transformIndexHtml(html) {
      return html.replace(/<meta[\s\S]*?http-equiv=["']Content-Security-Policy["'][\s\S]*?\/>/gi, '');
    },
  };
}

const config: UserConfigFn = async ({ mode, command }) => {
  const { defineConfig, loadEnv } = await import('vite');
  const { default: svgr } = await import('vite-plugin-svgr');
  const { default: favicons } = await import('@peterek/vite-plugin-favicons');
  const { default: react } = await import('@vitejs/plugin-react-swc');
  const { default: mkcert } = await import('vite-plugin-mkcert');
  const { compression, defineAlgorithm } = await import('vite-plugin-compression2');
  const { default: tailwindcss } = await import('@tailwindcss/vite');

  // Secrets that must not live in source come from the shell or a git-ignored `.env` (see `.env.example`).
  const env = loadEnv(mode, folders.root, 'WALLET_CONNECT_');

  const isDevServer = command === 'serve';
  const isDev = mode === 'development';
  const isProd = mode === 'production';
  const isStage = mode === 'staging';

  const commonPlugins = [skipSourcemaps(['node_modules'])];

  return defineConfig({
    mode: isStage ? 'production' : mode,
    cacheDir: resolve(folders.cache, 'vite-renderer'),
    resolve: {
      tsconfigPaths: true,
      alias: {
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        lodash: 'lodash-es',
      },
    },
    base: '',
    root: resolve(folders.rendererRoot, 'app'),
    define: {
      'process.env.PRODUCT_NAME': JSON.stringify(title),
      'process.env.VERSION': JSON.stringify(version),
      'process.env.BUILD_SOURCE': JSON.stringify(process.env.BUILD_SOURCE),
      'process.env.CHAINS_FILE': JSON.stringify(process.env.CHAINS_FILE ?? 'chains'),
      'process.env.TOKENS_FILE': JSON.stringify(process.env.TOKENS_FILE ?? 'tokens'),
      'process.env.LOGGER': JSON.stringify(process.env.LOGGER),
      'process.env.WALLET_CONNECT_PROJECT_ID': JSON.stringify(
        process.env.WALLET_CONNECT_PROJECT_ID ?? env.WALLET_CONNECT_PROJECT_ID ?? '',
      ),
      global: 'globalThis',
    },
    worker: {
      format: 'es',
      plugins: () => commonPlugins,
    },
    build: {
      sourcemap: (isDev && !isDevServer) || isStage || undefined,
      minify: !isDev,
      outDir: folders.devBuild,
      emptyOutDir: false,
      target: 'es2021',
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@polkadot/')) return 'polkadot';
            if (id.includes('@walletconnect/')) return 'walletconnect';
            if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor';
          },
        },
      },
    },
    assetsInclude: ['**/*.wasm'],
    server: {
      port: renderer.server.port,
    },
    plugins: [
      ...commonPlugins,

      isDevServer && stripCspMetaInDev(),

      isDevServer && mkcert(),

      tailwindcss(),

      // @vitejs/plugin-react-swc automatically disables React Fast Refresh
      // (and the associated window.$RefreshReg$ / window.$RefreshSig$ globals)
      // in production builds. The effector SWC plugin with HMR is only applied
      // during the dev-server to keep those globals out of production bundles.
      react({
        plugins: isDevServer
          ? [['@effector/swc-plugin', { hmr: 'es', addNames: true, addLoc: false, factories: ['@/shared/di'] }]]
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
      favicons(resolve(folders.rendererRoot, 'app/favicon.png'), {
        appName: 'Nova Spektr',
        appShortName: 'Spektr',
        appDescription: 'Enterprise desktop wallet for Polkadot supporting multisigs, staking, light clients and more',
        icons: {
          android: true,
          appleIcon: true,
          appleStartup: true,
          favicons: true,
          windows: true,
          yandex: true,
        },
      }),

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
