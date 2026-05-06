import { type HexString } from '@polkadot/util/types';
import { z } from 'zod';

import { authFetch, parseResponse } from '@/shared/api/backend-fetch';
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

export const pathNodeSchema = z.object({
  kind: pathNodeKindSchema,
  accountId: accountIdStringSchema,
  proxyType: z.string().optional(),
});

export type PathNode = z.infer<typeof pathNodeSchema>;

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
  signingPath: z.array(pathNodeSchema).default([]),
  initiatorAccountId: z.string().nullable().optional().default(null),
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
