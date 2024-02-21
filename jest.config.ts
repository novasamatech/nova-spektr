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
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  coverageReporters: ['json-summary', 'text', 'text-summary'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', swcConfig],
    '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|json)$)': '<rootDir>/scripts/fileTransform.js',
  },
  transformIgnorePatterns: [],
  testRegex: ['^.*\\.(test|spec)\\.[jt]sx?$'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^raptorq$': '<rootDir>/node_modules/raptorq/raptorq.js',
    '^@renderer(.*)$': '<rootDir>/src/renderer/$1',
    '^@app(.*)$': '<rootDir>/src/renderer/app/$1',
    '^@pages(.*)$': '<rootDir>/src/renderer/pages/$1',
    '^@widgets(.*)$': '<rootDir>/src/renderer/widgets/$1',
    '^@features(.*)$': '<rootDir>/src/renderer/features/$1',
    '^@entities(.*)$': '<rootDir>/src/renderer/entities/$1',
    '^@shared(.*)$': '<rootDir>/src/renderer/shared/$1',
    '^dexie$': '<rootDir>/node_modules/dexie/dist/dexie.js',
    '^lottie': 'lottie-react',
  },
  modulePathIgnorePatterns: ['<rootDir>/tests'],
  collectCoverageFrom: [
    'src/renderer/**/*.{js,ts}',
    '!src/renderer/pages/**/*.{js,ts}',
    '!src/main/',
    '!src/scripts/',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!<rootDir>/node_modules/',
  ],
  reporters: ['default', 'jest-junit'],
  setupFiles: [`<rootDir>/jest-setup.js`],
};

export default config;
