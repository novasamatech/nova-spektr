import { app, BrowserWindow } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import { resolve } from 'path';

import { PLATFORM, ENVIRONMENT } from '../shared/constants';
import { APP_CONFIG } from '../../../app.config';

export async function makeAppSetup(createWindow: () => Promise<BrowserWindow>) {
  let window = await createWindow();

  if (!process.defaultApp) {
    app.setAsDefaultProtocolClient(APP_CONFIG.ELECTRON_PROTOCOL);
  } else if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(APP_CONFIG.ELECTRON_PROTOCOL, process.execPath, [resolve(process.argv[1])]);
  }

  // Handle the protocol novaspektr://
  app.on('open-url', (_, url) => {
    // novaspektr://nova/matrix/auth
    window.webContents.send('protocol-open', url);
  });

  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }

    // the commandLine is array of strings in which last element is deep link url
    window.webContents.send('protocol-open', commandLine.pop());
  });

  app.on('activate', async () => {
    if (!BrowserWindow.getAllWindows().length) {
      return (window = await createWindow());
    }

    return BrowserWindow.getAllWindows()
      ?.reverse()
      .forEach((window) => window.restore());
  });

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
