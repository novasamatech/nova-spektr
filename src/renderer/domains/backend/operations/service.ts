import { z } from 'zod';

import { authFetch, parseResponse } from '@/shared/api/backend-fetch';
import { HttpError } from '../contacts/service';

const backendOperationSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  draftId: z.string().nullable().optional(),
});

type BackendOperation = z.infer<typeof backendOperationSchema>;

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

const paginatedOperationsSchema = z.object({
  data: z.array(z.unknown()),
  total: z.number(),
});

// Backend caps pageSize at 100
const OPERATIONS_PAGE_SIZE = 100;

async function fetchDescriptionsPage(baseUrl: string, page: number) {
  const result = await authFetch(`${baseUrl}/operations?page=${page}&pageSize=${OPERATIONS_PAGE_SIZE}`, {
    method: 'GET',
  });

  return parseResponse(result, paginatedOperationsSchema);
}

async function fetchAllDescriptions(baseUrl: string): Promise<BackendOperation[]> {
  const firstPage = await fetchDescriptionsPage(baseUrl, 1);

  const totalPages = Math.ceil(firstPage.total / OPERATIONS_PAGE_SIZE);
  const restPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchDescriptionsPage(baseUrl, index + 2)),
  );

  const operations: BackendOperation[] = [];
  for (const item of [firstPage, ...restPages].flatMap(page => page.data)) {
    const parsed = backendOperationSchema.safeParse(item);
    if (parsed.success) {
      operations.push(parsed.data);
    }
  }

  return operations;
}

export const operationsService = { createDescription, updateDescription, fetchDescriptionsByIds, fetchAllDescriptions };
