const fs = require('fs');
const path = require('path');

module.exports = {
  extends: ['plugin:i18n-json/recommended', 'plugin:i18next/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },

  rules: {
    'i18n-json/valid-json': [2],
    'i18n-json/valid-message-syntax': [
      2,
      {
        syntax: 'icu',
      },
    ],
    'i18n-json/identical-keys': [
      2,
      {
        filePath: path.resolve('./src/shared/locale/en.json'),
      },
    ],
    'i18n-json/identical-placeholders': [
      2,
      {
        filePath: path.resolve('./src/shared/locale/en.json'),
      },
    ],
    'i18n-json/sorted-keys': [
      2,
      {
        order: 'asc',
        indentSpaces: 2,
      },
    ],
    'i18next/no-literal-string': [
      2,
      {
        mode: 'jsx-text-only',
        'jsx-attributes': {
          include: [],
          exclude: ['className', 'styleName', 'style', 'type', 'key', 'id', 'width', 'height', 'data-testid'],
        },
        callees: {
          exclude: [
            'i18n(ext)?',
            't',
            'require',
            'addEventListener',
            'removeEventListener',
            'postMessage',
            'getElementById',
            'dispatch',
            'commit',
            'includes',
            'indexOf',
            'endsWith',
            'startsWith',
            'Error',
          ],
        },
        words: {
          include: [],
          exclude: ['[0-9!-/:-@[-`{-~]+', '[A-Z_-]+'],
        },
        'should-validate-template': true,
      },
    ],
  },
  ignorePatterns: ['e2e/', 'node_modules/', 'release/', '**/*.test.*', '**/*.stories.*'],
};
