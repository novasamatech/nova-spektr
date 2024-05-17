const fs = require('fs');
const path = require('path');

const prettierConfig = fs.readFileSync('./.prettierrc', 'utf8');
const prettierOptions = JSON.parse(prettierConfig);
const checkI18n = process.env.I18N === 'true';
const localePath = path.resolve('./src/renderer/shared/api/translation/locales/en.json');

module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  globals: {
    JSX: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:import/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:jest-dom/recommended',
    'plugin:i18n-json/recommended',
    'plugin:i18next/recommended',
    'plugin:effector/recommended',
    'plugin:effector/scope',
    'prettier',
  ],
  plugins: ['effector', '@typescript-eslint', 'prettier', 'import', 'unused-imports', 'jest-dom', 'json'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  settings: {
    react: { version: 'detect' },

    'import/resolver': {
      alias: {
        map: [
          ['@', './'],
          ['@renderer', './src/renderer/'],
          ['@app', './src/renderer/app/'],
          ['@pages', './src/renderer/pages/'],
          ['@processes', './src/renderer/processes/'],
          ['@widgets', './src/renderer/widgets/'],
          ['@features', './src/renderer/features/'],
          ['@entities', './src/renderer/entities/'],
          ['@shared', './src/renderer/shared/'],
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    },
  },
  rules: {
    'import/order': [
      'error',
      {
        groups: [
          ['builtin', 'external'],
          ['internal', 'sibling', 'parent', 'object', 'index'],
        ],
        'newlines-between': 'always',
      },
    ],
    'no-unused-vars': 'off',
    'no-irregular-whitespace': 'off',
    'newline-before-return': 'error',
    '@typescript-eslint/no-empty-interface': 0,
    'prettier/prettier': ['error', prettierOptions],
    'unused-imports/no-unused-imports': 'error',
    'react/no-array-index-key': 'warn',
    'react/display-name': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-sort-props': ['error', { callbacksLast: true, noSortAlphabetically: true }],
    'react/function-component-definition': [
      'error',
      {
        namedComponents: 'arrow-function',
        unnamedComponents: 'arrow-function',
      },
    ],
    'i18n-json/identical-keys': ['error', { filePath: localePath }],
    'i18n-json/identical-placeholders': ['error', { filePath: localePath }],
    'i18next/no-literal-string': [
      checkI18n ? 'error' : 'off',
      {
        mode: 'jsx-text-only',
        'should-validate-template': true,
        'jsx-attributes': {
          include: ['alt', 'aria-label', 'title', 'placeholder', 'label', 'description'],
          exclude: ['data-testid', 'className'],
        },
        callees: {
          exclude: ['Error', 'log', 'warn'],
        },
        words: {
          exclude: ['[0-9!-/:-@[-`{-~]+', '[A-Z_-]+'],
        },
      },
    ],
  },
  ignorePatterns: [
    '.vscode',
    'coverage',
    'release',
    'node_modules',
    'coverage.txt',
    'junit.xml',
    'jest-unit-results.json',
    'package.json',
  ],
};
