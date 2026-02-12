/**
 * Allure Report Configuration
 *
 * This configuration file defines categories for test failures, environment
 * info collection, and history trends settings.
 *
 * @see https://allurereport.org/docs/
 */

module.exports = {
  /**
   * Categories define how test failures are classified in the report. Each
   * category has a name, matching criteria, and optional styling.
   */
  categories: [
    {
      name: 'Product Bugs',
      description: 'Test failures caused by actual product defects',
      matchedStatuses: ['failed'],
      messageRegex: '.*AssertionError.*',
    },
    {
      name: 'Test Defects',
      description: 'Failures caused by test code issues (not product bugs)',
      matchedStatuses: ['broken'],
      messageRegex: '.*TypeError.*|.*ReferenceError.*|.*SyntaxError.*',
    },
    {
      name: 'Infrastructure Issues',
      description: 'Failures caused by environment or infrastructure problems',
      matchedStatuses: ['broken', 'failed'],
      messageRegex: '.*ECONNREFUSED.*|.*ETIMEDOUT.*|.*network.*|.*timeout.*',
    },
    {
      name: 'Flaky Tests',
      description: 'Tests that intermittently fail without code changes',
      matchedStatuses: ['failed', 'broken'],
      flaky: true,
    },
    {
      name: 'Known Issues',
      description: 'Tests with known issues that are being tracked',
      matchedStatuses: ['failed'],
      messageRegex: '.*@known-issue.*|.*TODO.*|.*FIXME.*',
    },
  ],

  /**
   * Environment info to be collected and displayed in the report. This helps
   * identify the test execution context.
   */
  environment: {
    'Node.js': process.version,
    Platform: process.platform,
    Arch: process.arch,
    'Test Framework': 'Vitest',
    'Allure Reporter': 'allure-vitest',
  },

  /**
   * History configuration for trend analysis. Enables tracking test results
   * across multiple runs.
   */
  history: {
    enabled: true,
    historyDir: './allure-results/history',
  },

  /**
   * Executor info for CI/CD integration. This is typically set via environment
   * variables in CI.
   */
  executor: {
    name: process.env.CI_NAME || 'Local',
    type: process.env.CI ? 'CI' : 'local',
    buildName: process.env.CI_BUILD_NAME || 'Local Build',
    buildUrl: process.env.CI_BUILD_URL || '',
    reportUrl: process.env.CI_REPORT_URL || '',
  },
};
