import { join, parse } from 'path';
import { readdirSync, rmSync, renameSync } from 'fs';
import { BrowserWindow, Menu, shell } from 'electron';
import log, { LogFile } from 'electron-log';
import windowStateKeeper from 'electron-window-state';

import { APP_CONFIG } from '../../app.config';
import { ENVIRONMENT } from './shared/constants';
import { createWindow } from './factories/create';
import { buildMenuTemplate } from './factories/menu';

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
log.transports.file.archiveLogFn = rotateLogs;
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
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);

    return { action: 'deny' };
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

function rotateLogs(oldLogFile: LogFile) {
  const file = oldLogFile.toString();
  const info = parse(file);
  const files = readdirSync(info.dir);

  if (files.length > MAX_LOG_FILES_TO_KEEP) {
    const filesToDelete = files.sort().slice(0, files.length - MAX_LOG_FILES_TO_KEEP);
    filesToDelete.forEach((fileToDelete) => rmSync(join(info.dir, fileToDelete)));
  }
  try {
    const date = new Date().toISOString();
    let newFileName = join(info.dir, info.name + '.' + date + info.ext);
    renameSync(file, newFileName);
  } catch (error) {
    console.warn('Could not rotate log', error);
  }
}
