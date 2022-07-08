import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  testEnvironment: 'jest-environment-jsdom',
  coverageReporters: ['json-summary', 'text', 'text-summary'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  transform: {
    '^.+\\.tsx?$': '@swc/jest',
  },
  moduleNameMapper: {
    '^#(.*)$': '<rootDir>/src$1',
    '^#main(.*)$': '<rootDir>/src/main$1',
    '^#shared(.*)$': '<rootDir>/src/shared$1',

    '^@components(.*)$': '<rootDir>/src/renderer/components$1',
    '^@assets(.*)$': '<rootDir>/src/renderer/assets$1',
    '^@context(.*)$': '<rootDir>/src/renderer/context$1',
    '^@screens(.*)$': '<rootDir>/src/renderer/screens$1',
  },
  collectCoverageFrom: [
    'src/renderer/**/*.{js,jsx,ts,tsx}',
    '!src/main/',
    '!src/shared/',
    '!src/scripts/',
    '!src/renderer/**/*.stories.{js,jsx,ts,tsx}',
    '!<rootDir>/node_modules/',
  ],
};

export default config;
