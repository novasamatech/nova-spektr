import { z } from 'zod';

import { authFetch, clearCsrfToken, parseResponse } from '@/shared/api/backend-fetch';

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

export type ChallengeResponse = z.infer<typeof challengeResponseSchema>;
export type VerifyResponse = z.infer<typeof verifyResponseSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

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

export async function checkSession(baseUrl: string): Promise<SessionResponse | null> {
  const result = await authFetch(`${baseUrl}/auth/me`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!result.ok) {
    return null;
  }

  try {
    return parseResponse(result, sessionResponseSchema);
  } catch {
    return null;
  }
}

export async function logout(baseUrl: string): Promise<void> {
  const result = await authFetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  clearCsrfToken();

  if (!result.ok) {
    throw new Error(`Logout failed with status ${result.status}`);
  }
}
