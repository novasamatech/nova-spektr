const { APP_CONFIG } = require('./app.config');

const { NAME, AUTHOR, TITLE, FOLDERS } = APP_CONFIG;

const CURRENT_YEAR = new Date().getFullYear();
const AUTHOR_IN_KEBAB_CASE = AUTHOR.name.replace(/\s+/g, '-');
const APP_ID = `com.${AUTHOR_IN_KEBAB_CASE}.${NAME}`.toLowerCase();

module.exports = {
  appId: APP_ID,
  productName: TITLE,
  copyright: `Copyright © ${CURRENT_YEAR} — ${AUTHOR.name}`,

  directories: {
    app: FOLDERS.DEV_BUILD,
    buildResources: 'resources',
    output: FOLDERS.PROD_BUILD,
  },

  mac: {
    icon: `${FOLDERS.RESOURCES}/icons/icon.png`,
    category: 'public.app-category.utilities',
    target: {
      target: 'default',
      // arch: ['arm64'],
      arch: ['arm64', 'x64'],
    },
  },

  dmg: {
    icon: false,
  },

  linux: {
    icon: `${FOLDERS.RESOURCES}/icons/icon.png`,
    category: 'Utilities',
    target: ['AppImage'],
  },

  win: {
    icon: `${FOLDERS.RESOURCES}/icons/icon.ico`,
    target: ['nsis'],
  },

  publish: {
    provider: 'github',
    owner: 'nova-wallet',
    // repo: 'omni-enterprise',
  },
};
