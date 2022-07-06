module.exports = {
  verbose: true,
  testEnvironment: 'jsdom',
  coverageReporters: ['json-summary', 'text', 'text-summary'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  transform: {
    '^.+\\.tsx?$': ['@swc/jest'],
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!<rootDir>/node_modules/',
    '!src/index.tsx',
    '!src/serviceWorker.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
};
