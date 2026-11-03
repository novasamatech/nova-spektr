import { z } from 'zod';

import { authFetch, clearCsrfToken, parseResponse } from '@/shared/api/backend-fetch';

/**
 * Challenge nonces are 32 random bytes as lower-case hex; anything else is
 * refused before signing.
 */
const NONCE_PATTERN = /^0x[0-9a-f]{64}$/;

const challengeResponseSchema = z.object({
  challengeId: z.string(),
  nonce: z.string().regex(NONCE_PATTERN),
  expiresAt: z.number(),
  messageVersion: z.number().int().positive().optional(),
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

async function requestChallenge(baseUrl: string, accountId: string): Promise<ChallengeResponse> {
  const result = await authFetch(`${baseUrl}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  });

  return parseResponse(result, challengeResponseSchema);
}

async function verifySignature(
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

async function checkSession(baseUrl: string): Promise<SessionResponse | null> {
  const result = await authFetch(`${baseUrl}/auth/me`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (result.status === 401) {
    return null;
  }

  if (!result.ok) {
    throw new Error(`Session check failed with status ${result.status}`);
  }

  return parseResponse(result, sessionResponseSchema);
}

async function logout(baseUrl: string): Promise<void> {
  const result = await authFetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  clearCsrfToken();

  if (!result.ok) {
    throw new Error(`Logout failed with status ${result.status}`);
  }
}

export const backendAuthService = { requestChallenge, verifySignature, checkSession, logout };
