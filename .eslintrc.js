const fs = require('fs');
const path = require('path');

const prettierConfig = fs.readFileSync('./.prettierrc', 'utf8');
const prettierOptions = JSON.parse(prettierConfig);

const checkTranslation = process.env.CHECK_TRANSLATION === 'true';

module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:jest-dom/recommended',
    'plugin:import/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'prettier',
    'plugin:i18n-json/recommended',
    'plugin:i18next/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  plugins: ['@typescript-eslint', 'prettier', 'testing-library', 'import', 'jest-dom'],
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['@main', './src/main/'],
          ['@shared', './src/shared/'],
          ['@renderer', './src/renderer/'],
          ['@images', './src/renderer/assets/images/'],
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
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
    'newline-before-return': 'error',
    '@typescript-eslint/no-empty-interface': 0,
    'prettier/prettier': ['error', prettierOptions],
    'i18n-json/valid-json': [checkTranslation ? 'error' : 'off'],
    'i18n-json/valid-message-syntax': [
      checkTranslation ? 'error' : 'off',
      {
        syntax: 'icu',
      },
    ],
    'i18n-json/identical-keys': [
      checkTranslation ? 'error' : 'off',
      {
        filePath: path.resolve('./src/shared/locale/en.json'),
      },
    ],
    'i18n-json/identical-placeholders': [
      checkTranslation ? 'error' : 'off',
      {
        filePath: path.resolve('./src/shared/locale/en.json'),
      },
    ],
    'i18n-json/sorted-keys': [
      checkTranslation ? 'error' : 'off',
      {
        order: 'asc',
        indentSpaces: 2,
      },
    ],
    'i18next/no-literal-string': [
      checkTranslation ? 'error' : 'off',
      {
        mode: 'jsx-only',
        'jsx-attributes': {
          include: [],
          exclude: [
            'className',
            'headerClass',
            'contentClass',
            'styleName',
            'style',
            'type',
            'key',
            'id',
            'width',
            'height',
            'data-testid',
            'pallet',
            'variant',
            'as',
            'weight',
            'name',
            'effect',
            'tag',
            'leave',
            'leaveFrom',
            'leaveTo',
            'role',
            'enter',
            'enterFrom',
            'enterTo',
            'wrapperClass',
            'cn',
            'form',
            'bgColor',
            'theme',
            'addressStyle',
          ],
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
  ignorePatterns: ['e2e/', 'node_modules/', 'release/', 'omni-chains.json', 'omni-chains_dev.json'],
};
