import { app, dialog, ipcMain } from 'electron';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';

import { AUTO_UPDATE_ENABLED } from '../shared/constants/store';
import { checkAutoUpdateSupported } from '../shared/lib/utils';

export function setupAutoUpdater() {
  const isAutoUpdateSupported = checkAutoUpdateSupported();
  const store = new Store({ defaults: { [AUTO_UPDATE_ENABLED]: isAutoUpdateSupported } });

  ipcMain.handle('getStoreValue', (_, key) => store.get(key));
  ipcMain.handle('setStoreValue', (_, key, value) => store.set(key, value));

  if (!isAutoUpdateSupported) return;

  autoUpdater.autoRunAppAfterInstall = true;
  autoUpdater.autoInstallOnAppQuit = false;

  app.on('ready', () => {
    if (store.get(AUTO_UPDATE_ENABLED)) {
      autoUpdater.checkForUpdates();
    }
  });

  autoUpdater.on('checking-for-update', () => {
    console.info('[app-updater] Checking for update...');
  });

  autoUpdater.on('update-not-available', () => {
    console.info(`[app-updater] No updates available. Application is up to date.`);
  });

  autoUpdater.on('update-available', (info) => {
    console.info(`[app-updater] New update available ${info.releaseName} ${info.releaseDate} ${info.version}`);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.info(
      `[app-updater] Downloading update ${progressObj.percent}% of ${progressObj.total} bytes; ${progressObj.bytesPerSecond} bytes per second`,
    );
  });

  autoUpdater.on('update-cancelled', (info) => {
    console.error(`[app-updater] Update cancelled ${info.releaseName} ${info.releaseDate} ${info.version}`);
  });

  autoUpdater.on('error', (err) => {
    console.error('[app-updater] Error on update', err);
    dialog.showErrorBox('Error', 'Error updating the application');
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.info(`[app-updater] Downloaded update ${info.releaseName} ${info.releaseDate} ${info.version}`);
    dialog
      .showMessageBox({
        title: 'Update Available',
        message: `A new version ${info.version} of Nova Spektr is ready to be installed.`,
        detail: info.releaseNotes?.toString().replaceAll(/<[a-zA-Z0-9/]*>/g, ''), // clear html tags from changelog
        type: 'question',
        buttons: ['Install now', 'Not now'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
        if (result.response === 1) {
          autoUpdater.autoInstallOnAppQuit = false;
        }
      });
  });
}
