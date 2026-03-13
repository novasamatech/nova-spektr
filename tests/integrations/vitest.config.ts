import { resolve } from 'node:path';

import { type ViteUserConfig, type ViteUserConfigFnPromise, mergeConfig } from 'vitest/config';

import { folders } from '../../config/index.js';
import rendererConfig from '../../vite.config.renderer';

const config: ViteUserConfigFnPromise = async (options) => {
  const base = await rendererConfig(options);
  const testConfig: ViteUserConfig = {
    cacheDir: resolve(folders.root, 'node_modules/.cache/vitest'),
    resolve: {
      alias: {
        '@polkadot/rpc-provider/mock': resolve(folders.root, 'node_modules/@polkadot/rpc-provider/cjs/mock/index.js'),
      },
    },
    test: {
      root: folders.root,
      dir: folders.root,
      include: ['tests/integrations/**/*.test.ts', 'tests/integrations/**/*.test.tsx'],
      globals: true,
      environment: 'happy-dom',
      setupFiles: [
        resolve(folders.root, './vitest.setup.js'),
        resolve(folders.root, './tests/integrations/vitest.setup.ts'),
      ],
      testTimeout: 15_000,
      reporters: [
        'default',
        'junit',
        [
          'allure-vitest/reporter',
          {
            resultsDir: resolve(folders.root, './allure-results'),
            links: {
              issue: {
                urlTemplate: 'https://github.com/novasamatech/nova-spektr/issues/%s',
              },
            },
          },
        ],
      ],
      outputFile: {
        junit: resolve(folders.root, './junit.xml'),
      },
      pool: 'forks',
      maxConcurrency: 8,
      deps: { optimizer: { web: { enabled: true } } },
    },
  };

  return mergeConfig(base, testConfig);
};

export default config;
