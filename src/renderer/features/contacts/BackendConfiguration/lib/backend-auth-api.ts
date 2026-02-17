import { isElectron } from '@/shared/lib/utils';

type FetchResult = { ok: boolean; status: number; headers: Record<string, string>; body: string };

type ChallengeResponse = {
  challengeId: string;
  nonce: string;
  expiresAt: string;
};

type VerifyResponse = {
  permissions: string[];
};

type SessionResponse = {
  accountId: string;
  permissions: string[];
};

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

function parseResponse<T>(result: FetchResult): T {
  if (!result.ok) {
    const parsed = JSON.parse(result.body) as { message?: string };
    throw new Error(parsed.message ?? `Request failed with status ${result.status}`);
  }

  return JSON.parse(result.body) as T;
}

export async function requestChallenge(baseUrl: string, accountId: string): Promise<ChallengeResponse> {
  const result = await authFetch(`${baseUrl}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  });

  return parseResponse<ChallengeResponse>(result);
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

  return parseResponse<VerifyResponse>(result);
}

export async function checkSession(baseUrl: string): Promise<SessionResponse> {
  const result = await authFetch(`${baseUrl}/auth/me`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return parseResponse<SessionResponse>(result);
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
