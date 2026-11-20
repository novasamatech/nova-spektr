import { z } from 'zod';

import { authFetch, clearCsrfToken, parseResponse } from '@/shared/api/backend-fetch';

/**
 * The one sign-in message format the app signs: its text names the backend
 * origin.
 */
export const SIGN_IN_MESSAGE_VERSION = 2;

/**
 * Challenge nonces are 32 random bytes as lower-case hex; anything else is
 * refused before signing.
 */
const NONCE_PATTERN = /^0x[0-9a-f]{64}$/;

const challengeResponseSchema = z.object({
  challengeId: z.string(),
  nonce: z.string().regex(NONCE_PATTERN),
  expiresAt: z.number(),
  // Required: a challenge without it, or with another value, is not a challenge the app can answer.
  messageVersion: z.literal(SIGN_IN_MESSAGE_VERSION),
});

/**
 * The backend's challenge does not advertise the sign-in message format the app
 * signs. Nothing is offered for signing; the backend has to be updated.
 */
export class UnsupportedSignInMessageError extends Error {
  constructor() {
    super('The backend does not support the sign-in message format this app signs');
    this.name = 'UnsupportedSignInMessageError';
  }
}

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

  try {
    return parseResponse(result, challengeResponseSchema);
  } catch (error) {
    if (error instanceof z.ZodError && error.issues.some(issue => issue.path[0] === 'messageVersion')) {
      throw new UnsupportedSignInMessageError();
    }

    throw error;
  }
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
