import { ipcMain, session } from 'electron';

import { IPC } from '../shared/constants/ipc';
import { isAllowedProxyOrigin, isAllowedProxyUrl } from '../shared/lib/proxyUrl';

type FetchInit = Pick<RequestInit, 'method' | 'headers' | 'body'>;

type FetchResult = Pick<Response, 'ok' | 'status' | 'statusText'> & {
  headers: Record<string, string>;
  body: string;
};

const AUTH_PARTITION = 'persist:auth';

/**
 * Distinct from network errors so the renderer can tell "blocked" from "server
 * down".
 */
export const PROXY_BLOCKED_STATUS_TEXT = 'Blocked by proxy policy';

/**
 * Origin the renderer registered as its address-book backend. Requests to any
 * other origin are refused. `null` (nothing registered yet) refuses everything.
 * See `shared/lib/proxyUrl.ts` for why the pin is only defence in depth.
 */
let allowedOrigin: string | null = null;

function failure(statusText: string): FetchResult {
  return { ok: false, status: 0, statusText, headers: {}, body: '{}' };
}

export function setupProxy() {
  ipcMain.handle(IPC.PROXY.SET_ALLOWED_ORIGIN, (_, origin: unknown) => {
    if (origin === null) {
      allowedOrigin = null;

      return;
    }

    if (typeof origin !== 'string' || !isAllowedProxyOrigin(origin)) {
      console.warn(`[Security] Refused to pin proxy origin: ${String(origin)}`);

      return;
    }

    allowedOrigin = origin;
  });

  ipcMain.handle(IPC.PROXY.FETCH, async (_, url: string, init?: FetchInit): Promise<FetchResult> => {
    if (!isAllowedProxyUrl(url, allowedOrigin)) {
      console.warn(`[Security] Blocked proxy fetch to ${url} (allowed origin: ${allowedOrigin ?? 'none'})`);

      return failure(PROXY_BLOCKED_STATUS_TEXT);
    }

    let response: Response;
    try {
      response = await session.fromPartition(AUTH_PARTITION).fetch(url, {
        method: init?.method,
        headers: init?.headers,
        body: init?.body,
      });
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }

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
