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
 * Origins the renderer registered as address-book backends. Requests to
 * anything else are refused, and an empty set (nothing registered yet) refuses
 * everything. See `shared/lib/proxyUrl.ts` for why this is a set and why it is
 * only defence in depth.
 */
const allowedOrigins = new Set<string>();

/** Oldest pins are dropped past this, so the set cannot grow without bound. */
const MAX_PINNED_ORIGINS = 8;

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
   * `null` clears every pin; an origin that fails the scheme rule is refused
   * and the existing pins are kept.
   */
  ipcMain.handle(IPC.PROXY.SET_ALLOWED_ORIGIN, (_, origin: unknown) => {
    if (origin === null) {
      allowedOrigins.clear();

      return;
    }

    if (typeof origin !== 'string' || !isAllowedProxyOrigin(origin)) {
      console.warn(`${SECURITY_LOG_PREFIX} Refused to pin proxy origin: ${describeUrl(origin)}`);

      return;
    }

    // Re-inserting moves the origin to the end, so the eviction below is least-recently-pinned.
    allowedOrigins.delete(origin);
    allowedOrigins.add(origin);

    while (allowedOrigins.size > MAX_PINNED_ORIGINS) {
      const oldest = allowedOrigins.values().next();
      if (oldest.done) break;
      allowedOrigins.delete(oldest.value);
    }
  });

  ipcMain.handle(IPC.PROXY.FETCH, async (_, url: unknown, init?: FetchInit): Promise<FetchResult> => {
    if (typeof url !== 'string' || !isAllowedProxyUrl(url, allowedOrigins)) {
      const pinned = allowedOrigins.size === 0 ? 'none' : [...allowedOrigins].join(', ');
      console.warn(`${SECURITY_LOG_PREFIX} Blocked proxy fetch to ${describeUrl(url)} (allowed origins: ${pinned})`);

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
