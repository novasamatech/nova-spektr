import { type HexString } from '@polkadot/util/types';
import { z } from 'zod';

import { authFetch, parseResponse } from '@/shared/api/backend-fetch';
import { type CallData, type ChainId } from '@/shared/core';
import { isCorrectAccountId, isEthereumAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const pathNodeKindSchema = z.enum(['proxied', 'multisig', 'signer']);

// Backend ships accountIds as plain hex strings; brand them at parse time so
// every consumer sees `AccountId` without ad-hoc casts. Validation matches
// `accountIdSchema` (Substrate or Ethereum hex), so an unbranded path node
// never reaches the renderer.
const accountIdStringSchema = z
  .string()
  .refine(v => isCorrectAccountId(v as HexString) || isEthereumAccountId(v), {
    message: 'invalid accountId',
  })
  .transform(v => v as AccountId);

const chainIdStringSchema = z.string().transform(v => v as ChainId);

export const pathNodeSchema = z.object({
  kind: pathNodeKindSchema,
  accountId: accountIdStringSchema,
  proxyType: z.string().optional(),
});

export type PathNode = z.infer<typeof pathNodeSchema>;

// The backend joins the linked operation onto every draft: `null` = not yet on
// chain, present = already submitted. Only presence is read, so the shape stays
// loose — an unrelated Operation change must never fail a draft parse.
const linkedOperationSchema = z.object({ id: z.string() });

const backendDraftSchema = z.object({
  id: z.string(),
  // Not `.optional()`: defaulting a missing field to `null` marks every draft
  // pending and re-offers Submit for operations already on chain.
  operation: linkedOperationSchema.nullable(),
  multisigAccountId: accountIdStringSchema.nullable(),
  proxyAccountId: accountIdStringSchema.nullable().optional(),
  proxyContact: z.object({ name: z.string(), accountId: z.string() }).nullable().optional(),
  chainId: chainIdStringSchema,
  callData: z
    .string()
    .nullable()
    .transform(v => v as CallData | null),
  decodedCallData: z.unknown().optional(),
  description: z.string().nullable(),
  createdBy: z.string(),
  createdByContact: z.object({ name: z.string(), accountId: z.string() }).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  signingPath: z.array(pathNodeSchema).default([]),
  initiatorAccountId: accountIdStringSchema.nullable().optional().default(null),
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
    signingPath?: PathNode[];
    initiatorAccountId?: string;
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

// Backend defaults `pageSize` to 20 and caps it at 100; an unparameterised GET
// silently truncates.
const PAGE_SIZE = 100;

async function fetchDraftsPage(baseUrl: string, page: number): Promise<{ data: BackendDraft[]; total: number }> {
  const result = await authFetch(`${baseUrl}/draft-operations?page=${page}&pageSize=${PAGE_SIZE}`, { method: 'GET' });

  return parseResponse(result, listResponseSchema);
}

async function fetchDrafts(baseUrl: string): Promise<BackendDraft[]> {
  const firstPage = await fetchDraftsPage(baseUrl, 1);

  if (firstPage.total <= PAGE_SIZE) {
    return firstPage.data;
  }

  const totalPages = Math.ceil(firstPage.total / PAGE_SIZE);
  const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  const remainingResults = await Promise.all(remainingPages.map(page => fetchDraftsPage(baseUrl, page)));

  const allDrafts = [firstPage.data, ...remainingResults.map(result => result.data)].flat();

  // Offset paging isn't atomic: `createdAt DESC` has no tiebreaker and pages go
  // out in parallel, so a concurrent insert can shift a row across a boundary —
  // duplicating it onto two pages, or moving it into a page already read. The
  // `total` from page 1 goes stale the same way, dropping the tail. Dedup by id
  // covers the duplicates; misses heal on the next 30s poll. Real fix is a
  // stable backend sort (`createdAt DESC, id DESC`) plus paging off a cursor.
  return [...new Map(allDrafts.map(draft => [draft.id, draft])).values()];
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
    signingPath?: PathNode[];
    initiatorAccountId?: string;
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
