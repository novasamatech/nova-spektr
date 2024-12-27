const { name: NAME, author: AUTHOR, version: VERSION, description: DESCRIPTION } = require('./package.json');

const AUTHOR_IN_KEBAB_CASE = AUTHOR.name.replace(/\s+/g, '-');

const titleProd = 'Nova Spektr';
const titleStage = 'Nova Spektr Stage';

const idProd = `com.${AUTHOR_IN_KEBAB_CASE}.${NAME}`.toLowerCase();
const idStage = `com.${AUTHOR_IN_KEBAB_CASE}.${NAME}.stage`.toLowerCase();

const protocolProd = NAME.replace('-', '');
const protocolStage = `${NAME.replace('-', '')}-stage`;

module.exports = {
  APP_CONFIG: {
    NAME,
    AUTHOR,
    VERSION,
    DESCRIPTION,
    ELECTRON_PROTOCOL: process.env.NODE_ENV === 'stage' ? protocolStage : protocolProd,

    TITLE: process.env.NODE_ENV === 'stage' ? titleStage : titleProd,
    APP_ID: process.env.NODE_ENV === 'stage' ? idStage : idProd,

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

      APP_ROOT: 'src/renderer/app',
      INDEX_HTML: 'src/renderer/app/index.html',
      RESOURCES: 'src/main/resources',
      DEV_BUILD: 'release/build/',
      PROD_BUILD: 'release/dist/',
    },
  },
};
