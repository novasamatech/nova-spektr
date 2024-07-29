import path from 'path';

import { type BrowserWindow, app } from 'electron';

import { APP_CONFIG } from '../../../app.config';

export function registerDeepLinkProtocol() {
  if (!process.defaultApp) {
    app.setAsDefaultProtocolClient(APP_CONFIG.ELECTRON_PROTOCOL);
  } else if (process.argv.length > 1) {
    app.setAsDefaultProtocolClient(APP_CONFIG.ELECTRON_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
}

export function processUrl(url: string, mainWindow?: BrowserWindow) {
  if (!mainWindow) return;

  const parsed = new URL(url);
  if (parsed.protocol !== `${APP_CONFIG.ELECTRON_PROTOCOL}:`) return;

  mainWindow.loadURL('file://' + __dirname + '/index.html' + parsed.search);
}
