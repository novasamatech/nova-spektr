import { resolve } from 'node:path';

import { type UserConfigFnPromise, type ViteUserConfig, mergeConfig } from 'vitest/config';

import { folders } from './config';
import rendererConfig from './vite.config.renderer';

const config: UserConfigFnPromise = async (options) => {
  const base = await rendererConfig(options);
  const config: ViteUserConfig = {
    test: {
      coverage: {
        provider: 'v8',
        ignoreEmptyLines: true,
        reporter: 'text-lcov',
        reportsDirectory: resolve('./.coverage'),
        thresholds: {
          branches: 25,
          functions: 47,
          lines: 50,
          statements: 50,
        },
      },
      root: folders.rendererRoot,
      globals: true,
      environment: 'happy-dom',
      setupFiles: resolve('./vitest.setup.js'),
      pool: 'threads',
      deps: {
        optimizer: { web: { enabled: true } },
      },
    },
  };

  return mergeConfig(base, config);
};

export default config;
