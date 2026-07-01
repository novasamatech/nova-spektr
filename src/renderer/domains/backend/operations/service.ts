import { z } from 'zod';

import { authFetch } from '@/shared/api/backend-fetch';
import { HttpError } from '../contacts/service';

const backendOperationSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  draftId: z.string().nullable().optional(),
});

type BackendOperation = z.infer<typeof backendOperationSchema>;

const nudgeResultSchema = z.object({
  notified: z.number(),
  skipped: z.number(),
  failed: z.number(),
});

export type NudgeResult = z.infer<typeof nudgeResultSchema>;

async function createDescription(
  baseUrl: string,
  params: {
    multisigAccountId: string;
    chainId: string;
    callHash: string;
    blockNumber: number;
    extrinsicIndex: number;
    description: string;
    draftId?: string;
  },
): Promise<void> {
  const result = await authFetch(`${baseUrl}/operations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!result.ok) {
    throw new HttpError(result.status, result.body);
  }
}

async function updateDescription(baseUrl: string, id: string, description: string): Promise<void> {
  const result = await authFetch(`${baseUrl}/operations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });

  if (!result.ok) {
    throw new HttpError(result.status, result.body);
  }
}

async function nudge(baseUrl: string, operationId: string): Promise<NudgeResult> {
  const result = await authFetch(`${baseUrl}/operations/${encodeURIComponent(operationId)}/nudge`, {
    method: 'POST',
  });

  if (!result.ok) {
    throw new HttpError(result.status, result.body);
  }

  return nudgeResultSchema.parse(JSON.parse(result.body));
}

async function fetchDescriptionsByIds(baseUrl: string, ids: string[]): Promise<BackendOperation[]> {
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

async function fetchAllDescriptions(baseUrl: string): Promise<BackendOperation[]> {
  const result = await authFetch(`${baseUrl}/operations`, { method: 'GET' });

  if (!result.ok) {
    throw new Error(`Failed to fetch all operations: ${result.status}`);
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

export const operationsService = {
  createDescription,
  updateDescription,
  fetchDescriptionsByIds,
  fetchAllDescriptions,
  nudge,
};
