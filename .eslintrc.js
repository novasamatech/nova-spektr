const path = require('path');

const localesPath = './src/renderer/shared/api/translation/locales';
const defaultLocalePath = path.join(localesPath, 'en.json');

const boundaryTypes = ['app', 'shared', 'domains', 'entities', 'processes', 'features', 'widgets', 'pages'];

const boundaries = boundaryTypes.map((type) => ({
  type,
  pattern: `src/renderer/${type}/*`,
  capture: ['package'],
}));

module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
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
    // For debugging purpose, too slow for every day usage
    // 'import-x/no-cycle': ['error', { maxDepth: Number.Infinity }],
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
          pattern: `@/${type}/**`,
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

    'no-restricted-properties': [
      'error',
      {
        property: '_test',
        message: "It's a hidden API for unit testing",
      },
    ],
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
      rules: {
        'no-restricted-properties': 'off',
      },
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
            mode: 'jsx-only',
            'should-validate-template': false,
            'jsx-attributes': {
              include: ['alt', 'aria-label', 'title', 'placeholder', 'label', 'description'],
            },
            callees: {
              exclude: ['Error', 'log', 'warn', 'includes', 'formatDate'],
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
      plugins: ['@typescript-eslint', 'effector', 'boundaries', 'local-rules'],
      extends: [
        'plugin:import-x/typescript',
        'plugin:effector/recommended',
        'plugin:effector/scope',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:boundaries/recommended',
        'plugin:local-rules/all',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: __dirname,
        createDefaultProgram: true,
      },
      rules: {
        'local-rules/no-self-import': [
          'error',
          {
            root: './src/renderer',
            exclude: ['widgets', 'pages', 'features/operations', 'shared/lib', 'shared/api', 'shared/pallet'],
          },
        ],
        'local-rules/no-relative-import-from-root': [
          'error',
          {
            root: './src/renderer',
            exclude: ['../../app.config', '../../tw-config-consts/colors', '../../tw-config-consts/font-sizes'],
          },
        ],
        'local-rules/enforce-di-naming-convention': ['error'],

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
        // Too heavy
        'import-x/no-rename-default': 'off',
        'import-x/no-useless-path-segments': 'error',
        'no-restricted-imports': [
          'error',
          {
            name: 'classnames',
            message: 'Use cnTw instead.',
          },
        ],
        'import-x/max-dependencies': [
          'warn',
          {
            max: 20,
            ignoreTypeImports: true,
          },
        ],

        // Validated by typescript
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',

        '@typescript-eslint/no-unnecessary-type-constraint': 'error',
        '@typescript-eslint/array-type': ['error', { default: 'array', readonly: 'array' }],
        // TODO error
        '@typescript-eslint/no-unnecessary-condition': 'off',

        // Stricter rules
        'effector/no-watch': 'error',
        'effector/keep-options-order': 'error',

        // Removed rules
        // Took around 4 seconds to check this single rule
        'effector/enforce-effect-naming-convention': 'off',
        // Took around 4 seconds to check this single rule
        'effector/enforce-store-naming-convention': 'off',

        // Boundaries setup
        'boundaries/entry-point': [
          'error',
          {
            default: 'disallow',
            rules: [
              {
                target: boundaryTypes,
                allow: ['index.ts', 'index.tsx'],
              },
              {
                target: ['shared'],
                allow: ['**/*'],
              },
              {
                target: ['pages'],
                allow: ['**/*'],
              },
              // TODO fix this packages
              {
                target: [
                  ['features', { package: 'operations' }],
                  ['features', { package: 'governance' }],
                  ['features', { package: 'wallets' }],
                ],
                allow: ['**/*.ts', '**/*.tsx'],
              },
            ],
          },
        ],

        'boundaries/external': [
          'error',
          {
            default: 'allow',
            rules: [
              {
                from: ['domains'],
                disallow: ['react', 'effector-react'],
                message: 'Domain should contain only logic, not views.',
              },
              {
                from: [
                  ['shared', { package: 'ui-kit' }],
                  ['shared', { package: 'ui-entities' }],
                ],
                disallow: ['effector', 'effector-react'],
                message: 'Data bindings are forbidden in ui library components.',
              },
            ],
          },
        ],

        'boundaries/element-types': [
          'error',
          {
            default: 'disallow',
            rules: [
              {
                from: 'app',
                allow: ['app', /* TODO fix */ 'shared', /* TODO fix */ 'entities', /* TODO fix */ 'features'],
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
                allow: ['shared', 'domains', /* TODO fix */ 'entities'],
              },
              {
                from: 'processes',
                allow: ['app', 'shared', 'entities'],
              },
              {
                from: 'features',
                allow: ['app', 'shared', 'entities', /* TODO fix */ 'widgets', /* TODO fix */ 'features', 'domains'],
              },
              {
                from: 'pages',
                allow: ['app', 'shared', 'entities', 'features', 'widgets', 'domains'],
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
            selector: 'VariableDeclarator[init.callee.name="createEffect"][id.name!=/^(.*?Fx|fx)$/]',
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
          {
            message: '`combine` must be called with not more than 3 arguments.',
            selector: 'CallExpression[callee.name="combine"][arguments.length>3]',
          },
        ],
      },
    },
  ],
};
