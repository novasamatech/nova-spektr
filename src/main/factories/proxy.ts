import { ipcMain, session } from 'electron';

import { IPC } from '../shared/constants/ipc';

interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface FetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export function setupProxy() {
  const authSession = session.fromPartition('persist:auth');

  ipcMain.handle(IPC.PROXY.FETCH, async (_, url: string, init?: FetchInit): Promise<FetchResult> => {
    const response = await authSession.fetch(url, {
      method: init?.method,
      headers: init?.headers,
      body: init?.body,
    });

    const headers: Record<string, string> = {};
    // eslint-disable-next-line no-restricted-syntax -- Headers type lacks iterable support
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const body = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers,
      body,
    };
  });
}
