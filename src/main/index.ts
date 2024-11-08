import 'source-map-support/register';

import { type BrowserWindow, app, session } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

import { runAppSingleInstance } from './factories/instance';
import { setupLogger } from './factories/logs';
import { processUrl, registerDeepLinkProtocol } from './factories/protocol';
import { setupAutoUpdater } from './factories/updater';
import { createWindow } from './factories/window';
import { ENVIRONMENT } from './shared/constants/environment';
import { PLATFORM } from './shared/constants/platform';

runAppSingleInstance(async () => {
  setupLogger();
  setupAutoUpdater();
  registerDeepLinkProtocol();

  app.commandLine.appendSwitch('force-color-profile', 'srgb');
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  if (ENVIRONMENT.IS_DEV || ENVIRONMENT.IS_STAGE) {
    app.commandLine.appendSwitch('ignore-certificate-errors');
  }

  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  delete process.env.ELECTRON_ENABLE_SECURITY_WARNINGS;

  if (PLATFORM.IS_LINUX) {
    app.disableHardwareAcceleration();
  }

  await app.whenReady();

  let mainWindow: BrowserWindow | null = createWindow();

  if (PLATFORM.IS_MAC) {
    // Protocol handler for macos
    app.on('open-url', (event, url) => {
      event.preventDefault();
      if (mainWindow) {
        processUrl(url, mainWindow);
      }
    });
  }

  if (PLATFORM.IS_WINDOWS || PLATFORM.IS_LINUX) {
    // Protocol handler for win32/Linux
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }

  app.on('activate', async () => {
    if (mainWindow === null) {
      mainWindow = createWindow();
    }
  });

  app.on('web-contents-created', (_, contents) =>
    contents.on('will-navigate', (event) => !ENVIRONMENT.IS_DEV && event.preventDefault()),
  );

  app.on('window-all-closed', () => {
    if (!PLATFORM.IS_MAC) {
      app.quit();
    }

    mainWindow?.destroy();
    mainWindow = null;
  });

  if (ENVIRONMENT.IS_DEV) {
    await installExtension(REACT_DEVELOPER_TOOLS);

    // Reloading extensions for correct initialization in dev tools
    session.defaultSession.getAllExtensions().map((e) => {
      session.defaultSession.loadExtension(e.path);
    });
  }
});
