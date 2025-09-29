/**
 * @type {import('@stryker-mutator/core').StrykerOptions}
 */
export default {
  packageManager: 'pnpm',
  testRunner: 'vitest',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  coverageAnalysis: 'perTest',
  mutate: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/**/*.spec.ts',
    '!src/**/*.spec.tsx',
    '!src/**/__tests__/**',
  ],
  ignorePatterns: [
    'dist/**',
    'build/**',
    'release/**',
    'node_modules/**',
    'tests/**',
    'docs/**',
    'config/**',
    'scripts/**',
    'docker/**',
    '*.config.*',
    '*.json',
    '*.md',
    '*.yml',
    '*.yaml',
    'vitest.config.ts',
    'vite.config.*',
  ],
  timeoutMS: 60000,
  concurrency: 4,
  logLevel: 'info',
  plugins: ['@stryker-mutator/vitest-runner'],
  vitest: {
    related: false,
  },
  htmlReporter: {
    fileName: 'reports/mutation/mutation-report.html',
  },
  jsonReporter: {
    fileName: 'reports/mutation/mutation-report.json',
  },
  thresholds: {
    high: 80,
    low: 70,
    break: 65,
  },
};
