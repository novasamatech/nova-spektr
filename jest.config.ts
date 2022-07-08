import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  testEnvironment: 'jest-environment-jsdom',
  coverageReporters: ['json-summary', 'text', 'text-summary'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 5,
      lines: 5,
      statements: 5,
    },
  },
  transform: {
    '^.+\\.tsx?$': '@swc/jest',
  },
  moduleNameMapper: {
    // '^@(.*)$': '<rootDir>/src$1',
    '^@main(.*)$': '<rootDir>/src/main$1',
    '^@shared(.*)$': '<rootDir>/src/shared$1',
    '^@renderer(.*)$': '<rootDir>/src/renderer$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/renderer/**/*.{js,jsx,ts,tsx}',
    '!src/main/',
    '!src/shared/',
    '!src/scripts/',
    '!src/stories/stories/**/*.{js,jsx,ts,tsx}',
    '!<rootDir>/node_modules/',
  ],
};

export default config;
