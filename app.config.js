const { name: NAME, author: AUTHOR, version: VERSION, description: DESCRIPTION } = require('./package.json');

const AUTHOR_IN_KEBAB_CASE = AUTHOR.name.replace(/\s+/g, '-');

const prod_app_id = `com.${AUTHOR_IN_KEBAB_CASE}.${NAME}`.toLowerCase();
const stage_app_id = `com.${AUTHOR_IN_KEBAB_CASE}.${NAME}.stage`.toLowerCase();

module.exports = {
  APP_CONFIG: {
    NAME,
    AUTHOR,
    VERSION,
    DESCRIPTION,

    TITLE: process.env.NODE_ENV === 'staging' ? 'Nova Spektr Stage' : 'Nova Spektr',
    APP_ID: process.env.NODE_ENV === 'staging' ? stage_app_id : prod_app_id,

    MAIN: {
      WINDOW: {
        WIDTH: 1024,
        HEIGHT: 800,
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
        BRIDGE: 'src/main/shared/bridge.ts',
        RENDERER: 'src/renderer/app/index.tsx',
      },

      INDEX_HTML: 'src/renderer/app/index.html',
      RESOURCES: 'src/main/resources',
      DEV_BUILD: 'release/build/',
      PROD_BUILD: 'release/dist/',
    },
  },
};
