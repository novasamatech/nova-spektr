const path = require('path');

const localesPath = './src/renderer/shared/api/translation/locales';
const defaultLocalePath = path.join(localesPath, 'en.json');

const boundaryTypes = ['app', 'shared', 'domains', 'entities', 'processes', 'features', 'widgets', 'pages'];

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
    'plugin:prettier/recommended',
  ],
  plugins: ['prettier', 'import-x', 'unused-imports'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  rules: {
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    'import-x/no-unresolved': 'off',
    'import-x/named': 'off',
    'import-x/namespace': 'off',
    'import-x/no-named-as-default': 'error',
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

    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'error',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],

    'no-irregular-whitespace': 'off',
    'newline-before-return': 'error',
    'prettier/prettier': 'error',
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
      files: ['*.test.ts', '*.test.tsx', 'jest*.js'],
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
        'react/jsx-no-useless-fragment': 'error',
        'react/jsx-no-constructed-context-values': 'error',
        'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'ignore' }],
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
      plugins: ['@typescript-eslint', 'effector', 'boundaries'],
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
        // TODO enable
        // 'no-console': ['error', { allow: ['warn', 'error', 'info'] }],

        // Imports
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
        ],
        // Validated by typescript
        'import-x/export': 'off',
        // Restricted by our code style
        'import-x/default': 'off',
        'import-x/no-useless-path-segments': 'error',
        'no-restricted-imports': [
          'error',
          {
            name: 'classnames',
            message: 'Use cnTw instead.',
          },
        ],

        // Validated by typescript
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unnecessary-type-constraint': 'error',
        // TODO make error
        '@typescript-eslint/array-type': ['error', { default: 'array', readonly: 'array' }],

        // Stricter rules
        'effector/no-watch': 'error',
        'effector/keep-options-order': 'error',

        // Removed rules
        // Took around 4 seconds to check this single rule
        'effector/enforce-effect-naming-convention': 'off',
        // Took around 4 seconds to check this single rule
        'effector/enforce-store-naming-convention': 'off',

        // Boundaries setup
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
                from: 'domains',
                allow: ['shared', 'domains'],
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
        // For resolving in eslint-plugin-boundaries
        'import/resolver': {
          typescript: true,
          node: {
            extensions: ['.ts', '.tsx', '.js'],
          },
        },
        'boundaries/elements': boundaries,
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      excludedFiles: ['*.test.ts', '*.test.tsx', '**/mocks/*.ts'],
      rules: {
        // TODO error
        '@typescript-eslint/consistent-type-assertions': ['off', { assertionStyle: 'never' }],

        '@typescript-eslint/no-explicit-any': 'warn',

        'no-restricted-syntax': [
          'error',
          // case with useUnit(a).b
          {
            message: 'Replace with "useStoreMap". Getting object members directly from "useUnit" in restricted.',
            selector: 'MemberExpression > CallExpression[callee.name="useUnit"]',
          },
          // effector store naming convention
          {
            message: 'Use effector naming convention for stores.',
            selector: 'VariableDeclarator[init.callee.name=/^(createStore|combine)$/][id.name!=/^\\$.*/]',
          },
          // effector effect naming convention
          {
            message: 'Use effector naming convention for effects.',
            selector: 'VariableDeclarator[init.callee.name="createEffect"][id.name!=/.*?Fx$/]',
          },
          // for..in ban
          {
            message: 'Use `for..of` instead.',
            selector: 'ForInStatement',
          },
          // forEach ban
          {
            message: 'Use `for..of` instead.',
            selector: 'CallExpression[callee.property.name="forEach"][arguments.0.type="ArrowFunctionExpression"]',
          },
          {
            message: 'Unnecessary cnTw usage, use simple string instead.',
            selector: 'CallExpression[callee.name="cnTw"][arguments.length=1][arguments.0.type="Literal"]',
          },
        ],
      },
    },
  ],
};
