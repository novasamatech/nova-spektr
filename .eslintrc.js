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
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:jest-dom/recommended',
    'plugin:import/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
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
      node: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        moduleDirectory: ['node_modules', 'src'],
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
    // '@typescript-eslint/no-unused-vars': [1, { args: 'none', ignoreRestSiblings: true }],
    '@typescript-eslint/no-empty-interface': 0,
    'prettier/prettier': ['error', prettierOptions],
  },
};
