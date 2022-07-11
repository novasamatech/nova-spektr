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
      arch: ['arm64'],
      // arch: ['arm64', 'x64'],
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

// "build": {
//   "productName": "Omni Desktop",
//     "appId": "io.novafoundation.OmniDesktop",
//     "asar": true,
//     "asarUnpack": "**\\*.{node,dll}",
//     "files": [
//     "dist",
//     "node_modules",
//     "package.json"
//   ],
//     "afterSign": ".erb/scripts/notarize.js",
//     "mac": {
//     "type": "distribution",
//       "hardenedRuntime": true,
//       "entitlements": "assets/entitlements.mac.plist",
//       "entitlementsInherit": "assets/entitlements.mac.plist",
//       "gatekeeperAssess": false
//   },
//   "dmg": {
//     "contents": [
//       {
//         "x": 130,
//         "y": 220
//       },
//       {
//         "x": 410,
//         "y": 220,
//         "type": "link",
//         "path": "/Applications"
//       }
//     ]
//   },
//   "win": {
//     "target": [
//       "nsis"
//     ]
//   },
//   "linux": {
//     "target": [
//       "AppImage"
//     ],
//       "category": "Development"
//   },
//   "directories": {
//     "app": "release/app",
//       "buildResources": "assets",
//       "output": "release/build"
//   },
//   "extraResources": [
//     "./assets/**"
//   ],
//     "publish": {
//     "provider": "github",
//       "owner": "nova-wallet",
//       "repo": "omni-desktop"
//   }
// }
