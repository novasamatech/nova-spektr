import { join } from 'path';
import { BrowserWindow, shell, Menu } from 'electron';
import log, { LogFile } from 'electron-log';
import windowStateKeeper from 'electron-window-state';
import * as path from 'path';
import * as fs from 'fs';

import { ENVIRONMENT } from '@shared/constants';
import { APP_CONFIG } from '../../app.config';
import { createWindow } from './factories/create';
import { buildMenuTemplate } from '@main/vectormenu';

const { MAIN, TITLE } = APP_CONFIG;
const MAX_LOG_FILES_TO_KEEP = 10;
log.initialize({ preload: true });
log.variables.version = process.env.VERSION;
log.variables.env = process.env.NODE_ENV;
log.transports.console.format = '{y}/{m}/{d} {h}:{i}:{s}.{ms} [{env}#{version}]-{processType} [{level}] > {text}';
log.transports.console.useStyles = true;

log.transports.file.fileName = 'nova-spektr.log';
log.transports.file.format = '{y}/{m}/{d} {h}:{i}:{s}.{ms} [{env}#{version}]-{processType} [{level}] > {text}';
log.transports.file.level = 'info';
log.transports.file.maxSize = 1048576 * 5; // 5 MB;
// log.transports.file.archiveLogFn = rotateLogs;
Object.assign(console, log.functions);
log.errorHandler.startCatching({
  showDialog: false,
  onError({ error }) {
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
  Menu.setApplicationMenu(buildMenuTemplate());
  mainWindowState.manage(window);

  return window;
}

function rotateLogs(oldLogFile: LogFile): void {
  const file = oldLogFile.toString();
  const info = path.parse(file);
  const files = fs.readdirSync(info.dir);
  if (files.length > MAX_LOG_FILES_TO_KEEP) {
    const filesToDelete = files.sort().slice(0, files.length - MAX_LOG_FILES_TO_KEEP);
    for (const fileToDelete of filesToDelete) {
      const filePath = path.join(info.dir, fileToDelete);
      fs.rmSync(filePath);
    }
  }
  try {
    const date = new Date().toISOString();
    let newFileName = path.join(info.dir, info.name + '.' + date + info.ext);
    fs.renameSync(file, newFileName);
  } catch (e) {
    console.warn('Could not rotate log', e);
  }
}
