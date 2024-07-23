const fs = require('fs');
const path = require('path');

const prettierConfig = fs.readFileSync('./.prettierrc', 'utf8');
const prettierOptions = JSON.parse(prettierConfig);
const localesPath = './src/renderer/shared/api/translation/locales';
const defaultLocalePath = path.join(localesPath, 'en.json');

const boundaryTypes = ['app', 'shared', 'entities', 'processes', 'features', 'widgets', 'pages'];

const boundaries = boundaryTypes.map((type) => ({
  type,
  pattern: `src/renderer/${type}/*`,
}));

module.exports = {
  root: true,
  env: {
    browser: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import-x/recommended',
    'plugin:import-x/errors',
    'plugin:import-x/warnings',
    'prettier',
  ],
  plugins: ['prettier', 'import-x'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  rules: {
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    'import-x/no-unresolved': 'off',
    'import-x/named': 'off',
    'import-x/namespace': 'off',
    'import-x/consistent-type-specifier-style': ['error', 'prefer-inline'],
    'import-x/order': [
      'error',
      {
        alphabetize: { order: 'asc', orderImportKind: 'asc' },
        groups: ['builtin', 'external', 'parent', ['sibling', 'index']],
        pathGroups: boundaryTypes.map((type) => ({
          group: 'parent',
          pattern: `@{/${type},${type}}/**`,
          position: 'before',
        })),
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
      files: ['*.js'],
      env: {
        node: true,
      },
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
      env: {
        jest: true,
      },
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
      globals: {
        JSX: 'readonly',
      },
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
        'plugin:import-x/typescript',
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
        // validated by typescript
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
        // validated by typescript
        'import-x/export': 'off',
        // restricted by our code style
        'import-x/default': 'off',
        'boundaries/element-types': [
          'error',
          {
            default: 'disallow',
            rules: [
              {
                from: 'app',
                allow: [/* TODO fix */ 'shared', /* TODO fix */ 'entities', /* TODO fix */ 'features'],
              },
              {
                from: 'shared',
                allow: ['app', 'shared', /* TODO fix */ 'entities'],
              },
              {
                from: 'entities',
                allow: ['app', 'shared', 'entities', /* TODO fix */ 'features'],
              },
              {
                from: 'processes',
                allow: ['app', 'shared', 'entities'],
              },
              {
                from: 'features',
                allow: ['app', 'shared', 'entities', /* TODO fix */ 'widgets', /* TODO fix */ 'features'],
              },
              {
                from: 'pages',
                allow: ['app', 'shared', 'entities', 'features', 'widgets'],
              },
              {
                from: 'widgets',
                allow: ['app', 'shared', 'entities', 'features', /* TODO fix */ 'pages', 'widgets'],
              },
            ],
          },
        ],
      },
      settings: {
        'import-x/resolver': {
          typescript: true,
          node: {
            extensions: ['.ts', '.tsx', '.js'],
          },
        },
        // for resolving in eslint-plugin-boundaries
        'import/resolver': {
          typescript: true,
          node: {
            extensions: ['.ts', '.tsx', '.js'],
          },
        },
        'boundaries/elements': boundaries,
      },
    },
  ],
};
