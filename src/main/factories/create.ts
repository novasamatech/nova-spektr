import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';

import { ENVIRONMENT } from '@shared/constants';
import { APP_CONFIG } from '../../../app.config';

export function createWindow(settings: BrowserWindowConstructorOptions) {
  const window = new BrowserWindow(settings);

  const { URL, PORT } = APP_CONFIG.RENDERER.DEV_SERVER;
  const devServerURL = `${URL}:${PORT}`;

  ENVIRONMENT.IS_DEV ? window.loadURL(devServerURL) : window.loadFile('index.html');

  window.on('closed', window.destroy);

  return window;
}
