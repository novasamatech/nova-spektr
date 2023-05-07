import { join } from 'path';
import { BrowserWindow, shell } from 'electron';
import windowStateKeeper from 'electron-window-state';

import { ENVIRONMENT } from '@shared/constants';
import { APP_CONFIG } from '../../app.config';
import { createWindow } from './factories/create';

const { MAIN, TITLE } = APP_CONFIG;

export async function MainWindow() {
  let mainWindowState = windowStateKeeper({
    defaultWidth: MAIN.WINDOW.WIDTH,
    defaultHeight: MAIN.WINDOW.HEIGHT,
  });
  const window = createWindow({
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

  ENVIRONMENT.IS_DEV && window.webContents.openDevTools({ mode: 'bottom' });

  // Open urls in the user's browser
  window.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  window.on('close', () => {
    BrowserWindow.getAllWindows().forEach((window) => window.destroy());
  });

  window.on('ready-to-show', () => {
    if (!window) {
      throw new Error('"MainWindow" is not defined');
    }

    window.show();
  });
  mainWindowState.manage(window);

  return window;
}
