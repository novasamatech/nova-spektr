import { z } from 'zod';

import { authFetch, clearCsrfToken, parseResponse } from './backend-fetch';

export { getCsrfToken } from './backend-fetch';

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

export async function createOperationDescription(
  baseUrl: string,
  params: {
    multisigAccountId: string;
    chainId: string;
    callHash: string;
    blockNumber: number;
    extrinsicIndex: number;
    description: string;
  },
): Promise<void> {
  const result = await authFetch(`${baseUrl}/operations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!result.ok) {
    console.warn('[OperationDescription] Failed to save:', result.status, result.body.slice(0, 300));
  }
}

const backendOperationSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
});

type BackendOperation = z.infer<typeof backendOperationSchema>;

export async function fetchOperationsByIds(
  baseUrl: string,
  ids: string[],
): Promise<{ id: string; description: string | null }[]> {
  if (ids.length === 0) return [];

  const result = await authFetch(`${baseUrl}/operations/by-ids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });

  if (!result.ok) {
    throw new Error(`Failed to fetch operations by ids: ${result.status}`);
  }

  const body: unknown = JSON.parse(result.body);
  const items = Array.isArray(body) ? body : [];
  const operations: BackendOperation[] = [];
  for (const item of items) {
    const parsed = backendOperationSchema.safeParse(item);
    if (parsed.success) {
      operations.push(parsed.data);
    }
  }

  return operations;
}

const OPERATIONS_PAGE_SIZE = 100;

async function fetchOperationsPage(
  baseUrl: string,
  page: number,
): Promise<{ data: BackendOperation[]; total: number }> {
  const result = await authFetch(`${baseUrl}/operations?page=${page}&pageSize=${OPERATIONS_PAGE_SIZE}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!result.ok) {
    throw new Error(`Failed to fetch operations: ${result.status}`);
  }

  const body: unknown = JSON.parse(result.body);
  if (typeof body !== 'object' || body === null) {
    throw new Error('Unexpected response shape');
  }

  const obj = body as Record<string, unknown>;
  const items = Array.isArray(obj.data) ? obj.data : [];
  const total = typeof obj.total === 'number' ? obj.total : items.length;

  const operations: BackendOperation[] = [];
  for (const item of items) {
    const parsed = backendOperationSchema.safeParse(item);
    if (parsed.success) {
      operations.push(parsed.data);
    } else {
      console.warn('[BackendOperations] Skipping invalid operation:', parsed.error.message);
    }
  }

  return { data: operations, total };
}

export async function fetchOperations(
  baseUrl: string,
): Promise<{ id: string; description: string | null }[]> {
  const firstPage = await fetchOperationsPage(baseUrl, 1);

  if (firstPage.total <= OPERATIONS_PAGE_SIZE) {
    return firstPage.data;
  }

  const totalPages = Math.ceil(firstPage.total / OPERATIONS_PAGE_SIZE);
  const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  const remainingResults = await Promise.all(remainingPages.map((page) => fetchOperationsPage(baseUrl, page)));

  return [firstPage.data, ...remainingResults.map((r) => r.data)].flat();
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
