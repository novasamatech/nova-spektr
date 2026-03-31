import { z } from 'zod';

import { type BackendContact, type Contact, type ContactTag } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { authFetch } from '@/aggregates/backend-auth';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    body: string,
  ) {
    super(`Request failed with status ${status}: ${body}`);
  }
}

const backendContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountId: z.string(),
  entities: z.array(z.object({ id: z.string(), name: z.string() })),
  chain: z.object({ chainId: z.string(), name: z.string() }).nullish(),
  category: z.object({ id: z.string(), name: z.string() }).nullish(),
  contactType: z.object({ id: z.string(), name: z.string() }).nullish(),
  derivationPath: z.string().nullish(),
  ownerAccountId: z.string().nullish(),
  signatories: z.array(z.string()).nullish(),
  threshold: z.number().nullish(),
  contactTagOptions: z
    .array(
      z.object({
        tagOption: z.object({
          value: z.string(),
          tag: z.object({ name: z.string() }),
        }),
      }),
    )
    .optional()
    .default([]),
});
type RawBackendContact = z.infer<typeof backendContactSchema>;

const PAGE_SIZE = 100;

function groupTagOptions(raw: RawBackendContact): ContactTag[] {
  const tagMap = new Map<string, string[]>();
  for (const { tagOption } of raw.contactTagOptions) {
    const existing = tagMap.get(tagOption.tag.name);
    if (existing) {
      existing.push(tagOption.value);
    } else {
      tagMap.set(tagOption.tag.name, [tagOption.value]);
    }
  }

  return Array.from(tagMap, ([tagName, values]) => ({ tagName, values }));
}

function mapToContact(raw: RawBackendContact): BackendContact {
  const accountId = toAccountId(raw.accountId);
  const address = toAddress(raw.accountId);

  return {
    id: raw.id,
    name: raw.name,
    address,
    accountId,
    source: 'backend',
    entityNames: raw.entities.map((e) => e.name),
    chainId: raw.chain?.chainId ?? null,
    chainName: raw.chain?.name ?? null,
    categoryName: raw.category?.name ?? null,
    contactTypeName: raw.contactType?.name ?? null,
    derivationPath: raw.derivationPath ?? null,
    ownerAccountId: raw.ownerAccountId ?? null,
    signatories: raw.signatories ?? null,
    threshold: raw.threshold ?? null,
    tags: groupTagOptions(raw),
  };
}

function extractContacts(body: unknown): { raw: unknown[]; total: number } {
  if (Array.isArray(body)) {
    return { raw: body, total: body.length };
  }

  if (typeof body === 'object' && body !== null) {
    const obj = body as Record<string, unknown>;

    const items = obj.data ?? obj.items ?? obj.contacts ?? obj.results;
    const total = obj.total ?? obj.count ?? obj.totalCount;

    if (Array.isArray(items)) {
      return { raw: items, total: typeof total === 'number' ? total : items.length };
    }
  }

  throw new Error(`Unexpected response shape: ${JSON.stringify(body).slice(0, 500)}`);
}

async function fetchContactsPage(
  baseUrl: string,
  page: number,
  pageSize: number,
): Promise<{ data: Contact[]; total: number }> {
  const result = await authFetch(`${baseUrl}/contacts?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!result.ok) {
    throw new HttpError(result.status, result.body.slice(0, 300));
  }

  const body: unknown = JSON.parse(result.body);
  const { raw, total } = extractContacts(body);

  const contacts: Contact[] = [];
  for (const item of raw) {
    const parsed = backendContactSchema.safeParse(item);
    if (!parsed.success) {
      console.warn('[BackendContacts] Skipping invalid contact:', parsed.error.message, item);
      continue;
    }

    try {
      contacts.push(mapToContact(parsed.data));
    } catch (e) {
      console.warn(`[BackendContacts] Skipping contact "${parsed.data.name}" (${parsed.data.accountId}):`, e);
    }
  }

  return { data: contacts, total };
}

export async function fetchAllContacts(baseUrl: string): Promise<Contact[]> {
  const firstPage = await fetchContactsPage(baseUrl, 1, PAGE_SIZE);

  if (firstPage.total <= PAGE_SIZE) {
    return firstPage.data;
  }

  const totalPages = Math.ceil(firstPage.total / PAGE_SIZE);
  const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

  const remainingResults = await Promise.all(remainingPages.map((page) => fetchContactsPage(baseUrl, page, PAGE_SIZE)));

  return [firstPage.data, ...remainingResults.map((r) => r.data)].flat();
}
