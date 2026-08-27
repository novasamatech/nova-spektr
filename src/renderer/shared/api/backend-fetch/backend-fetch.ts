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
