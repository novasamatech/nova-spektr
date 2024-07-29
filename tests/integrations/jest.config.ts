import { type Config } from 'jest';

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
    '^.+\\.mjs$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(dexie)/)'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@main(.*)$': '<rootDir>../../src/main/$1',
    '^@shared(.*)$': '<rootDir>../../src/renderer/shared/$1',
    '^@/(.*)$': '<rootDir>../../src/renderer/$1',
    '^@renderer(.*)$': '<rootDir>../../src/renderer/$1',
    '^@images(.*)$': '<rootDir>../../src/renderer/assets/images/$1',
    '^dexie$': '<rootDir>../../node_modules/dexie/dist/dexie.js',
  },
  runner: 'groups',
  reporters: ['default'],
};

export default config;
