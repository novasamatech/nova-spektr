import path, { resolve } from 'path';
import { protocol, app, BrowserWindow } from 'electron';
import { readFile } from 'fs/promises';

import { APP_CONFIG } from '../../../app.config';

export function registerCustomProtocol() {
  if (!process.defaultApp) {
    app.setAsDefaultProtocolClient(APP_CONFIG.ELECTRON_PROTOCOL);
  } else if (process.argv.length > 1) {
    app.setAsDefaultProtocolClient(APP_CONFIG.ELECTRON_PROTOCOL, process.execPath, [resolve(process.argv[1])]);
  }
}

export function registerSchema() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_CONFIG.ELECTRON_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

/**
 * Handle everything that's being requested with novaspektr:// protocol
 * every mainWindow.openURL() leads here
 */
export function registerSchemaHandler() {
  protocol.handle(APP_CONFIG.ELECTRON_PROTOCOL, async (req) => {
    const url = new URL(req.url);

    const pathname = path.posix.normalize(url.pathname);
    if (pathname === '/') {
      const contents = await readFile(path.join(__dirname, 'index.html'), 'utf8');

      return new Response(contents, { headers: { 'content-type': 'text/html' } });
    }

    const contents = await readFile(path.join(__dirname, pathname));

    return new Response(contents);
  });
}

export function processUrl(url: string, mainWindow?: BrowserWindow) {
  if (!mainWindow) return;

  const parsed = new URL(url);
  if (parsed.protocol !== `${APP_CONFIG.ELECTRON_PROTOCOL}:`) return;

  mainWindow.loadURL(parsed.href);
}
