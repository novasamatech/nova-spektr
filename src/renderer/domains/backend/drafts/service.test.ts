import { afterEach, describe, expect, it, vi } from 'vitest';

import { draftsService } from './service';

const ACCOUNT_A = `0x${'01'.repeat(32)}`;
const ACCOUNT_B = `0x${'02'.repeat(32)}`;

const baseDraftResponse = {
  id: 'draft-1',
  multisigAccountId: ACCOUNT_A,
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  callData: '0x0000',
  description: 'note',
  createdBy: 'tester',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  signingPath: [],
  initiatorAccountId: null,
};

type CapturedRequest = { url: string; init: RequestInit };

const stubFetch = (responseBody: object): (() => CapturedRequest) => {
  const captured: { value: CapturedRequest | null } = { value: null };

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      captured.value = { url, init };

      return {
        ok: true,
        status: 200,
        headers: { forEach: () => {} },
        text: async () => JSON.stringify(responseBody),
      };
    }),
  );

  return () => captured.value!;
};

const bodyOf = (request: CapturedRequest): Record<string, unknown> =>
  JSON.parse(request.init.body as string) as Record<string, unknown>;

describe('draftsService finalSignerAccountId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends finalSignerAccountId in the createDraft request body', async () => {
    const getRequest = stubFetch({ ...baseDraftResponse, finalSignerAccountId: ACCOUNT_B });

    await draftsService.createDraft('http://backend', {
      chainId: baseDraftResponse.chainId,
      finalSignerAccountId: ACCOUNT_B,
    });

    expect(bodyOf(getRequest()).finalSignerAccountId).toBe(ACCOUNT_B);
  });

  it('parses finalSignerAccountId from the createDraft response', async () => {
    stubFetch({ ...baseDraftResponse, finalSignerAccountId: ACCOUNT_B });

    const draft = await draftsService.createDraft('http://backend', { chainId: baseDraftResponse.chainId });

    expect(draft.finalSignerAccountId).toBe(ACCOUNT_B);
  });

  it('sends an explicit null finalSignerAccountId in updateDraft to clear it', async () => {
    const getRequest = stubFetch({ ...baseDraftResponse, finalSignerAccountId: null });

    await draftsService.updateDraft('http://backend', 'draft-1', { finalSignerAccountId: null });

    const body = bodyOf(getRequest());
    expect('finalSignerAccountId' in body).toBe(true);
    expect(body.finalSignerAccountId).toBeNull();
  });

  it('defaults finalSignerAccountId to null when the response omits it', async () => {
    stubFetch(baseDraftResponse);

    const draft = await draftsService.createDraft('http://backend', { chainId: baseDraftResponse.chainId });

    expect(draft.finalSignerAccountId).toBeNull();
  });
});
