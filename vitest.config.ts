import { resolve } from 'node:path';

import { type UserConfigFnPromise, type ViteUserConfig, mergeConfig } from 'vitest/config';
import { BaseSequencer, type TestSpecification } from 'vitest/node';

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
  sort(files: TestSpecification[]) {
    return files.sort((a, b) => {
      const ac = testsPriority.findIndex((dir) => a.moduleId.startsWith(dir));
      const bc = testsPriority.findIndex((dir) => b.moduleId.startsWith(dir));

      if (ac === -1) return 1;
      if (bc === -1) return -1;

      return ac - bc;
    });
  }
}

const config: UserConfigFnPromise = async (options) => {
  const base = await rendererConfig(options);
  const config: ViteUserConfig = {
    cacheDir: resolve(folders.root, 'node_modules/.cache/vitest'),
    test: {
      root: folders.root,
      dir: folders.root,
      include: [
        'tests/integrations/**/*.test.ts',
        'tests/integrations/**/*.test.tsx',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
      ],
      globals: true,
      environmentMatchGlobs: [
        // Integration tests need happy-dom for fake-indexeddb and Dexie
        ['tests/integrations/**/*.test.ts', 'happy-dom'],
        ['tests/integrations/**/*.test.tsx', 'happy-dom'],
        // This list should dissapear over time, simple logic tests shouldn't depend on environment.
        ['src/renderer/shared/lib/hooks/**/*.ts', 'happy-dom'],
        ['src/renderer/shared/lib/utils/**/*.ts', 'happy-dom'],
        ['src/renderer/shared/i18n/**/*.ts', 'happy-dom'],
        ['src/renderer/shared/api/**/*.ts', 'happy-dom'],
        ['src/renderer/domains/**/*.ts', 'happy-dom'],
        ['src/renderer/aggregates/**/*.ts', 'happy-dom'],
        ['src/renderer/entities/**/*.ts', 'happy-dom'],
        ['src/renderer/features/**/*.ts', 'happy-dom'],
        ['src/renderer/widgets/**/*.ts', 'happy-dom'],
        ['src/renderer/pages/**/*.ts', 'happy-dom'],
        ['**/*.tsx', 'happy-dom'],
        ['**/*.ts', 'node'],
      ],
      setupFiles: resolve(folders.root, './vitest.setup.js'),
      reporters: ['default', 'junit'],
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
          branches: 25,
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
