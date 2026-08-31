import { z } from 'zod';

import { isElectron } from '@/shared/lib/utils';

export type FetchResult = { ok: boolean; status: number; headers: Record<string, string>; body: string };

type CsrfToken = { origin: string; token: string };

// The token is bound to the origin that issued it, so a backend URL change never leaks it elsewhere.
let csrfToken: CsrfToken | null = null;

function getOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Electron only: the main-process fetch proxy refuses every request outside the origins pinned
// here, so each request first makes sure its own origin is pinned. Pinning per request (rather
// than per saved backend URL) also covers the reachability probe of an unsaved draft, and the
// pins accumulate so a probe in flight cannot unpin the saved backend under another request.
// Mirrors MAX_PINNED_ORIGINS in main/factories/proxy.ts, including the eviction order.
const MAX_PINNED_ORIGINS = 8;
const pinnedOrigins = new Map<string, Promise<void>>();

function ensureProxyOrigin(url: string): Promise<void> {
  const origin = new URL(url).origin;
  const pending = pinnedOrigins.get(origin);

  if (pending) {
    return pending;
  }

  const pin = Promise.resolve(window.App.setProxyAllowedOrigin(origin)).catch((error) => {
    pinnedOrigins.delete(origin);
    throw error;
  });

  pinnedOrigins.set(origin, pin);
  while (pinnedOrigins.size > MAX_PINNED_ORIGINS) {
    const oldest = pinnedOrigins.keys().next();
    if (oldest.done) break;
    pinnedOrigins.delete(oldest.value);
  }

  return pin;
}

export function getCsrfToken(): string | null {
  return csrfToken?.token ?? null;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

export async function authFetch(url: string, init?: RequestInit): Promise<FetchResult> {
  const initHeaders = init?.headers;
  const headers: Record<string, string> = {};

  if (
    initHeaders &&
    typeof initHeaders === 'object' &&
    !Array.isArray(initHeaders) &&
    !(initHeaders instanceof Headers)
  ) {
    Object.assign(headers, initHeaders);
  }

  const origin = getOrigin(url);

  if (csrfToken && origin !== null && csrfToken.origin === origin) {
    headers['X-CSRF-Token'] = csrfToken.token;
  }

  const mergedInit: RequestInit = { ...init, headers };

  let result: FetchResult;

  if (isElectron()) {
    await ensureProxyOrigin(url);
    result = await window.App.proxyFetch(url, mergedInit);
  } else {
    const response = await fetch(url, { ...mergedInit, credentials: 'include' });
    const body = await response.text();

    const responseHeaders: Record<string, string> = {};
    // eslint-disable-next-line no-restricted-syntax
    response.headers.forEach((value, key) => {
      responseHeaders[key.toLowerCase()] = value;
    });

    result = {
      ok: response.ok,
      status: response.status,
      headers: responseHeaders,
      body,
    };
  }

  const newToken = result.headers['x-csrf-token'];
  if (newToken && origin !== null) {
    csrfToken = { origin, token: newToken };
  }

  return result;
}

const errorResponseSchema = z.object({
  message: z.union([z.string(), z.array(z.string())]).optional(),
});

export function parseResponse<T>(result: FetchResult, schema: z.ZodType<T>): T {
  if (!result.ok) {
    const parsed = errorResponseSchema.parse(JSON.parse(result.body));
    const message = Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message;
    throw new Error(message ?? `Request failed with status ${result.status}`);
  }

  return schema.parse(JSON.parse(result.body));
}
