import { join } from 'path';

import { main, renderer, title } from '~config';
import { BrowserWindow, Menu, session, shell } from 'electron';
import windowStateKeeper from 'electron-window-state';

import { ENVIRONMENT } from '../shared/constants/environment';
import { isAllowedExternalUrl } from '../shared/lib/externalUrl';

import { buildMenuTemplate } from './menu';

function isViteRendererDocumentUrl(url: string): boolean {
  try {
    const base = renderer.server.origin ?? `${renderer.server.protocol}${renderer.server.host}:${renderer.server.port}`;
    return new URL(url).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

export function createWindow(): BrowserWindow {
  const mainWindowState = windowStateKeeper({
    defaultWidth: main.window.width,
    defaultHeight: main.window.height,
  });

  const window = new BrowserWindow({
    title,
    x: mainWindowState.x,
    y: mainWindowState.y,
    minWidth: main.window.width,
    minHeight: main.window.height,
    width: Math.max(mainWindowState.width, main.window.width),
    height: Math.max(mainWindowState.height, main.window.height),
    show: false,
    center: true,
    autoHideMenuBar: true,

    webPreferences: {
      nodeIntegration: false,
      preload: join(__dirname, 'preload.cjs'),
    },
  });

  if (ENVIRONMENT.RENDERER_SOURCE === 'localhost') {
    window.loadURL(`${renderer.server.protocol}${renderer.server.host}:${renderer.server.port}`);
  } else {
    window.loadURL('file://' + __dirname + '/index.html');
  }

  if (ENVIRONMENT.IS_DEV) {
    window.webContents.openDevTools({ mode: 'bottom' });
  }

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'Nova Spektr';
    delete details.requestHeaders['Origin'];
    callback({ requestHeaders: details.requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Only attach CSP to document (navigation) responses.
    // Adding headers to WebSocket upgrade (101) responses breaks the handshake in Electron.
    if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') {
      if (isViteRendererDocumentUrl(details.url)) {
        callback({ cancel: false });

        return;
      }

      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' data: wss: ws: https: http:; font-src 'self' data:; worker-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'",
          ],
        },
      });
    } else {
      callback({ cancel: false });
    }
  });

  // Open urls in the user's browser; never let other schemes reach OS protocol handlers
  window.webContents.setWindowOpenHandler((details) => {
    if (isAllowedExternalUrl(details.url)) {
      shell.openExternal(details.url);
    } else {
      console.warn('[Security] Blocked external url with disallowed scheme', details.url);
    }

    return { action: 'deny' };
  });

  window.on('ready-to-show', () => {
    if (!window) {
      throw new Error('"MainWindow" is not defined');
    }

    window.show();
  });

  window.on('close', () => {
    for (const w of BrowserWindow.getAllWindows()) {
      w.destroy();
    }
  });

  window.on('closed', window.destroy);

  Menu.setApplicationMenu(buildMenuTemplate());
  mainWindowState.manage(window);

  return window;
}
