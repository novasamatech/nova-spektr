module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'prettier', 'plugin:prettier/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [1, { args: 'none', ignoreRestSiblings: true }],
    '@typescript-eslint/no-empty-interface': 0,
    'prettier/prettier': [
      'error',
      {
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        useTabs: false,
        trailingComma: 'es5',
        length: 120,
      },
    ],
  },
};
