import { resolve } from 'node:path';

import { type ViteUserConfig, type ViteUserConfigFnPromise, mergeConfig } from 'vitest/config';
import { type TestSpecification, BaseSequencer } from 'vitest/node';

import { folders } from './config/index.js';
import rendererConfig from './vite.config.renderer';

const testsPriority = [
  resolve(folders.rendererRoot, 'domains'),
  resolve(folders.rendererRoot, 'aggregates'),
  resolve(folders.rendererRoot, 'features'),
  resolve(folders.rendererRoot, 'entities'),
  resolve(folders.rendererRoot, 'shared'),
  // ... other
];

class Seqencer extends BaseSequencer {
  async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
    return files.sort((a, b) => {
      const ac = testsPriority.findIndex((dir) => a.moduleId.startsWith(dir));
      const bc = testsPriority.findIndex((dir) => b.moduleId.startsWith(dir));

      if (ac === -1) return 1;
      if (bc === -1) return -1;

      return ac - bc;
    });
  }
}

const config: ViteUserConfigFnPromise = async (options) => {
  const base = await rendererConfig(options);
  const config: ViteUserConfig = {
    cacheDir: resolve(folders.root, 'node_modules/.cache/vitest'),
    resolve: {
      alias: {
        // Vite 7 native tsconfigPaths does not resolve @/ aliases during Vitest's
        // transform pass (it works in production Rolldown builds but not test runs).
        // Explicit alias ensures @/X → src/renderer/X in all environments.
        '@': resolve(folders.rendererRoot),
        // @polkadot/rpc-provider/mock ESM build uses deprecated `import ... assert { type: 'json' }`
        // which is a SyntaxError in Node 22+. Redirect to the CJS build which uses require() instead.
        '@polkadot/rpc-provider/mock': resolve(folders.root, 'node_modules/@polkadot/rpc-provider/cjs/mock/index.js'),
      },
    },
    test: {
      root: folders.root,
      dir: folders.root,
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      globals: true,
      environment: 'happy-dom',
      setupFiles: resolve(folders.root, './vitest.setup.js'),
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
      sequence: {
        sequencer: Seqencer,
      },
      coverage: {
        provider: 'v8',
        ignoreEmptyLines: true,
        exclude: ['**/node_modules/**'],
        reportsDirectory: folders.coverage,
        thresholds: {
          branches: 20,
          functions: 10,
          lines: 10,
          statements: 10,
        },
        reporter: 'json-summary',
      },
      pool: 'forks',
      maxConcurrency: 8,
      deps: { optimizer: { web: { enabled: true } } },
    },
  };

  return mergeConfig(base, config);
};

export default config;
