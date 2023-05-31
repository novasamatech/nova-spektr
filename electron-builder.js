const { APP_CONFIG } = require('./app.config');

const { APP_ID, AUTHOR, TITLE, FOLDERS } = APP_CONFIG;

const CURRENT_YEAR = new Date().getFullYear();

module.exports = {
  appId: APP_ID,
  productName: TITLE,
  copyright: `Copyright © ${CURRENT_YEAR} — ${AUTHOR.name}`,

  directories: {
    app: FOLDERS.DEV_BUILD,
    output: FOLDERS.PROD_BUILD,
  },

  mac: {
    category: 'public.app-category.finance',
    hardenedRuntime: true,
    icon: `${FOLDERS.RESOURCES}/icons/icon.png`,
    entitlements: `${FOLDERS.RESOURCES}/entitlements/entitlements.mac.plist`,
    extendInfo: {
      NSCameraUsageDescription: 'This app requires camera access to import accounts and sign operations',
    },
    target: {
      target: 'default',
      arch: ['x64', 'arm64'],
    },
  },
  afterSign: 'scripts/notarize.js',

  dmg: {
    icon: false,
  },

  linux: {
    icon: `${FOLDERS.RESOURCES}/icons/icon.png`,
    category: 'Finance',
    target: ['AppImage'],
  },

  win: {
    icon: `${FOLDERS.RESOURCES}/icons/icon.ico`,
    target: ['nsis'],
  },

  publish: {
    provider: 'github',
    owner: 'novasamatech',
    // repo: 'nova-spektr',
  },
};
