import { app, BrowserWindow } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

import { PLATFORM, ENVIRONMENT } from '../shared/constants';

export async function makeAppSetup(createWindow: () => Promise<BrowserWindow>) {
  let window = await createWindow();

  app.on('activate', async () =>
    !BrowserWindow.getAllWindows().length
      ? (window = await createWindow())
      : BrowserWindow.getAllWindows()
          ?.reverse()
          .forEach((window) => window.restore()),
  );

  app.on('web-contents-created', (_, contents) =>
    contents.on('will-navigate', (event) => !ENVIRONMENT.IS_DEV && event.preventDefault()),
  );

  app.on('window-all-closed', () => !PLATFORM.IS_MAC && app.quit());

  if (ENVIRONMENT.IS_DEV) {
    await installExtension(REACT_DEVELOPER_TOOLS, { forceDownload: false });
  }

  return window;
}

PLATFORM.IS_LINUX && app.disableHardwareAcceleration();

if (ENVIRONMENT.IS_DEV || ENVIRONMENT.IS_STAGE) {
  app.commandLine.appendSwitch('ignore-certificate-errors');
}
app.commandLine.appendSwitch('force-color-profile', 'srgb');

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
delete process.env.ELECTRON_ENABLE_SECURITY_WARNINGS;
