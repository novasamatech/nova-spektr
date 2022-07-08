import { BrowserWindow } from 'electron';
import { join } from 'path';

import { ENVIRONMENT } from '#shared/constants';
import { APP_CONFIG } from '../../app.config';
import { createWindow } from './factories/create';

const { MAIN, TITLE } = APP_CONFIG;

export async function MainWindow() {
  const window = createWindow({
    id: 'main',
    title: TITLE,
    width: MAIN.WINDOW.WIDTH,
    height: MAIN.WINDOW.HEIGHT,
    center: true,
    autoHideMenuBar: true,

    webPreferences: {
      preload: join(__dirname, 'bridge.js'),
    },
  });

  ENVIRONMENT.IS_DEV && window.webContents.openDevTools({ mode: 'bottom' });

  window.on('close', () => {
    BrowserWindow.getAllWindows().forEach((window) => window.destroy());
  });

  return window;
}
