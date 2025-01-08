import { join } from 'path';

import { main, renderer, title } from '~config';
import { BrowserWindow, Menu, session, shell } from 'electron';
import windowStateKeeper from 'electron-window-state';

import { ENVIRONMENT } from '../shared/constants/environment';

import { buildMenuTemplate } from './menu';

export function createWindow(): BrowserWindow {
  const mainWindowState = windowStateKeeper({
    defaultWidth: main.window.width,
    defaultHeight: main.window.height,
  });

  const window = new BrowserWindow({
    title,
    x: mainWindowState.x,
    y: mainWindowState.y,
    minWidth: main.window.width,
    minHeight: main.window.height,
    width: mainWindowState.width,
    height: mainWindowState.height,
    show: false,
    center: true,
    autoHideMenuBar: true,

    webPreferences: {
      nodeIntegration: false,
      preload: join(__dirname, 'preload.cjs'),
    },
  });

  if (ENVIRONMENT.RENDERER_SOURCE === 'localhost') {
    window.loadURL(`${renderer.server.protocol}${renderer.server.host}:${renderer.server.port}`);
  } else {
    window.loadURL('file://' + __dirname + '/index.html');
  }

  if (ENVIRONMENT.IS_DEV) {
    window.webContents.openDevTools({ mode: 'bottom' });
  }

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'Nova Spektr';
    delete details.requestHeaders['Origin'];
    callback({ requestHeaders: details.requestHeaders });
  });

  // Open urls in the user's browser
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);

    return { action: 'deny' };
  });

  window.on('ready-to-show', () => {
    if (!window) {
      throw new Error('"MainWindow" is not defined');
    }

    window.show();
  });

  window.on('close', () => {
    for (const w of BrowserWindow.getAllWindows()) {
      w.destroy();
    }
  });

  window.on('closed', window.destroy);

  Menu.setApplicationMenu(buildMenuTemplate());
  mainWindowState.manage(window);

  return window;
}
