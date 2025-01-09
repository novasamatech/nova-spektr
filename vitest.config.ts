import { resolve } from 'node:path';

import { type UserConfigFnPromise, type ViteUserConfig, mergeConfig } from 'vitest/config';
import { BaseSequencer, type WorkspaceSpec } from 'vitest/node';

import { folders } from './config/index.js';
import rendererConfig from './vite.config.renderer';

const testsPriority = [
  resolve(folders.rendererRoot, 'domains'),
  resolve(folders.rendererRoot, 'features'),
  resolve(folders.rendererRoot, 'entities'),
  resolve(folders.rendererRoot, 'shared'),
  // ... other
];

class Seqencer extends BaseSequencer {
  async sort(files: WorkspaceSpec[]) {
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
      dir: folders.source,
      globals: true,
      environment: 'happy-dom',
      setupFiles: resolve(folders.root, './vitest.setup.js'),
      reporters: ['basic', 'junit'],
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
