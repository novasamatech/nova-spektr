import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { authFetch } from '@/shared/api/backend-fetch';

import { operationsService } from './service';

// vi.mock is hoisted above the imports by vitest, so authFetch resolves to the mock below.
// parseResponse stays real — the paginated-envelope parsing is part of what's under test.
vi.mock('@/shared/api/backend-fetch', async () => ({
  ...(await vi.importActual('@/shared/api/backend-fetch')),
  authFetch: vi.fn(),
}));

const authFetchMock = authFetch as unknown as Mock;

const URL = 'https://address-book.test';

function ok(body: unknown, status = 200) {
  return { ok: true, status, headers: {}, body: JSON.stringify(body) };
}

function makeOperation(index: number, draftId: string | null = null) {
  return { id: `op-${index}`, description: `description ${index}`, draftId };
}

describe('domains/backend/operations/service — fetchAllDescriptions', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
  });

  it('parses the paginated { data, total } response from GET /operations', async () => {
    const operations = [makeOperation(1, 'draft-1'), makeOperation(2)];
    authFetchMock.mockResolvedValueOnce(ok({ data: operations, total: operations.length }));

    const result = await operationsService.fetchAllDescriptions(URL);

    expect(result).toEqual(operations);
  });

  it('walks every page until total is reached', async () => {
    const pageOne = Array.from({ length: 100 }, (_, i) => makeOperation(i));
    const pageTwo = Array.from({ length: 50 }, (_, i) => makeOperation(100 + i, `draft-${i}`));

    authFetchMock
      .mockResolvedValueOnce(ok({ data: pageOne, total: 150 }))
      .mockResolvedValueOnce(ok({ data: pageTwo, total: 150 }));

    const result = await operationsService.fetchAllDescriptions(URL);

    expect(result).toHaveLength(150);
    expect(result.at(-1)).toEqual(makeOperation(149, 'draft-49'));

    const requestedUrls = authFetchMock.mock.calls.map(([url]) => url);
    expect(requestedUrls).toHaveLength(2);
    expect(requestedUrls[0]).toContain('page=1');
    expect(requestedUrls[1]).toContain('page=2');
  });

  it('skips items that do not match the operation schema', async () => {
    authFetchMock.mockResolvedValueOnce(ok({ data: [makeOperation(1), { unexpected: true }], total: 2 }));

    const result = await operationsService.fetchAllDescriptions(URL);

    expect(result).toEqual([makeOperation(1)]);
  });

  it('throws on a non-ok response', async () => {
    authFetchMock.mockResolvedValueOnce({ ok: false, status: 500, headers: {}, body: '{}' });

    await expect(operationsService.fetchAllDescriptions(URL)).rejects.toThrow('500');
  });
});
