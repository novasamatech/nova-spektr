import { type Config } from 'jest';

import baseConfig from './jest.config';

const config: Config = {
  ...baseConfig,
  testPathIgnorePatterns: [
    '<rootDir>/src/renderer/shared/ui',
    '<rootDir>/src/renderer/entities/(.*)/ui',
    '<rootDir>/src/renderer/features/(.*)/ui',
    '<rootDir>/src/renderer/widgets/(.*)/ui',
    '<rootDir>/src/renderer/pages',
    '<rootDir>/tests/',
  ],
};
export default config;
