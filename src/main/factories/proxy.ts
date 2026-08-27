import { ipcMain, session } from 'electron';

import { IPC } from '../shared/constants/ipc';
import { isAllowedProxyOrigin, isAllowedProxyUrl } from '../shared/lib/proxyUrl';

type FetchInit = Pick<RequestInit, 'method' | 'headers' | 'body'>;

type FetchResult = Pick<Response, 'ok' | 'status' | 'statusText'> & {
  headers: Record<string, string>;
  body: string;
};

const AUTH_PARTITION = 'persist:auth';
const SECURITY_LOG_PREFIX = '[Security]';
const EMPTY_JSON_BODY = '{}';
const NETWORK_FAILURE_STATUS = 0;

/** Marks policy rejections (as opposed to network errors) in main and its tests. */
export const PROXY_BLOCKED_STATUS_TEXT = 'Blocked by proxy policy';

/**
 * Origin the renderer registered as its address-book backend. Requests to any
 * other origin are refused. `null` (nothing registered yet) refuses everything.
 * See `shared/lib/proxyUrl.ts` for why the pin is only defence in depth.
 */
let allowedOrigin: string | null = null;

function failure(statusText: string): FetchResult {
  return { ok: false, status: NETWORK_FAILURE_STATUS, statusText, headers: {}, body: EMPTY_JSON_BODY };
}

/**
 * Log-safe form of a requested URL: its origin, or a truncated prefix when it
 * does not parse.
 */
function describeUrl(url: unknown): string {
  if (typeof url !== 'string') return `<${typeof url}>`;

  try {
    return new URL(url).origin;
  } catch {
    return `${url.slice(0, 64)}${url.length > 64 ? '…' : ''}`;
  }
}

export function setupProxy() {
  /**
   * `null` clears the pin; an origin that fails the scheme rule is refused and
   * the previous pin is kept.
   */
  ipcMain.handle(IPC.PROXY.SET_ALLOWED_ORIGIN, (_, origin: unknown) => {
    if (origin === null) {
      allowedOrigin = null;

      return;
    }

    if (typeof origin !== 'string' || !isAllowedProxyOrigin(origin)) {
      console.warn(`${SECURITY_LOG_PREFIX} Refused to pin proxy origin: ${describeUrl(origin)}`);

      return;
    }

    allowedOrigin = origin;
  });

  ipcMain.handle(IPC.PROXY.FETCH, async (_, url: unknown, init?: FetchInit): Promise<FetchResult> => {
    if (typeof url !== 'string' || !isAllowedProxyUrl(url, allowedOrigin)) {
      console.warn(
        `${SECURITY_LOG_PREFIX} Blocked proxy fetch to ${describeUrl(url)} (allowed origin: ${allowedOrigin ?? 'none'})`,
      );

      return failure(PROXY_BLOCKED_STATUS_TEXT);
    }

    let response: Response;
    try {
      // A pinned origin must not bounce main elsewhere: a redirect is a failure, not a follow.
      response = await session.fromPartition(AUTH_PARTITION).fetch(url, {
        method: init?.method,
        headers: init?.headers,
        body: init?.body,
        redirect: 'error',
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
