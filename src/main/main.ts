import { join } from 'path';
import { BrowserWindow, shell } from 'electron';

import { ENVIRONMENT } from '@shared/constants';
import { APP_CONFIG } from '../../app.config';
import { createWindow } from './factories/create';

const { MAIN, TITLE } = APP_CONFIG;

export async function MainWindow() {
  const window = createWindow({
    title: TITLE,
    minWidth: MAIN.WINDOW.WIDTH,
    minHeight: MAIN.WINDOW.HEIGHT,
    show: false,
    center: true,
    autoHideMenuBar: true,

    webPreferences: {
      preload: join(__dirname, 'bridge.js'),
    },
  });

  window.maximize();

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

  return window;
}
