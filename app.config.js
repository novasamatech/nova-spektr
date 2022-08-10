const { name: NAME, author: AUTHOR, version: VERSION, description: DESCRIPTION } = require('./package.json');

exports.APP_CONFIG = {
  NAME,
  AUTHOR,
  VERSION,
  DESCRIPTION,

  TITLE: 'Omni Enterprise',

  MAIN: {
    WINDOW: {
      WIDTH: 1024,
      HEIGHT: 768,
    },
  },

  RENDERER: {
    DEV_SERVER: {
      URL: 'https://localhost',
      PORT: '3000',
    },
  },

  FOLDERS: {
    ENTRY_POINTS: {
      MAIN: 'src/main/index.ts',
      BRIDGE: 'src/shared/bridge.ts',
      RENDERER: 'src/renderer/index.tsx',
    },

    INDEX_HTML: 'src/renderer/index.html',
    RESOURCES: 'src/main/resources',
    DEV_BUILD: 'release/build/',
    PROD_BUILD: 'release/dist/',
  },
};
