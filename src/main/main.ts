import { join } from 'path';
import { BrowserWindow, shell } from 'electron';
import log from 'electron-log';
import * as path from 'path';

import { ENVIRONMENT } from '@shared/constants';
import { APP_CONFIG } from '../../app.config';
import { createWindow } from './factories/create';

const { MAIN, TITLE } = APP_CONFIG;
log.initialize({ preload: true });
log.variables.version = process.env.VERSION;
log.variables.env = process.env.NODE_ENV;
log.transports.console.format = '{y}/{m}/{d} {h}:{i}:{s}.{ms} [{env}#{version}]-{processType} [{level}] > {text}';
log.transports.console.useStyles = true;

log.transports.file.fileName = 'nova-spektr.log';
log.transports.file.resolvePathFn = (variables) => {
  return path.join(variables.home, 'Nova Spektr', variables.fileName ? variables.fileName : 'nova-spektr.log');
};
log.transports.file.format = '{y}/{m}/{d} {h}:{i}:{s}.{ms} [{env}#{version}]-{processType} [{level}] > {text}';
log.transports.file.level = 'info';
log.transports.file.maxSize = 1048576 * 3; //3mb

Object.assign(console, log.functions);
log.errorHandler.startCatching({
  showDialog: false,
  onError({ createIssue, error, processType, versions }) {
    console.error('Uncaught error', error);
  },
});


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
