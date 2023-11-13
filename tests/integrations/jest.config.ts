import type { Config } from 'jest';

const swcConfig = {
  sourceMaps: 'inline',
  jsc: {
    parser: {
      target: 'es2021',
      syntax: 'typescript',
      jsx: true,
      tsx: true,
      dynamicImport: true,
      allowJs: true,
    },
    transform: {
      react: {
        pragma: 'React.createElement',
        pragmaFrag: 'React.Fragment',
        runtime: 'automatic',
      },
    },
  },
};
const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  coverageReporters: ['json-summary', 'text', 'text-summary'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  setupFiles: ['<rootDir>/setup.integration.tests.ts'],
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 5,
      lines: 5,
      statements: 5,
    },
  },
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', swcConfig],
    '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)': '<rootDir>../../scripts/fileTransform.js',
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@renderer(.*)$': '<rootDir>/src/renderer/$1',
    '^@app(.*)$': '<rootDir>/src/renderer/app/$1',
    '^@pages(.*)$': '<rootDir>/src/renderer/pages/$1',
    '^@widgets(.*)$': '<rootDir>/src/renderer/widgets/$1',
    '^@features(.*)$': '<rootDir>/src/renderer/features/$1',
    '^@entities(.*)$': '<rootDir>/src/renderer/entities/$1',
    '^@shared(.*)$': '<rootDir>/src/renderer/shared/$1',
  },
  runner: 'groups',
  reporters: ['default'],
};

export default config;
