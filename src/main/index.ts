import { app, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

import { MainWindow } from './main';
import { makeAppWithSingleInstanceLock } from './factories/instance';
import { makeAppSetup } from './factories/setup';

makeAppWithSingleInstanceLock(async () => {
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.autoRunAppAfterInstall = true;

  app.on('ready', () => {
    autoUpdater.checkForUpdates();
  });
  autoUpdater.on('checking-for-update', () => {
    console.log('[app-updater] Checking for update...');
  });
  autoUpdater.on('update-not-available', (info) => {
    console.log(`[app-updater] No updates available. Application is up to date.`);
  });
  autoUpdater.on('update-available', (info) => {
    console.log(`[app-updater] New update available ${info.releaseName} ${info.releaseDate} ${info.version}`);
  });
  autoUpdater.on('download-progress', (progressObj) => {
    console.log(
      `[app-updater] Downloading update ${progressObj.percent}% of ${progressObj.total} bytes; ${progressObj.bytesPerSecond} bytes per second`,
    );
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[app-updater] Downloaded update ${info.releaseName} ${info.releaseDate} ${info.version}`);
    dialog
      .showMessageBox({
        title: 'Update Available',
        message: `A new version ${info.version} of Nova Spektr is ready to be installed.`,
        detail: `${info.releaseNotes}`,
        type: 'question',
        buttons: ['Install now', 'Install on next launch', 'Not now'],
        defaultId: 0,
        cancelId: 2,
      })
      .then((result) => {
        switch (result.response) {
          case 0:
            autoUpdater.quitAndInstall();
            break;
          case 1:
            autoUpdater.autoInstallOnAppQuit = true;
            break;
          case 2:
            break;
        }
      });
  });
  autoUpdater.on('update-cancelled', (info) => {
    console.error(`[app-updater] Update cancelled ${info.releaseName} ${info.releaseDate} ${info.version}`);
  });
  autoUpdater.on('error', (err) => {
    console.error('[app-updater] Error on update', err);
    dialog.showErrorBox('Error', 'Error updating the application');
  });
  await app.whenReady();
  await makeAppSetup(MainWindow);
});
