import { z } from 'zod';

import { isElectron } from '@/shared/lib/utils';

type FetchResult = { ok: boolean; status: number; headers: Record<string, string>; body: string };

const challengeResponseSchema = z.object({
  challengeId: z.string(),
  nonce: z.string(),
  expiresAt: z.string(),
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
  if (isElectron()) {
    return window.App.proxyFetch(url, init);
  }

  const response = await fetch(url, { ...init, credentials: 'include' });
  const body = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    headers: {},
    body,
  };
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

  if (!result.ok) {
    throw new Error(`Logout failed with status ${result.status}`);
  }
}
