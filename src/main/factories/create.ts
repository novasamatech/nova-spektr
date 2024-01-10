import { BrowserWindow, BrowserWindowConstructorOptions, session } from 'electron';

import { APP_CONFIG } from '../../../app.config';
import { ENVIRONMENT } from '../shared/constants';

export function createWindow(settings: BrowserWindowConstructorOptions) {
  const window = new BrowserWindow(settings);

  const { URL, PORT } = APP_CONFIG.RENDERER.DEV_SERVER;
  const devServerURL = `${URL}:${PORT}`;

  const isDevServer = ENVIRONMENT.IS_DEV || ENVIRONMENT.IS_STAGE;
  if (ENVIRONMENT.IS_FORCE_ELECTRON || !isDevServer) {
    window.loadFile('index.html');
  } else {
    window.loadURL(devServerURL);
  }

  window.on('closed', window.destroy);
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'Nova Spektr';
    delete details.requestHeaders['Origin'];
    callback({ requestHeaders: details.requestHeaders });
  });

  return window;
}
