/// <reference types="vitest/config" />

import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Minimal vitest config for src/main tests.
 * Does NOT load vite.config.renderer.ts to avoid mkcert issues in CI.
 */
export default defineConfig({
  // @ts-expect-error plugin types
  plugins: [tsconfigPaths()],
  test: {
    root: resolve(__dirname),
    include: ['src/main/**/*.test.ts'],
    globals: true,
    environment: 'node',
    reporters: ['verbose'],
    pool: 'forks',
  },
});
