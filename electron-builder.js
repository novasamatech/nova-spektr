const { appId, author, title, folders, electronProtocol } = require('./config');

const CURRENT_YEAR = new Date().getFullYear();

/**
 * @type {import('electron-builder').Configuration}
 *
 * @see https://www.electron.build/configuration/configuration
 */
export default {
  appId: appId,
  productName: title,
  copyright: `Copyright © ${CURRENT_YEAR} — ${author.name}`,

  directories: {
    app: folders.devBuild,
    output: folders.prodBuild,
  },

  protocols: {
    name: title,
    schemes: [electronProtocol],
  },

  mac: {
    category: 'public.app-category.finance',
    hardenedRuntime: true,
    icon: `${folders.resources}/icons/icon.png`,
    entitlements: `${folders.resources}/entitlements/entitlements.mac.plist`,
    extendInfo: {
      NSCameraUsageDescription: 'This app requires camera access to import accounts and sign operations',
    },
    target: {
      target: 'default',
      arch: ['x64', 'arm64'],
    },
  },

  dmg: {
    icon: false,
  },

  linux: {
    icon: `${folders.resources}/icons/icon.png`,
    category: 'Finance',
    target: ['AppImage'],
    artifactName: 'Nova-Spektr-${version}_x86_64.AppImage',
    desktop: {
      mimeTypes: [`x-scheme-handler/${electronProtocol}`],
      exec: `${electronProtocol} %U`,
    },
  },

  win: {
    icon: `${folders.resources}/icons/icon.ico`,
    target: ['nsis'],
  },

  publish: {
    provider: 'github',
    owner: 'novasamatech',
  },
};
