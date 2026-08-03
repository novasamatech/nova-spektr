import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authFetchMock } = vi.hoisted(() => ({ authFetchMock: vi.fn() }));

vi.mock('@/shared/api/backend-fetch', () => ({ authFetch: authFetchMock }));

import { isBackendContact } from '@/shared/core';

import { HttpError, backendContactsService } from './service';

// Generic-substrate SS58 address (prefix 42) so toAccountId/toAddress decode predictably.
// toAddress() re-encodes with SS58_DEFAULT_PREFIX (0, Polkadot mainnet), so the mapped
// `address` differs from the raw input — see ALICE_POLKADOT_ADDRESS below.
const ALICE_ADDRESS = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const ALICE_POLKADOT_ADDRESS = '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5';

function rawContact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c-1',
    name: 'Alice',
    accountId: ALICE_ADDRESS,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, headers: {}, body: JSON.stringify(body) };
}

describe('backendContactsService.fetchAllContacts', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
  });

  it('requests a single page when total <= pageSize', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse({ data: [rawContact()], total: 1 }));

    const result = await backendContactsService.fetchAllContacts('https://backend.test');

    expect(authFetchMock).toHaveBeenCalledTimes(1);
    expect(authFetchMock).toHaveBeenCalledWith('https://backend.test/contacts?page=1&pageSize=100', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Alice');
  });

  it('falls back to items.length when no total/count/totalCount field is present', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse({ data: [rawContact(), rawContact({ id: 'c-2', name: 'Bob' })] }));

    const result = await backendContactsService.fetchAllContacts('https://backend.test');

    expect(authFetchMock).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
  });

  it('requests pages 2 and 3 in parallel (before either resolves) and preserves page order even when they resolve out of order', async () => {
    // total = 250, pageSize = 100 -> 3 pages
    const page1 = Array.from({ length: 100 }, (_, i) => rawContact({ id: `p1-${i}`, name: `P1-${i}` }));
    const page2 = Array.from({ length: 100 }, (_, i) => rawContact({ id: `p2-${i}`, name: `P2-${i}` }));
    const page3 = Array.from({ length: 50 }, (_, i) => rawContact({ id: `p3-${i}`, name: `P3-${i}` }));

    const requestedUrls: string[] = [];

    let resolvePage2!: (value: ReturnType<typeof jsonResponse>) => void;
    let resolvePage3!: (value: ReturnType<typeof jsonResponse>) => void;
    const page2Response = new Promise<ReturnType<typeof jsonResponse>>(resolve => {
      resolvePage2 = resolve;
    });
    const page3Response = new Promise<ReturnType<typeof jsonResponse>>(resolve => {
      resolvePage3 = resolve;
    });

    authFetchMock.mockImplementation((url: string) => {
      requestedUrls.push(url);
      if (url.includes('page=1&')) return Promise.resolve(jsonResponse({ data: page1, total: 250 }));
      if (url.includes('page=2&')) return page2Response;
      if (url.includes('page=3&')) return page3Response;
      return Promise.reject(new Error(`unexpected url: ${url}`));
    });

    const resultPromise = backendContactsService.fetchAllContacts('https://backend.test');

    // Flush microtasks so page 1 resolves and pages 2 & 3 get dispatched, without
    // resolving either deferred page yet — proves 2 and 3 are in flight simultaneously.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(authFetchMock).toHaveBeenCalledTimes(3);
    expect(requestedUrls).toContain('https://backend.test/contacts?page=2&pageSize=100');
    expect(requestedUrls).toContain('https://backend.test/contacts?page=3&pageSize=100');

    // Resolve page 3 before page 2 — if the code re-sorted by resolution order instead of
    // page number, this would surface as P3 rows landing where P2 rows are expected.
    resolvePage3(jsonResponse({ data: page3, total: 250 }));
    await new Promise(resolve => setTimeout(resolve, 0));
    resolvePage2(jsonResponse({ data: page2, total: 250 }));

    const result = await resultPromise;

    expect(result).toHaveLength(250);
    expect(result[0]!.name).toBe('P1-0');
    expect(result[100]!.name).toBe('P2-0');
    expect(result[200]!.name).toBe('P3-0');
  });

  it.each([
    ['data', 'total'],
    ['items', 'count'],
    ['contacts', 'totalCount'],
    ['results', 'total'],
  ])('unwraps the "%s" items key together with the "%s" total key', async (itemsKey, totalKey) => {
    authFetchMock.mockResolvedValueOnce(jsonResponse({ [itemsKey]: [rawContact()], [totalKey]: 1 }));

    const result = await backendContactsService.fetchAllContacts('https://backend.test');

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Alice');
  });

  it('skips invalid rows but keeps valid ones, warning for each skip', async () => {
    const invalidRow = { id: 'bad', name: 'Bad Contact' }; // missing required `accountId` -> fails zod
    const validRow = rawContact({ id: 'good', name: 'Good Contact' });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    authFetchMock.mockResolvedValueOnce(jsonResponse({ data: [invalidRow, validRow], total: 2 }));

    const result = await backendContactsService.fetchAllContacts('https://backend.test');

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('good');
    expect(warnSpy).toHaveBeenCalledWith('[BackendContacts] Skipping invalid contact:', expect.any(String), invalidRow);

    warnSpy.mockRestore();
  });

  it('flattens field/tag options and carries multisig signatories/threshold', async () => {
    const raw = rawContact({
      id: 'multi-1',
      name: 'Treasury Multisig',
      chain: { chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c', name: 'Polkadot' },
      derivationPath: '//hard/soft',
      ownerAccountId: '0xowner',
      signatories: ['0xsig1', '0xsig2'],
      threshold: 2,
      contactFieldOptions: [
        { fieldOption: { value: 'Nova Wallet' }, field: { name: 'Entity' } },
        { fieldOption: { value: 'Foundation' }, field: { name: 'Entity' } },
        { fieldOption: { value: 'DeFi' }, field: { name: 'Category' } },
        { fieldOption: { value: 'Multisig' }, field: { name: 'Contact Type' } },
        { fieldOption: { value: 'Unrelated' }, field: { name: 'Other Field' } },
      ],
      contactTagOptions: [
        { tagOption: { value: 'red', tag: { name: 'Priority' } } },
        { tagOption: { value: 'blue', tag: { name: 'Priority' } } },
        { tagOption: { value: 'internal', tag: { name: 'Visibility' } } },
      ],
    });

    authFetchMock.mockResolvedValueOnce(jsonResponse({ data: [raw], total: 1 }));

    const [contact] = await backendContactsService.fetchAllContacts('https://backend.test');

    if (!contact || !isBackendContact(contact)) {
      throw new Error('expected a backend contact');
    }

    expect(contact.entityNames).toEqual(['Nova Wallet', 'Foundation']);
    expect(contact.categoryName).toBe('DeFi');
    expect(contact.contactTypeName).toBe('Multisig');
    expect(contact.tags).toEqual([
      { tagName: 'Priority', values: ['red', 'blue'] },
      { tagName: 'Visibility', values: ['internal'] },
    ]);
    expect(contact.signatories).toEqual(['0xsig1', '0xsig2']);
    expect(contact.threshold).toBe(2);
    expect(contact.chainId).toBe('0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c');
    expect(contact.chainName).toBe('Polkadot');
    expect(contact.derivationPath).toBe('//hard/soft');
    expect(contact.ownerAccountId).toBe('0xowner');
    expect(contact.address).toBe(ALICE_POLKADOT_ADDRESS);
  });

  it('defaults entityNames/categoryName/contactTypeName/tags/signatories/threshold when absent', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse({ data: [rawContact()], total: 1 }));

    const [contact] = await backendContactsService.fetchAllContacts('https://backend.test');

    if (!contact || !isBackendContact(contact)) {
      throw new Error('expected a backend contact');
    }

    expect(contact.entityNames).toEqual([]);
    expect(contact.categoryName).toBeNull();
    expect(contact.contactTypeName).toBeNull();
    expect(contact.tags).toEqual([]);
    expect(contact.signatories).toBeNull();
    expect(contact.threshold).toBeNull();
  });

  it('throws HttpError with the status and body on a non-2xx response', async () => {
    authFetchMock.mockResolvedValueOnce({ ok: false, status: 500, headers: {}, body: 'Internal Server Error' });

    await expect(backendContactsService.fetchAllContacts('https://backend.test')).rejects.toBeInstanceOf(HttpError);

    authFetchMock.mockResolvedValueOnce({ ok: false, status: 500, headers: {}, body: 'Internal Server Error' });

    await expect(backendContactsService.fetchAllContacts('https://backend.test')).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining('Internal Server Error'),
    });
  });
});
