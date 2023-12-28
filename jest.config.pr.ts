import type { Config } from 'jest';

import baseConfig from './jest.config.ts';

const config: Config = {
  ...baseConfig,
  testPathIgnorePatterns: [
    '<rootDir>/src/renderer/entities/.*/ui',
    '<rootDir>/src/renderer/features/.*/ui',
    '<rootDir>/tests/',
  ],
};

export default config;
