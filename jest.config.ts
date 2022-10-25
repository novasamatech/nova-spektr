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
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', swcConfig],
    '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|json)$)': '<rootDir>/scripts/fileTransform.js',
  },
  // help @swc/jest to transform node_modules esm packages (swiper.js I look at you)
  transformIgnorePatterns: [],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^raptorq$': '<rootDir>/node_modules/raptorq/raptorq.js',
    '^@main(.*)$': '<rootDir>/src/main/$1',
    '^@shared(.*)$': '<rootDir>/src/shared/$1',
    '^@renderer(.*)$': '<rootDir>/src/renderer/$1',
    '^@images(.*)$': '<rootDir>/src/renderer/assets/images/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/tests'],
  collectCoverageFrom: [
    'src/renderer/**/*.{js,jsx,ts,tsx}',
    '!src/main/',
    '!src/shared/',
    '!src/scripts/',
    '!src/stories/stories/**/*.{js,jsx,ts,tsx}',
    '!<rootDir>/node_modules/',
  ],
  reporters: ['default', 'jest-junit'],
  setupFiles: [`<rootDir>/jest-setup.js`],
};

export default config;
