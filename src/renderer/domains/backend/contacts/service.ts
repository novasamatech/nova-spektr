import { z } from 'zod';

import { authFetch } from '@/shared/api/backend-fetch';
import { type BackendContact, type Contact, type ContactField } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';

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
  chain: z.object({ chainId: z.string(), name: z.string() }).nullish(),
  derivationPath: z.string().nullish(),
  ownerAccountId: z.string().nullish(),
  signatories: z.array(z.string()).nullish(),
  threshold: z.number().nullish(),
  // Fields are admin-defined and fully dynamic — the field identity lives on
  // `fieldOption.field`, there is no fixed set of names to rely on.
  contactFieldOptions: z
    .array(
      z.object({
        fieldOption: z.object({
          id: z.string(),
          value: z.string(),
          field: z
            .object({ id: z.string(), name: z.string(), multiSelect: z.boolean().optional().default(false) })
            .nullish(),
        }),
      }),
    )
    .optional()
    .default([]),
});
type RawBackendContact = z.infer<typeof backendContactSchema>;

const PAGE_SIZE = 100;

function groupContactFields(raw: RawBackendContact): ContactField[] {
  const byFieldId = new Map<string, ContactField>();
  for (const { fieldOption } of raw.contactFieldOptions) {
    const field = fieldOption.field;
    if (!field) continue;

    let group = byFieldId.get(field.id);
    if (!group) {
      group = { fieldId: field.id, fieldName: field.name, multiSelect: field.multiSelect, values: [] };
      byFieldId.set(field.id, group);
    }
    group.values.push({ optionId: fieldOption.id, value: fieldOption.value });
  }

  return Array.from(byFieldId.values());
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
    chainId: raw.chain?.chainId ?? null,
    chainName: raw.chain?.name ?? null,
    derivationPath: raw.derivationPath ?? null,
    ownerAccountId: raw.ownerAccountId ?? null,
    signatories: raw.signatories ?? null,
    threshold: raw.threshold ?? null,
    fields: groupContactFields(raw),
  };
}

function extractContacts(body: unknown): { raw: unknown[]; total: number } {
  if (Array.isArray(body)) {
    return { raw: body, total: body.length };
  }

  if (typeof body === 'object' && body !== null) {
    const obj = body as Record<string, unknown>;

    const items = obj['data'] ?? obj['items'] ?? obj['contacts'] ?? obj['results'];
    const total = obj['total'] ?? obj['count'] ?? obj['totalCount'];

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

async function fetchAllContacts(baseUrl: string): Promise<Contact[]> {
  const firstPage = await fetchContactsPage(baseUrl, 1, PAGE_SIZE);

  if (firstPage.total <= PAGE_SIZE) {
    return firstPage.data;
  }

  const totalPages = Math.ceil(firstPage.total / PAGE_SIZE);
  const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

  const remainingResults = await Promise.all(remainingPages.map(page => fetchContactsPage(baseUrl, page, PAGE_SIZE)));

  return [firstPage.data, ...remainingResults.map(r => r.data)].flat();
}

export const backendContactsService = { fetchAllContacts };
