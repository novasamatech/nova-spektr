import type { Config } from 'jest';
import baseConfig from './jest.config.ts'; // import your existing config

const config: Config = {
  ...baseConfig,
  testPathIgnorePatterns: [
    '<rootDir>/src/renderer/entities/.*/ui',
    '<rootDir>/src/renderer/features/.*/ui',
    '<rootDir>/tests/'
  ],
};

export default config;