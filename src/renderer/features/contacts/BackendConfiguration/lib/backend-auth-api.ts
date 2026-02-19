import { z } from 'zod';

import { isElectron } from '@/shared/lib/utils';

type FetchResult = { ok: boolean; status: number; headers: Record<string, string>; body: string };

let csrfToken: string | null = null;

export function getCsrfToken(): string | null {
  return csrfToken;
}

const challengeResponseSchema = z.object({
  challengeId: z.string(),
  nonce: z.string(),
  expiresAt: z.number(),
});

const verifyResponseSchema = z.object({
  permissions: z.array(z.string()),
});

const sessionResponseSchema = z.object({
  accountId: z.string(),
  permissions: z.array(z.string()),
});

type ChallengeResponse = z.infer<typeof challengeResponseSchema>;
type VerifyResponse = z.infer<typeof verifyResponseSchema>;
type SessionResponse = z.infer<typeof sessionResponseSchema>;

async function authFetch(url: string, init?: RequestInit): Promise<FetchResult> {
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

  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
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
  if (newToken) {
    csrfToken = newToken;
  }

  return result;
}

const errorResponseSchema = z.object({
  message: z.string().optional(),
});

function parseResponse<T>(result: FetchResult, schema: z.ZodType<T>): T {
  if (!result.ok) {
    const parsed = errorResponseSchema.parse(JSON.parse(result.body));
    throw new Error(parsed.message ?? `Request failed with status ${result.status}`);
  }

  return schema.parse(JSON.parse(result.body));
}

export async function requestChallenge(baseUrl: string, accountId: string): Promise<ChallengeResponse> {
  const result = await authFetch(`${baseUrl}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  });

  return parseResponse(result, challengeResponseSchema);
}

export async function verifySignature(
  baseUrl: string,
  params: { accountId: string; challengeId: string; signature: string },
): Promise<VerifyResponse> {
  const result = await authFetch(`${baseUrl}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  return parseResponse(result, verifyResponseSchema);
}

export async function checkSession(baseUrl: string): Promise<SessionResponse> {
  const result = await authFetch(`${baseUrl}/auth/me`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return parseResponse(result, sessionResponseSchema);
}

export async function logout(baseUrl: string): Promise<void> {
  const result = await authFetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  csrfToken = null;

  if (!result.ok) {
    throw new Error(`Logout failed with status ${result.status}`);
  }
}
