export default {
  contextSeparator: '_',
  createOldCatalogs: false,
  defaultNamespace: 'translation',
  defaultValue: function (lng, ns, key) {
    if (lng === 'en') {
      return key;
    }
    return '';
  },
  indentation: 2,
  keepRemoved: true,
  keySeparator: '.',
  lexers: {
    hbs: ['HandlebarsLexer'],
    handlebars: ['HandlebarsLexer'],

    htm: ['HTMLLexer'],
    html: ['HTMLLexer'],

    mjs: ['JavascriptLexer'],
    js: ['JavascriptLexer'],
    ts: ['JavascriptLexer'],
    jsx: ['JsxLexer'],
    tsx: ['JsxLexer'],

    default: ['JavascriptLexer'],
  },
  lineEnding: 'auto',
  locales: ['en'],
  namespaceSeparator: ':',
  output: 'src/renderer/shared/i18n/locales/$LOCALE.json',
  pluralSeparator: '_',
  input: ['src/renderer/**/*.{ts,tsx,js,jsx}', '!src/renderer/**/*.test.{ts,tsx,js,jsx}', '!src/renderer/**/*.d.ts'],
  sort: true,
  verbose: false,
  failOnWarnings: false,
  failOnUpdate: false,
  customValueTemplate: null,
  resetDefaultValueLocale: null,
  i18nextOptions: null,
  yamlOptions: null,
  // Add support for marker functions
  func: {
    list: ['t', 'i18nMarker', 'i18nMark'],
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
};
