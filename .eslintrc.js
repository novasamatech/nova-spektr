const fs = require('fs');
const path = require('path');

const prettierConfig = fs.readFileSync('./.prettierrc', 'utf8');
const prettierOptions = JSON.parse(prettierConfig);
const localesPath = path.resolve('./src/renderer/shared/api/translation/locales');
const defaultLocalePath = path.resolve(localesPath, 'en.json');

const aliases = [
  ['@', './renderer/'],
  ['@renderer', './src/renderer/'],
  ['@app', './src/renderer/app/'],
  ['@pages', './src/renderer/pages/'],
  ['@processes', './src/renderer/processes/'],
  ['@widgets', './src/renderer/widgets/'],
  ['@features', './src/renderer/features/'],
  ['@entities', './src/renderer/entities/'],
  ['@shared', './src/renderer/shared/'],
];

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
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'prettier',
  ],
  plugins: ['prettier', 'import'],
  parserOptions: {
    ecmaVersion: 2021,
  },
  settings: {
    'import/resolver': {
      alias: {
        map: aliases,
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
      node: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    },
  },
  rules: {
    'import/no-unresolved': 'off',
    'import/order': [
      'error',
      {
        groups: [
          ['builtin', 'external'],
          ['internal', 'sibling', 'parent', 'object', 'index'],
        ],
        pathGroups: [
          { group: 'sibling', pattern: '@/app/**', position: 'before' },
          { group: 'sibling', pattern: '@/shared/**', position: 'before' },
          { group: 'sibling', pattern: '@/entities/**', position: 'before' },
          { group: 'sibling', pattern: '@/features/**', position: 'before' },
          { group: 'sibling', pattern: '@/pages/**', position: 'before' },
        ],
        'newlines-between': 'always',
      },
    ],
    'no-irregular-whitespace': 'off',
    'newline-before-return': 'error',
    'prettier/prettier': ['error', prettierOptions],
  },
  overrides: [
    {
      files: ['*.json'],
      plugins: ['json'],
      extends: ['plugin:json/recommended'],
    },
    {
      files: [path.join('translation/locales', '**/*.json')],
      extends: ['plugin:i18n-json/recommended'],
      rules: {
        'i18n-json/identical-keys': ['error', { filePath: defaultLocalePath }],
        'i18n-json/identical-placeholders': ['error', { filePath: defaultLocalePath }],
      },
    },
    {
      files: ['*.test.ts', '*.test.tsx'],
      plugins: ['jest-dom'],
      extends: ['plugin:jest-dom/recommended'],
    },
    {
      files: ['*.tsx'],
      excludedFiles: ['*.stories.tsx', '*.test.tsx'],
      plugins: ['i18next'],
      extends: ['plugin:i18next/recommended'],
      rules: {
        'i18next/no-literal-string': [
          'error',
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
    },
    {
      files: ['*.tsx'],
      plugins: ['react'],
      extends: ['plugin:react/recommended'],
      rules: {
        'react/no-array-index-key': 'warn',
        'react/display-name': 'off',
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/jsx-sort-props': ['error', { callbacksLast: true, noSortAlphabetically: true }],
        'react/function-component-definition': [
          'error',
          {
            namedComponents: 'arrow-function',
            unnamedComponents: 'arrow-function',
          },
        ],
      },
      settings: { react: { version: 'detect' } },
    },
    {
      files: ['*.ts', '*.tsx'],
      plugins: ['@typescript-eslint', 'effector', 'unused-imports'],
      extends: [
        'plugin:effector/recommended',
        'plugin:effector/scope',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        createDefaultProgram: true,
      },
      rules: {
        'unused-imports/no-unused-imports': 'error',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        // TODO enable
        '@typescript-eslint/no-unnecessary-type-constraint': 'warn',
        // it took around 4 seconds to check this single rule
        'effector/enforce-effect-naming-convention': 'off',
        // it took around 4 seconds to check this single rule
        'effector/enforce-store-naming-convention': 'off',
      },
    },
  ],
};
