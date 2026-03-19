import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import jsonPlugin from '@eslint/json';
import boundariesPlugin from 'eslint-plugin-boundaries';
import deMorganPlugin from 'eslint-plugin-de-morgan';
import effectorPlugin from 'eslint-plugin-effector';
import i18nJsonPlugin from 'eslint-plugin-i18n-json';
import i18nextPlugin from 'eslint-plugin-i18next';
import importXPlugin from 'eslint-plugin-import-x';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Local rules as inline plugin
import enforceDiNamingConvention from './eslint/rules/enforce-di-naming-convention.cjs';
import noRelativeImportFromRoot from './eslint/rules/no-relative-import-from-root.cjs';
import noSelfImport from './eslint/rules/no-self-import.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesPath = 'src/renderer/shared/i18n/locales';
const defaultLocalePath = path.join(localesPath, 'en.json');

const boundaryTypes = [
  'app',
  'shared',
  'domains',
  'entities',
  'processes',
  'aggregates',
  'sdk',
  'features',
  'widgets',
  'pages',
];

const boundaries = boundaryTypes.map((type) => ({
  type,
  pattern: `src/renderer/${type}/*`,
  capture: ['package'],
}));

// Local rules plugin
const localRulesPlugin = {
  meta: { name: 'local-rules', version: '1.0.0' },
  rules: {
    'no-self-import': noSelfImport,
    'no-relative-import-from-root': noRelativeImportFromRoot,
    'enforce-di-naming-convention': enforceDiNamingConvention,
  },
};

// Import order path groups
const importOrderPathGroups = [
  ...boundaryTypes.map((type) => ({
    group: 'parent',
    pattern: `@/${type}/**`,
    position: 'before',
  })),
  {
    group: 'external',
    pattern: '~config',
    position: 'before',
  },
];

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'scripts/*',
      'node_modules/**',
      'release/**',
      'coverage/**',
      '.vscode/**',
      '.idea/**',
      '.github/**',
      '.pnpm-store/**',
      'coverage.txt',
      'junit.xml',
      'jest-unit-results.json',
    ],
  },

  // Base config for all JS/TS files
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    plugins: {
      prettier: prettierPlugin,
      'import-x': importXPlugin,
      'unused-imports': unusedImportsPlugin,
      'de-morgan': deMorganPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...importXPlugin.flatConfigs.recommended.rules,
      ...deMorganPlugin.configs['recommended-legacy'].rules,

      'prettier/prettier': 'error',
      'import-x/no-unresolved': 'off',
      'import-x/named': 'off',
      'import-x/namespace': 'off',
      'import-x/no-named-as-default': 'error',
      'import-x/consistent-type-specifier-style': ['error', 'prefer-inline'],
      'import-x/order': [
        'error',
        {
          named: { enabled: true, types: 'types-first' },
          alphabetize: { order: 'asc', orderImportKind: 'asc' },
          groups: ['builtin', 'external', 'parent', ['sibling', 'index']],
          pathGroups: importOrderPathGroups,
          'newlines-between': 'always',
          distinctGroup: false,
        },
      ],

      'no-unused-vars': 'off',
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

      'no-restricted-properties': [
        'error',
        {
          property: '_test',
          message: "It's a hidden API for unit testing",
        },
      ],
    },
  },

  // JSON files
  {
    files: ['**/*.json'],
    plugins: {
      json: jsonPlugin,
    },
    language: 'json/json',
  },

  // JavaScript files (js, mjs, cjs)
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
        projectService: true,
      },
      globals: {
        ...globals.node,
        vi: true,
      },
    },
  },

  // Locale JSON files
  {
    files: [path.join(localesPath, '*.json')],
    plugins: {
      'i18n-json': i18nJsonPlugin,
    },
    rules: {
      'i18n-json/identical-keys': ['error', { filePath: path.resolve(__dirname, defaultLocalePath) }],
      'i18n-json/identical-placeholders': ['error', { filePath: path.resolve(__dirname, defaultLocalePath) }],
    },
  },

  // Test files
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    languageOptions: {
      globals: {
        ...globals.jest,
        vi: true,
      },
    },
    rules: {
      'no-restricted-properties': 'off',
    },
  },

  // TSX files (React) - excluding stories and tests
  {
    files: ['**/*.tsx'],
    ignores: ['**/*.stories.tsx', '**/*.test.tsx'],
    plugins: {
      i18next: i18nextPlugin,
    },
    rules: {
      ...i18nextPlugin.configs.recommended.rules,
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-text-only',
          'should-validate-template': false,
          'jsx-attributes': {
            include: ['alt', 'aria-label', 'title', 'placeholder', 'label', 'description'],
          },
          callees: {
            exclude: ['Error', 'log', 'warn', 'includes', 'formatDate'],
          },
        },
      ],
    },
  },

  // All TSX files - React config
  {
    files: ['**/*.tsx'],
    plugins: {
      react: reactPlugin,
    },
    languageOptions: {
      globals: {
        JSX: 'readonly',
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
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
  },

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      effector: effectorPlugin,
      boundaries: boundariesPlugin,
      'local-rules': localRulesPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
        projectService: {
          allowDefaultProject: ['*.config.ts'],
        },
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      'import-x/resolver': {
        typescript: true,
        node: {
          extensions: ['.ts', '.tsx', '.js'],
        },
      },
      'import/resolver': {
        typescript: true,
        node: {
          extensions: ['.ts', '.tsx', '.js'],
        },
      },
      'boundaries/elements': boundaries,
    },
    rules: {
      ...tseslint.configs.eslintRecommended.rules,
      ...tseslint.configs.recommended[1]?.rules,
      ...importXPlugin.flatConfigs.typescript.rules,
      ...effectorPlugin.configs.recommended.rules,
      ...effectorPlugin.configs.scope.rules,
      ...boundariesPlugin.configs.recommended.rules,

      // Local rules
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

      // Imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'import-x/export': 'off',
      'import-x/default': 'off',
      'import-x/no-rename-default': 'off',
      'import-x/no-useless-path-segments': 'off',
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
          max: 25,
          ignoreTypeImports: true,
        },
      ],

      // TypeScript rules
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',
      '@typescript-eslint/array-type': ['error', { default: 'array', readonly: 'array' }],
      '@typescript-eslint/no-unnecessary-condition': 'off',

      // Effector rules
      'effector/no-watch': 'error',
      'effector/keep-options-order': 'error',
      'effector/enforce-effect-naming-convention': 'off',
      'effector/enforce-store-naming-convention': 'off',
      'effector/strict-effect-handlers': 'off',
      'effector/no-unnecessary-duplication': 'off',
      'effector/require-pickup-in-persist': 'off',

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
              disallow: ['effector-react'],
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
              allow: ['app', 'shared', 'entities', 'features', 'aggregates', 'domains'],
            },
            {
              from: 'shared',
              allow: ['app', 'shared', 'entities'],
            },
            {
              from: [
                ['shared', { package: 'ui-entities' }],
                ['shared', { package: 'transactions' }],
              ],
              allow: ['domains'],
            },
            {
              from: 'sdk',
              allow: ['shared', 'features', 'domains'],
            },
            {
              from: 'entities',
              allow: ['app', 'shared', 'entities', 'domains', 'features'],
            },
            {
              from: 'domains',
              allow: ['shared', 'domains', 'entities', 'sdk'],
            },
            {
              from: 'aggregates',
              allow: ['shared', 'domains', 'entities', 'aggregates', 'features'],
            },
            {
              from: 'processes',
              allow: ['app', 'shared', 'entities'],
            },
            {
              from: 'features',
              allow: ['app', 'shared', 'entities', 'pages', 'widgets', 'features', 'aggregates', 'domains', 'sdk'],
            },
            {
              from: 'pages',
              allow: ['app', 'shared', 'entities', 'features', 'widgets', 'aggregates', 'domains'],
            },
            {
              from: 'widgets',
              allow: ['app', 'shared', 'entities', 'aggregates', 'features', 'domains', 'pages', 'widgets'],
            },
          ],
        },
      ],
    },
  },

  // TypeScript files (non-test, non-mock) - stricter rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/*.test.ts', '**/*.test.tsx', '**/mocks/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['warn', { assertionStyle: 'never' }],
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/require-await': 'warn',

      'no-restricted-syntax': [
        'error',
        {
          message: 'Replace with "useStoreMap". Getting object members directly from "useUnit" in restricted.',
          selector: 'MemberExpression > CallExpression[callee.name="useUnit"]',
        },
        {
          message: 'Use effector naming convention for stores.',
          selector: 'VariableDeclarator[init.callee.name=/^(createStore|combine)$/][id.name!=/^\\$.*/]',
        },
        {
          message: 'Use effector naming convention for effects.',
          selector: 'VariableDeclarator[init.callee.name="createEffect"][id.name!=/^(.*?Fx|fx)$/]',
        },
        {
          message: 'Use `for..of` instead.',
          selector: 'ForInStatement',
        },
        {
          message: 'Use `for..of` instead.',
          selector: 'CallExpression[callee.property.name="forEach"][arguments.0.type="ArrowFunctionExpression"]',
        },
        {
          message: '`combine` must be called with not more than 3 arguments.',
          selector: 'CallExpression[callee.name="combine"][arguments.length>3]',
        },
        {
          message: 'debug helper should be removed from production code.',
          selector: 'ImportDeclaration[source.value="patronum"] ImportSpecifier[imported.name="debug"]',
        },
      ],
    },
  },
);
