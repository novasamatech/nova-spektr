import { z } from 'zod';

import { authFetch, parseResponse } from '@/shared/api/backend-fetch';

const backendDraftSchema = z.object({
  id: z.string(),
  multisigAccountId: z.string().nullable(),
  proxyAccountId: z.string().nullable().optional(),
  proxyContact: z.object({ name: z.string(), accountId: z.string() }).nullable().optional(),
  chainId: z.string(),
  callData: z.string().nullable(),
  decodedCallData: z.unknown().optional(),
  description: z.string().nullable(),
  createdBy: z.string(),
  createdByContact: z.object({ name: z.string(), accountId: z.string() }).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),

});

export type Draft = z.infer<typeof backendDraftSchema>;

type BackendDraft = Draft;

const listResponseSchema = z.object({
  data: z.array(backendDraftSchema),
  total: z.number(),
});

async function createDraft(
  baseUrl: string,
  params: {
    chainId: string;
    multisigAccountId?: string;
    proxyAccountId?: string;
    callData?: string;
    description?: string;
  },
): Promise<BackendDraft> {
  const result = await authFetch(`${baseUrl}/draft-operations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  return parseResponse(result, backendDraftSchema);
}

async function fetchDrafts(baseUrl: string): Promise<BackendDraft[]> {
  const result = await authFetch(`${baseUrl}/draft-operations`, { method: 'GET' });
  const parsed = parseResponse(result, listResponseSchema);

  return parsed.data;
}

async function updateDraft(
  baseUrl: string,
  id: string,
  params: {
    description?: string;
    callData?: string;
    chainId?: string;
    multisigAccountId?: string;
    proxyAccountId?: string;
  },
): Promise<BackendDraft> {
  const result = await authFetch(`${baseUrl}/draft-operations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  return parseResponse(result, backendDraftSchema);
}

async function deleteDraft(baseUrl: string, id: string): Promise<void> {
  await authFetch(`${baseUrl}/draft-operations/${id}`, { method: 'DELETE' });
}

export const draftsService = { createDraft, fetchDrafts, updateDraft, deleteDraft };
