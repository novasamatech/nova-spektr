import { app, BrowserWindow } from 'electron';

import { setupLogger } from './factories/logs';
import { createWindow } from './factories/window';
import { setupApplication } from './factories/setup';
import { setupAutoUpdater } from './factories/updater';
import { runAppSingleInstance } from './factories/instance';
import { registerSchema, registerSchemaHandler, registerCustomProtocol, processUrl } from './factories/protocol';
import { PLATFORM } from './shared/constants/platform';
import { ENVIRONMENT } from './shared/constants/environment';
import { APP_CONFIG } from '../../app.config';

runAppSingleInstance(async () => {
  if (ENVIRONMENT.IS_DEV || ENVIRONMENT.IS_STAGE) {
    app.commandLine.appendSwitch('ignore-certificate-errors');
  }
  app.commandLine.appendSwitch('force-color-profile', 'srgb');

  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  delete process.env.ELECTRON_ENABLE_SECURITY_WARNINGS;

  PLATFORM.IS_LINUX && app.disableHardwareAcceleration();

  let mainWindow: BrowserWindow | undefined;

  setupLogger();
  setupAutoUpdater();

  registerSchema();
  registerCustomProtocol();

  if (PLATFORM.IS_MAC) {
    // Protocol handler for macos
    app.on('open-url', (event, url) => {
      event.preventDefault();
      processUrl(url, mainWindow);
    });
  }

  if (PLATFORM.IS_WINDOWS || PLATFORM.IS_LINUX) {
    // Protocol handler for win32/Linux
    app.on('second-instance', (_, commandLine) => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }

      const url = commandLine[commandLine.length - 1];
      if (!url.startsWith(APP_CONFIG.ELECTRON_PROTOCOL + '://')) return;

      processUrl(url, mainWindow);
    });
  }

  await app.whenReady();
  registerSchemaHandler();

  mainWindow = createWindow();
  await setupApplication(mainWindow);
});
