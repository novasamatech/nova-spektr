import { resolve } from 'node:path';

import { type UserConfigFn } from 'vite';

const config: UserConfigFn = async ({ mode }) => {
  const { defineConfig } = await import('vite');
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  const { default: svgr } = await import('vite-plugin-svgr');
  const { default: favicons } = await import('@peterek/vite-plugin-favicons');

  return defineConfig({
    root: resolve('src/renderer/app'),
    build: { outDir: resolve('release/vite__test'), emptyOutDir: true },
    plugins: [
      tsconfigPaths(),
      svgr({
        include: '**/*.svg?jsx',
        svgrOptions: {
          plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
          svgo: true,
        },
      }),
      favicons(
        mode === 'development' ? resolve('src/renderer/app/favicon.dev.png') : resolve('src/renderer/app/favicon.png'),
        {
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
    ],
  });
};

export default config;
