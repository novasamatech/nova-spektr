import { app, BrowserWindow } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

import { ENVIRONMENT } from '../shared/constants/environment';
import { PLATFORM } from '../shared/constants/platform';

export async function setupApplication(window: BrowserWindow): Promise<void> {
  app.on('activate', async () => {
    if (!BrowserWindow.getAllWindows().length) return window;

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
}
