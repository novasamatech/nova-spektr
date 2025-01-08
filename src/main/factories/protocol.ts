import path from 'path';

import { electronProtocol } from '~config';
import { type BrowserWindow, app } from 'electron';

export function registerDeepLinkProtocol() {
  if (!process.defaultApp) {
    app.setAsDefaultProtocolClient(electronProtocol);
  } else if (process.argv.length > 1) {
    app.setAsDefaultProtocolClient(electronProtocol, process.execPath, [path.resolve(process.argv[1])]);
  }
}

export function processUrl(url: string, mainWindow: BrowserWindow) {
  const parsed = new URL(url);
  if (parsed.protocol !== `${electronProtocol}:`) return;

  mainWindow.loadURL('file://' + __dirname + '/index.html' + parsed.search);
}
