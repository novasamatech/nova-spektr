import { join } from 'path';

import { BrowserWindow, Menu, session, shell } from 'electron';
import windowStateKeeper from 'electron-window-state';

import { APP_CONFIG } from '../../../app.config';
import { ENVIRONMENT } from '../shared/constants/environment';

import { buildMenuTemplate } from './menu';

export function createWindow(): BrowserWindow {
  const { MAIN, TITLE, RENDERER } = APP_CONFIG;

  const mainWindowState = windowStateKeeper({
    defaultWidth: MAIN.WINDOW.WIDTH,
    defaultHeight: MAIN.WINDOW.HEIGHT,
  });

  const window = new BrowserWindow({
    title: TITLE,
    x: mainWindowState.x,
    y: mainWindowState.y,
    minWidth: MAIN.WINDOW.WIDTH,
    minHeight: MAIN.WINDOW.HEIGHT,
    width: mainWindowState.width,
    height: mainWindowState.height,
    show: false,
    center: true,
    autoHideMenuBar: true,

    webPreferences: {
      preload: join(__dirname, 'bridge.js'),
    },
  });

  if (ENVIRONMENT.IS_DEV) {
    window.loadURL(`${RENDERER.DEV_SERVER.URL}:${RENDERER.DEV_SERVER.PORT}`);
  } else {
    window.loadURL('file://' + __dirname + '/index.html');
  }

  ENVIRONMENT.IS_DEV && window.webContents.openDevTools({ mode: 'bottom' });

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
    BrowserWindow.getAllWindows().forEach((window) => window.destroy());
  });

  window.on('closed', window.destroy);

  Menu.setApplicationMenu(buildMenuTemplate());
  mainWindowState.manage(window);

  return window;
}
