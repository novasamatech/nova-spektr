const fs = require('fs');
const path = require('path');

const prettierConfig = fs.readFileSync('./.prettierrc', 'utf8');
const prettierOptions = JSON.parse(prettierConfig);
const localesPath = './src/renderer/shared/api/translation/locales';
const defaultLocalePath = path.join(localesPath, 'en.json');

const boundaryTypes = ['app', 'pages', 'processes', 'widgets', 'features', 'entities', 'shared'];

const boundaries = boundaryTypes.map((type) => {
  return {
    type,
    pattern: [`src/renderer/${type}/*`, `@${type}/*`, `@/${type}/*`],
    // mode: 'folder',
    // capture: ['name'],
  };
});

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
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'boundaries/elements': boundaries,
  },
  rules: {
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    'import/no-unresolved': 'off',
    'import/namespace': 'off',
    'import/consistent-type-specifier-style': ['error', 'prefer-inline'],
    'import/order': [
      'error',
      {
        alphabetize: { order: 'asc', orderImportKind: 'asc' },
        groups: ['builtin', 'external', 'parent', ['sibling', 'index']],
        pathGroups: [
          { group: 'parent', pattern: '@app/**', position: 'before' },
          { group: 'parent', pattern: '@shared/**', position: 'before' },
          { group: 'parent', pattern: '@entities/**', position: 'before' },
          { group: 'parent', pattern: '@processes/**', position: 'before' },
          { group: 'parent', pattern: '@features/**', position: 'before' },
          { group: 'parent', pattern: '@widgets/**', position: 'before' },
          { group: 'parent', pattern: '@pages/**', position: 'before' },

          { group: 'parent', pattern: '@/app/**', position: 'before' },
          { group: 'parent', pattern: '@/shared/**', position: 'before' },
          { group: 'parent', pattern: '@/entities/**', position: 'before' },
          { group: 'parent', pattern: '@/features/**', position: 'before' },
          { group: 'parent', pattern: '@/pages/**', position: 'before' },
        ],
        'newlines-between': 'always',
        distinctGroup: false,
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
      files: [path.join(localesPath, '/*.json')],
      extends: ['plugin:i18n-json/recommended'],
      rules: {
        'i18n-json/identical-keys': ['error', { filePath: path.resolve(defaultLocalePath) }],
        'i18n-json/identical-placeholders': ['error', { filePath: path.resolve(defaultLocalePath) }],
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
      plugins: ['@typescript-eslint', 'effector', 'unused-imports', 'boundaries'],
      extends: [
        'plugin:effector/recommended',
        'plugin:effector/scope',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:boundaries/recommended',
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
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
        ],
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unnecessary-type-constraint': 'error',
        // it took around 4 seconds to check this single rule
        'effector/enforce-effect-naming-convention': 'off',
        // it took around 4 seconds to check this single rule
        'effector/enforce-store-naming-convention': 'off',
        'effector/keep-options-order': 'error',
        'boundaries/element-types': [
          'error',
          {
            default: 'disallow',
            rules: [
              {
                from: 'entities',
                allow: ['app', 'entities'],
              },
              {
                from: 'features',
                allow: ['app', 'shared', 'entities'],
              },
              {
                from: 'pages',
                allow: ['app', 'shared', 'entities', 'features'],
              },
            ],
          },
        ],
      },
    },
  ],
};
