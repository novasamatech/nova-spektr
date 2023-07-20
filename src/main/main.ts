import { join } from 'path';
import { BrowserWindow, shell } from 'electron';
import log, { LogFile } from 'electron-log';
import windowStateKeeper from 'electron-window-state';
import * as path from 'path';
import * as fs from 'fs';

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
log.transports.file.format = '{y}/{m}/{d} {h}:{i}:{s}.{ms} [{env}#{version}]-{processType} [{level}] > {text}';
log.transports.file.level = 'info';
log.transports.file.maxSize = 1048576 * 5; //5mb;
log.transports.file.archiveLogFn = (oldLogFile: LogFile): void => {
  const file = oldLogFile.toString();
  const info = path.parse(file);

  try {
    const date = new Date();
    let newFileName = path.join(
      info.dir,
      info.name + '.' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + info.ext,
    );
    if (fs.existsSync(newFileName)) {
      let i: number = 1;
      do {
        i++;
      } while (fs.existsSync(newFileName + '-' + i));
      newFileName = newFileName + '-' + i;
    }
    fs.renameSync(file, newFileName);
  } catch (e) {
    console.warn('Could not rotate log', e);
  }
};

Object.assign(console, log.functions);
log.errorHandler.startCatching({
  showDialog: false,
  onError({ createIssue, error, processType, versions }) {
    console.error('Uncaught error', error);
  },
});

export async function MainWindow() {
  const mainWindowState = windowStateKeeper({
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
