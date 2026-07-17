import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authFetchMock } = vi.hoisted(() => ({ authFetchMock: vi.fn() }));

// `parseResponse` comes from the same module and must stay real.
vi.mock('@/shared/api/backend-fetch', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();

  return { ...actual, authFetch: authFetchMock };
});

import { draftsService } from './service';

const CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
const ACCOUNT_ID = '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';

// Mirrors a real `GET /draft-operations` row.
const makeBackendDraft = (id: string, operation: { id: string } | null) => ({
  id,
  operation,
  multisigAccountId: ACCOUNT_ID,
  proxyAccountId: null,
  chainId: CHAIN_ID,
  callData: '0x0000',
  description: 'Pay the team',
  createdBy: ACCOUNT_ID,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
  signingPath: [],
  initiatorAccountId: null,
});

const okResponse = (body: unknown) => ({ ok: true, status: 200, headers: {}, body: JSON.stringify(body) });

describe('draftsService.fetchDrafts', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
  });

  it('preserves the linked operation so submission state survives parsing', async () => {
    authFetchMock.mockResolvedValue(
      okResponse({
        data: [makeBackendDraft('pending-1', null), makeBackendDraft('submitted-1', { id: 'op-1' })],
        total: 2,
      }),
    );

    const drafts = await draftsService.fetchDrafts('https://backend.test');

    expect(drafts.map(d => [d.id, d.operation])).toEqual([
      ['pending-1', null],
      ['submitted-1', { id: 'op-1' }],
    ]);
  });

  it('rejects a draft that omits operation rather than defaulting it to null', async () => {
    const { operation: _omitted, ...withoutOperation } = makeBackendDraft('legacy-1', null);
    authFetchMock.mockResolvedValue(okResponse({ data: [withoutOperation], total: 1 }));

    await expect(draftsService.fetchDrafts('https://backend.test')).rejects.toThrow();
  });

  it('dedupes a draft returned on two pages when a concurrent insert shifts the offset window', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeBackendDraft(`draft-${i}`, null));
    const page2 = [makeBackendDraft('draft-99', null), makeBackendDraft('draft-100', null)];

    authFetchMock
      .mockResolvedValueOnce(okResponse({ data: page1, total: 101 }))
      .mockResolvedValueOnce(okResponse({ data: page2, total: 101 }));

    const drafts = await draftsService.fetchDrafts('https://backend.test');

    expect(drafts).toHaveLength(101);
    expect(drafts.filter(d => d.id === 'draft-99')).toHaveLength(1);
  });

  it('keeps the copy from the later page when a draft is edited mid-fetch', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeBackendDraft(`draft-${i}`, null));
    const editedOnPage2 = { ...makeBackendDraft('draft-99', null), description: 'Edited mid-fetch' };

    authFetchMock
      .mockResolvedValueOnce(okResponse({ data: page1, total: 101 }))
      .mockResolvedValueOnce(okResponse({ data: [editedOnPage2, makeBackendDraft('draft-100', null)], total: 101 }));

    const drafts = await draftsService.fetchDrafts('https://backend.test');

    expect(drafts.find(d => d.id === 'draft-99')?.description).toBe('Edited mid-fetch');
  });

  it('requests an explicit page size rather than relying on the backend default of 20', async () => {
    authFetchMock.mockResolvedValue(okResponse({ data: [], total: 0 }));

    await draftsService.fetchDrafts('https://backend.test');

    expect(authFetchMock).toHaveBeenCalledTimes(1);
    expect(authFetchMock).toHaveBeenCalledWith('https://backend.test/draft-operations?page=1&pageSize=100', {
      method: 'GET',
    });
  });

  it('pages through every draft when total exceeds one page', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeBackendDraft(`draft-${i}`, null));
    const page2 = [makeBackendDraft('draft-100', null), makeBackendDraft('draft-101', { id: 'op-2' })];

    authFetchMock
      .mockResolvedValueOnce(okResponse({ data: page1, total: 102 }))
      .mockResolvedValueOnce(okResponse({ data: page2, total: 102 }));

    const drafts = await draftsService.fetchDrafts('https://backend.test');

    expect(authFetchMock).toHaveBeenCalledTimes(2);
    expect(authFetchMock).toHaveBeenLastCalledWith('https://backend.test/draft-operations?page=2&pageSize=100', {
      method: 'GET',
    });
    expect(drafts).toHaveLength(102);
    expect(drafts.at(-1)?.operation).toEqual({ id: 'op-2' });
  });
});
