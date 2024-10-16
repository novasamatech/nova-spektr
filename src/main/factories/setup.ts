import { BrowserWindow, app, session } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

import { ENVIRONMENT } from '../shared/constants/environment';
import { PLATFORM } from '../shared/constants/platform';

export async function setupApplication(window: BrowserWindow): Promise<void> {
  app.on('activate', async () => {
    if (!BrowserWindow.getAllWindows().length) return window;

    for (const w of BrowserWindow.getAllWindows().reverse()) {
      w.restore();
    }
  });

  app.on('web-contents-created', (_, contents) =>
    contents.on('will-navigate', (event) => !ENVIRONMENT.IS_DEV && event.preventDefault()),
  );

  app.on('window-all-closed', () => !PLATFORM.IS_MAC && app.quit());

  if (ENVIRONMENT.IS_DEV) {
    await installExtension(REACT_DEVELOPER_TOOLS);

    // Reloading extensions for correct initialization in dev tools
    session.defaultSession.getAllExtensions().map((e) => {
      session.defaultSession.loadExtension(e.path);
    });
  }
}
