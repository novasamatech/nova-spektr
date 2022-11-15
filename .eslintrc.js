const fs = require('fs');

const prettierConfig = fs.readFileSync('./.prettierrc', 'utf8');
const prettierOptions = JSON.parse(prettierConfig);

module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:import/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'prettier', 'import', 'unused-imports', 'jest-dom', 'json'],
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
          ['@main', './src/main/'],
          ['@shared', './src/shared/'],
          ['@renderer', './src/renderer/'],
          ['@images', './src/renderer/assets/images/'],
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
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
    // 'newline-before-return': 'error',
    '@typescript-eslint/no-empty-interface': 0,
    'prettier/prettier': ['error', prettierOptions],
    'unused-imports/no-unused-imports': 'error',
    'react/no-array-index-key': 'warn',
    'react/display-name': 'off',
    'react/react-in-jsx-scope': 'off',
  },
};
